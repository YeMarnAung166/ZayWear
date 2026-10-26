<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\TelegramSession;
use App\Models\Township;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * Conversational ordering for Telegram, including prepaid payment receipts.
 *
 * State lives in telegram_sessions (one row per chat) so a webhook retry or a
 * bot restart never loses a half-finished order.
 */
class TelegramBot
{
    private const SESSION_HOURS = 2;

    private const STEP_PROOF = 'proof';

    private const STEP_PAY_VERIFY = 'pay_verify';

    private const STEP_PAY_PROOF = 'pay_proof';

    private const MAX_PROOF_BYTES = 5 * 1024 * 1024;

    /**
     * @var array<string, string>
     */
    private const STATUS_LABELS = [
        Order::STATUS_PENDING => 'စောင့်ဆိုင်းနေသည်',
        Order::STATUS_CONFIRMED => 'အတည်ပြုပြီး',
        Order::STATUS_PACKED => 'ထုပ်ပိုးပြီး',
        Order::STATUS_SHIPPED => 'ပို့ဆောင်နေသည်',
        Order::STATUS_DELIVERED => 'ပို့ဆောင်ပြီး',
        Order::STATUS_CANCELLED => 'ပယ်ဖျက်ပြီး',
        Order::STATUS_REFUSED => 'လက်မခံဘူး',
        Order::STATUS_RETURNED => 'ပြန်ပို့ပြီး',
    ];

    public function __construct(
        private readonly TelegramClient $client,
        private readonly OrderCreator $orders,
        private readonly OrderPricing $pricing,
        private readonly OrderStateMachine $stateMachine,
        private readonly TrackingToken $tokens,
        private readonly CustomerAuth $auth,
        private readonly PaymentMethods $paymentMethods,
        private readonly PaymentVerification $paymentVerification,
        private readonly PaymentProofStorage $proofStorage,
    ) {}

    /**
     * @param  array<string, mixed>  $update
     */
    public function handle(array $update): void
    {
        try {
            if (isset($update['callback_query'])) {
                $this->handleCallback($update['callback_query']);
            } elseif (isset($update['message'])) {
                $this->handleMessage($update['message']);
            }
        } catch (Throwable $exception) {
            Log::error('telegram.handler.failed', ['message' => $exception->getMessage()]);
        }
    }

    /**
     * @param  array<string, mixed>  $callback
     */
    private function handleCallback(array $callback): void
    {
        $callbackId = (string) ($callback['id'] ?? '');
        $chatId = (int) ($callback['message']['chat']['id'] ?? 0);
        $messageId = (int) ($callback['message']['message_id'] ?? 0);
        $data = (string) ($callback['data'] ?? '');

        if ($chatId === 0) {
            return;
        }

        if (str_starts_with($data, 'adm:')) {
            $this->handleAdminCallback(
                $callbackId,
                $chatId,
                $messageId,
                $data,
                (string) ($callback['message']['text'] ?? ''),
            );

            return;
        }

        if ($callbackId !== '') {
            $this->client->answerCallbackQuery($callbackId);
        }

        $session = $this->session($chatId);
        $state = $session->state ?? ['step' => 'idle'];
        [$action, $value] = array_pad(explode(':', $data, 2), 2, '');

        if ($messageId > 0) {
            $this->client->clearKeyboard($chatId, $messageId);
        }

        try {
            match ($action) {
                'p' => $this->selectProduct($session, (int) $value),
                'v' => $this->selectVariant($session, (int) $value),
                'q' => $this->selectQuantity($session, $state, (int) $value),
                't' => $this->selectTownship($session, (int) $value),
                'pm' => $this->selectPayment($session, $state, $value),
                'back' => $this->sendProducts($chatId),
                'ok' => $this->placeOrder($session, $state),
                'cancel' => $this->cancel($session),
                default => $this->sendProducts($chatId),
            };
        } catch (ValidationException $exception) {
            $this->client->sendMessage($chatId, $this->firstError($exception));
        }
    }

    /**
     * Confirm / cancel straight from the admin alert. Only the configured
     * admin chat may act; everyone else is rejected without touching the order.
     */
    private function handleAdminCallback(
        string $callbackId,
        int $chatId,
        int $messageId,
        string $data,
        string $originalText,
    ): void {
        $adminChatId = (string) config('shop.telegram_admin_chat_id');

        $answer = function (string $text) use ($callbackId): void {
            if ($callbackId !== '') {
                $this->client->answerCallbackQuery($callbackId, $text);
            }
        };

        if ($adminChatId === '' || (string) $chatId !== $adminChatId) {
            $answer('Not allowed.');

            return;
        }

        [, $action, $id] = array_pad(explode(':', $data, 3), 3, '');
        $order = Order::query()->find((int) $id);

        if (! $order) {
            $answer('Order not found.');

            return;
        }

        try {
            match ($action) {
                'confirm' => $this->stateMachine->transition($order, Order::STATUS_CONFIRMED, 'admin'),
                'cancel' => $this->stateMachine->transition($order, Order::STATUS_CANCELLED, 'admin', 'Cancelled from Telegram'),
                'paid' => $this->paymentVerification->markPaid(
                    $order,
                    null,
                    'Marked paid from Telegram',
                    null,
                    'telegram:admin',
                ),
                default => throw ValidationException::withMessages(['action' => ['Unknown action.']]),
            };
        } catch (ValidationException $exception) {
            $answer($this->firstError($exception));

            return;
        }

        $order->refresh();

        $answer("{$order->order_number}: {$order->status} · {$order->payment_status}");

        if ($messageId > 0) {
            $this->client->editMessageText(
                $chatId,
                $messageId,
                ($originalText !== '' ? $originalText : "Order {$order->order_number}")
                ."\n\n→ {$order->status} · {$order->payment_status}",
                ['inline_keyboard' => []],
            );
        }
    }

    /**
     * @param  array<string, mixed>  $message
     */
    private function handleMessage(array $message): void
    {
        $chatId = (int) ($message['chat']['id'] ?? 0);

        if ($chatId === 0) {
            return;
        }

        // Contact messages carry no text, so they must be handled before the
        // empty-text guard below.
        if (isset($message['contact']) && is_array($message['contact'])) {
            $this->handleContact($chatId, $message['contact'], (int) ($message['from']['id'] ?? 0));

            return;
        }

        if (isset($message['photo']) || isset($message['document'])) {
            $this->handleProofUpload($chatId, $message);

            return;
        }

        $text = trim((string) ($message['text'] ?? ''));

        if ($text === '') {
            return;
        }

        Log::info('telegram.message', ['chat_id' => $chatId, 'text' => $text]);

        if (str_starts_with($text, '/')) {
            $this->handleCommand($chatId, $text);

            return;
        }

        $session = $this->session($chatId);
        $state = $session->state ?? ['step' => 'idle'];

        try {
            match ($state['step'] ?? 'idle') {
                'qty' => $this->saveQuantity($session, $state, $text),
                'name' => $this->saveName($session, $state, $text),
                'phone' => $this->savePhone($session, $state, $text),
                'township' => $this->searchTownship($chatId, $text),
                'address' => $this->saveAddress($session, $state, $text),
                'landmark' => $this->saveLandmark($session, $state, $text),
                self::STEP_PAY_VERIFY => $this->verifyPayPhone($session, $state, $text),
                self::STEP_PROOF, self::STEP_PAY_PROOF => $this->client->sendMessage(
                    $chatId,
                    'ပြေစာ ဓာတ်ပုံ သို့မဟုတ် PDF ကို ပို့ပါ။',
                ),
                default => $this->client->sendMessage(
                    $chatId,
                    "အော်ဒါ အသစ် စတင်ရန် /start ကို နှိပ်ပါ။\nအကူအညီ — /help",
                ),
            };
        } catch (ValidationException $exception) {
            $this->client->sendMessage($chatId, $this->firstError($exception));
        }
    }

    private function handleCommand(int $chatId, string $text): void
    {
        [$command, $argument] = array_pad(preg_split('/\s+/', $text, 2) ?: [], 2, '');
        $command = strtolower((string) $command);

        match ($command) {
            '/start' => $this->start($chatId, (string) $argument),
            '/order', '/shop' => $this->sendProducts($chatId),
            '/contact' => $this->contact($chatId),
            '/cancel' => $this->cancel($this->session($chatId)),
            '/pay' => $this->startPayment($chatId, strtoupper(trim((string) $argument))),
            '/status' => $this->status($chatId, (string) $argument),
            '/id' => $this->client->sendMessage($chatId, "Chat ID: {$chatId}"),
            default => $this->client->sendMessage($chatId, $this->helpText()),
        };
    }

    private function start(int $chatId, string $argument): void
    {
        if (preg_match('/^login_([a-f0-9]{32})$/', $argument, $matches)) {
            $this->handleLoginStart($chatId, $matches[1]);

            return;
        }

        if (preg_match('/^pay_(ZW-\d{6})$/', $argument, $matches)) {
            $this->startPayment($chatId, $matches[1]);

            return;
        }

        if (preg_match('/^product_(\d+)(?:_size_([A-Za-z0-9]+))?$/', $argument, $matches)) {
            $productId = (int) $matches[1];
            $size = $matches[2] ?? null;

            if ($size !== null) {
                $variant = ProductVariant::query()
                    ->where('product_id', $productId)
                    ->where('size', $size)
                    ->where('is_active', true)
                    ->where('stock_qty', '>', 0)
                    ->orderBy('id')
                    ->first();

                if ($variant) {
                    $this->selectVariant($this->session($chatId), $variant->id);

                    return;
                }
            }

            $this->selectProduct($this->session($chatId), $productId);

            return;
        }

        $methods = collect($this->paymentMethods->available())
            ->map(fn (string $method): string => $this->paymentMethods->label($method)['mm'])
            ->implode(' / ');

        $this->client->sendMessage(
            $chatId,
            "မင်္ဂလာပါ! ZayWear မှ ကြိုဆိုပါတယ်။\n\n"
            .'ငွေပေးချေမှု — '.($methods !== '' ? $methods : 'မရှိသေးပါ')."\n"
            .'အောက်မှ ပစ္စည်း ရွေးပါ။',
        );

        $this->sendProducts($chatId);
    }

    private function handleLoginStart(int $chatId, string $nonce): void
    {
        $session = $this->auth->attachLoginToChat($nonce, $chatId);

        if (! $session) {
            $this->client->sendMessage(
                $chatId,
                "ဝင်ရန် လင့်ခ် သက်တမ်းကုန်သွားပါပြီ။\nဝဘ်ဆိုက်တွင် ပြန်စမ်းပါ။",
            );

            return;
        }

        $customer = Customer::query()->where('telegram_chat_id', (string) $chatId)->first();

        if ($customer) {
            $this->auth->requestOtp($customer);
            $this->auth->markAwaitingOtp($session, $customer);

            $this->client->sendMessage(
                $chatId,
                "ကုဒ် ပို့ပြီးပါပြီ။\nဝဘ်ဆိုက်ရှိ အကောင့်ဝင်ရန် စာမျက်နှာတွင် ကုဒ် ၆ လုံး ရိုက်ထည့်ပါ။",
            );

            return;
        }

        $this->client->sendMessage(
            $chatId,
            "ZayWear အကောင့်သို့ ဝင်ရန် သင့်ဖုန်းနံပါတ်ကို မျှဝေပါ။\n\n"
            .'အောက်မှ ခလုတ်ကို နှိပ်ပါ။',
            [
                'keyboard' => [[['text' => 'ဖုန်းနံပါတ် မျှဝေရန်', 'request_contact' => true]]],
                'resize_keyboard' => true,
                'one_time_keyboard' => true,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $contact
     */
    private function handleContact(int $chatId, array $contact, int $fromId): void
    {
        $contactUserId = isset($contact['user_id']) ? (int) $contact['user_id'] : null;

        // Only the sender's own Telegram contact carries their user id. A
        // forwarded address-book card must never claim someone else's phone.
        if ($contactUserId === null || $contactUserId !== $fromId) {
            $this->client->sendMessage($chatId, 'သင့်ကိုယ်ပိုင် ဖုန်းနံပါတ်ကိုသာ မျှဝေပါ။');

            return;
        }

        $customer = $this->auth->linkChat(
            $chatId,
            (string) ($contact['phone_number'] ?? ''),
            (string) ($contact['first_name'] ?? ''),
        );

        if (! $customer) {
            $this->client->sendMessage($chatId, 'ဖုန်းနံပါတ် မမှန်ပါ။ ထပ်စမ်းပါ။');

            return;
        }

        $session = $this->auth->pendingLoginForChat($chatId);

        if ($session) {
            $this->auth->confirmLogin($session, $customer);
        }

        $this->client->removeKeyboard(
            $chatId,
            "ဖုန်းနံပါတ် ချိတ်ဆက်ပြီးပါပြီ။\nဝဘ်ဆိုက်သို့ ပြန်သွားပါ။",
        );
    }

    private function sendProducts(int $chatId): void
    {
        $products = Product::query()
            ->active()
            ->orderByDesc('is_featured')
            ->orderBy('id')
            ->limit(10)
            ->get();

        if ($products->isEmpty()) {
            $this->client->sendMessage($chatId, 'ပစ္စည်း မရှိသေးပါ။ ခဏနေမှ ပြန်ကြည့်ပါ။');

            return;
        }

        $rows = $products->map(fn (Product $product): array => [[
            'text' => $product->name_mm.' · '.number_format($product->base_price_mmk).' MMK',
            'callback_data' => 'p:'.$product->id,
        ]])->values()->all();

        $this->client->sendMessage($chatId, 'ပစ္စည်း ရွေးပါ။', ['inline_keyboard' => $rows]);
    }

    private function contact(int $chatId): void
    {
        $support = (string) Setting::get('support_telegram', '');
        $frontend = rtrim((string) config('shop.frontend_url'), '/');

        $lines = ['ဆက်သွယ်ရန်', ''];

        if ($support !== '') {
            $lines[] = "Telegram — {$support}";
        }

        $lines[] = "ဝဘ်ဆိုက် — {$frontend}/contact";
        $lines[] = '';
        $lines[] = 'အော်ဒါ အခြေအနေ — /status ZW-000123 4567';

        $this->client->sendMessage($chatId, implode("\n", $lines));
    }

    private function selectProduct(TelegramSession $session, int $productId): void
    {
        $product = Product::query()->active()->with('inStockVariants')->find($productId);

        if (! $product) {
            $this->client->sendMessage($session->chat_id, 'ဒီပစ္စည်း မရှိတော့ပါ။');

            return;
        }

        $variants = $product->inStockVariants;

        if ($variants->isEmpty()) {
            $this->client->sendMessage($session->chat_id, 'ဒီပစ္စည်း stock ကုန်နေပါပြီ။');

            return;
        }

        $this->save($session, ['step' => 'size', 'product_id' => $product->id]);

        $rows = $variants->map(fn (ProductVariant $variant): array => [[
            'text' => $variant->size.' · '.$variant->color.' · '.number_format($this->pricing->unitPrice($variant)).' MMK',
            'callback_data' => 'v:'.$variant->id,
        ]])->values()->all();

        $rows[] = [['text' => '⬅️ ပစ္စည်းများ', 'callback_data' => 'back:products']];

        $this->client->sendMessage(
            $session->chat_id,
            "{$product->name_mm}\nအရွယ်အစား ရွေးပါ။",
            ['inline_keyboard' => $rows],
        );
    }

    private function selectVariant(TelegramSession $session, int $variantId): void
    {
        $variant = ProductVariant::query()->with('product')->find($variantId);

        if (! $variant || ! $variant->is_active || $variant->stock_qty < 1) {
            $this->client->sendMessage($session->chat_id, 'ဒီအရွယ်အစား stock ကုန်နေပါပြီ။');

            return;
        }

        $this->save($session, [
            'step' => 'qty',
            'product_id' => $variant->product_id,
            'variant_id' => $variant->id,
            'qty' => 1,
        ]);

        $this->sendQuantityPrompt($session->chat_id, $variant);
    }

    private function sendQuantityPrompt(int $chatId, ProductVariant $variant): void
    {
        $max = min($variant->stock_qty, 20);
        $buttons = [];

        foreach (range(1, min($max, 5)) as $quantity) {
            $buttons[] = ['text' => (string) $quantity, 'callback_data' => 'q:'.$quantity];
        }

        $note = $max > 5 ? "\n5 ထက်ပို လိုပါက နံပါတ် ရိုက်ပါ။" : '';

        $this->client->sendMessage(
            $chatId,
            "{$variant->product->name_mm} ({$variant->size} · {$variant->color})\n"
            ."လက်ကျန် — {$variant->stock_qty}\n\n"
            .'အရေအတွက် ရွေးပါ။'.$note,
            ['inline_keyboard' => [$buttons]],
        );
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function selectQuantity(TelegramSession $session, array $state, int $quantity): void
    {
        $this->applyQuantity($session, $state, $quantity);
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function saveQuantity(TelegramSession $session, array $state, string $text): void
    {
        if (! preg_match('/^\d+$/', trim($text))) {
            throw ValidationException::withMessages([
                'qty' => 'အရေအတွက်ကို ဂဏန်းဖြင့် ရိုက်ပါ။',
            ]);
        }

        $this->applyQuantity($session, $state, (int) trim($text));
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function applyQuantity(TelegramSession $session, array $state, int $quantity): void
    {
        $variant = ProductVariant::query()->with('product')->find($state['variant_id'] ?? 0);

        if (! $variant) {
            throw ValidationException::withMessages([
                'qty' => 'အရွယ်အစား ရွေးချယ်မှု မတွေ့ပါ။ /start ဖြင့် ပြန်စပါ။',
            ]);
        }

        $max = min($variant->stock_qty, 20);

        if ($quantity < 1 || $quantity > $max) {
            throw ValidationException::withMessages([
                'qty' => "အရေအတွက် ၁ မှ {$max} အတွင်း ရွေးပါ။",
            ]);
        }

        $state['qty'] = $quantity;
        $state['step'] = 'name';
        $this->save($session, $state);

        $this->client->sendMessage(
            $session->chat_id,
            "အရေအတွက် — {$quantity}\n\nအမည် အပြည့်အစုံ ရိုက်ပါ။",
        );
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function saveName(TelegramSession $session, array $state, string $text): void
    {
        if (mb_strlen($text) < 2 || mb_strlen($text) > 120) {
            throw ValidationException::withMessages([
                'name' => 'အမည်ကို ၂ လုံးမှ ၁၂၀ လုံးအတွင်း ရိုက်ပါ။',
            ]);
        }

        $state['name'] = $text;
        $state['step'] = 'phone';
        $this->save($session, $state);

        $this->client->sendMessage(
            $session->chat_id,
            'ဖုန်းနံပါတ် ရိုက်ပါ။ ဥပမာ — 09771234567',
        );
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function savePhone(TelegramSession $session, array $state, string $text): void
    {
        $digits = preg_replace('/\D+/', '', $text) ?? '';

        if (str_starts_with($digits, '959')) {
            $digits = '09'.substr($digits, 3);
        }

        if (! preg_match('/^09[0-9]{7,9}$/', $digits)) {
            throw ValidationException::withMessages([
                'phone' => 'ဖုန်းနံပါတ် မမှန်ပါ။ 09 ဖြင့် စပြီး ဂဏန်း ၉–၁၁ လုံး ရိုက်ပါ။',
            ]);
        }

        $state['phone'] = $digits;
        $state['step'] = 'township';
        $this->save($session, $state);

        $this->sendTownships($session->chat_id);
    }

    private function sendTownships(int $chatId): void
    {
        $townships = Township::query()
            ->active()
            ->orderByRaw(
                "case region when 'Yangon' then 1 when 'Mandalay' then 2 when 'Naypyidaw' then 3 else 4 end",
            )
            ->orderBy('region')
            ->orderBy('name_en')
            ->get();

        if ($townships->isEmpty()) {
            $this->client->sendMessage($chatId, 'မြို့နယ် စာရင်း မရှိသေးပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။');

            return;
        }

        $rows = $townships
            ->chunk(2)
            ->map(fn ($chunk): array => $chunk->map(fn (Township $township): array => [
                'text' => $township->name_mm.' · '.number_format($township->delivery_fee_mmk),
                'callback_data' => 't:'.$township->id,
            ])->values()->all())
            ->values()
            ->all();

        $this->client->sendMessage(
            $chatId,
            "ပို့ဆောင်ရမည့် မြို့နယ် ရွေးပါ။\nမတွေ့ပါက မြို့နယ်အမည် ရိုက်ပါ။",
            ['inline_keyboard' => $rows],
        );
    }

    private function searchTownship(int $chatId, string $text): void
    {
        $matches = Township::query()
            ->active()
            ->where(function ($query) use ($text): void {
                $query->where('name_mm', 'like', "%{$text}%")
                    ->orWhere('name_en', 'like', "%{$text}%");
            })
            ->orderBy('name_en')
            ->limit(8)
            ->get();

        if ($matches->isEmpty()) {
            $this->client->sendMessage($chatId, 'မြို့နယ် မတွေ့ပါ။ အောက်မှ ထပ်ရွေးပါ။');
            $this->sendTownships($chatId);

            return;
        }

        $rows = $matches->map(fn (Township $township): array => [[
            'text' => $township->name_mm.' · '.number_format($township->delivery_fee_mmk),
            'callback_data' => 't:'.$township->id,
        ]])->values()->all();

        $this->client->sendMessage($chatId, 'ရွေးချယ်ပါ။', ['inline_keyboard' => $rows]);
    }

    private function selectTownship(TelegramSession $session, int $townshipId): void
    {
        $township = Township::query()->active()->find($townshipId);

        if (! $township) {
            $this->client->sendMessage($session->chat_id, 'ဒီမြို့နယ်ကို မပို့ဆောင်နိုင်ပါ။');

            return;
        }

        $state = $session->state ?? ['step' => 'idle'];
        $state['township_id'] = $township->id;
        $state['step'] = 'address';
        $this->save($session, $state);

        $this->client->sendMessage(
            $session->chat_id,
            "{$township->name_mm} — ပို့ဆောင်ခ ".number_format($township->delivery_fee_mmk)." MMK\n\n"
            .'လိပ်စာ အပြည့်အစုံ ရိုက်ပါ (အမှတ်၊ လမ်း၊ ရပ်ကွက်)။',
        );
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function saveAddress(TelegramSession $session, array $state, string $text): void
    {
        if (mb_strlen($text) < 5 || mb_strlen($text) > 500) {
            throw ValidationException::withMessages([
                'address_line' => 'လိပ်စာကို ၅ လုံးမှ ၅၀၀ လုံးအတွင်း ရိုက်ပါ။',
            ]);
        }

        $state['address'] = $text;
        $state['step'] = 'landmark';
        $this->save($session, $state);

        $this->client->sendMessage(
            $session->chat_id,
            'ကုရီယာ ရှာလွယ်စေရန် မှတ်တိုင် (ဘုန်းကြီးကျောင်း၊ ဈေး၊ စာသင်ကျောင်း) ရိုက်ပါ။',
        );
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function saveLandmark(TelegramSession $session, array $state, string $text): void
    {
        if (mb_strlen($text) < 5 || mb_strlen($text) > 255) {
            throw ValidationException::withMessages([
                'landmark' => 'မှတ်တိုင်ကို ၅ လုံးမှ ၂၅၅ လုံးအတွင်း ရိုက်ပါ။',
            ]);
        }

        $state['landmark'] = $text;
        $state['step'] = 'payment';
        $this->save($session, $state);

        $this->sendPaymentOptions($session);
    }

    private function sendPaymentOptions(TelegramSession $session): void
    {
        $buttons = [];

        if ($this->paymentMethods->availableMethod(PaymentMethods::COD)) {
            $buttons[] = ['text' => '💵 လက်ခံပြီး ပေးချေ (COD)', 'callback_data' => 'pm:cod'];
        }

        if ($this->paymentMethods->availableMethod(PaymentMethods::KBZPAY)) {
            $buttons[] = ['text' => '📱 KBZPay — ကြိုတင်ငွေချေ', 'callback_data' => 'pm:kbzpay'];
        }

        if ($this->paymentMethods->availableMethod(PaymentMethods::WAVE)) {
            $buttons[] = ['text' => '🌊 Wave Money — ကြိုတင်ငွေချေ', 'callback_data' => 'pm:wave'];
        }

        if ($buttons === []) {
            $this->client->sendMessage(
                $session->chat_id,
                'ငွေပေးချေမှု နည်းလမ်း မရှိသေးပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။',
            );

            return;
        }

        $rows = array_map(fn (array $button): array => [$button], $buttons);

        $this->client->sendMessage(
            $session->chat_id,
            'ငွေပေးချေမှု နည်းလမ်း ရွေးပါ။',
            ['inline_keyboard' => $rows],
        );
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function selectPayment(TelegramSession $session, array $state, string $method): void
    {
        if (($state['step'] ?? '') !== 'payment'
            || ! in_array($method, $this->paymentMethods->available(), true)) {
            throw ValidationException::withMessages([
                'payment_method' => 'ဒီငွေပေးချေမှု နည်းလမ်းကို မရနိုင်တော့ပါ။ ပြန်ရွေးပါ။',
            ]);
        }

        $state['payment_method'] = $method;
        $state['step'] = 'confirm';
        $this->save($session, $state);

        $this->sendSummary($session, $state);
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function sendSummary(TelegramSession $session, array $state): void
    {
        $variant = ProductVariant::query()->with('product')->find($state['variant_id'] ?? 0);
        $township = Township::query()->find($state['township_id'] ?? 0);
        $quantity = (int) ($state['qty'] ?? 1);
        $paymentMethod = $this->paymentMethods->label((string) ($state['payment_method'] ?? 'cod'))['mm'];

        if (! $variant || ! $township) {
            $this->client->sendMessage($session->chat_id, 'အချက်အလက် ပျောက်နေပါသည်။ /start ဖြင့် ပြန်စပါ။');

            return;
        }

        $quote = $this->pricing->quote([['variant' => $variant, 'qty' => $quantity]], $township);

        $lines = [
            'အော်ဒါ အတည်ပြုပါ',
            '',
            'ပစ္စည်း — '.$variant->product->name_mm." ({$variant->size} · {$variant->color})",
            "အရေအတွက် — {$quantity}",
            'ဈေးနှုန်း — '.number_format($quote['subtotal_mmk']).' MMK',
            'ပို့ဆောင်ခ — '.($quote['delivery_fee_mmk'] === 0 ? 'အခမဲ့' : number_format($quote['delivery_fee_mmk']).' MMK'),
            'စုစုပေါင်း — '.number_format($quote['total_mmk'])." MMK ({$paymentMethod})",
            '',
            'ငွေပေးချေမှု — '.$paymentMethod,
            'အမည် — '.$state['name'],
            'ဖုန်း — '.$state['phone'],
            'မြို့နယ် — '.$township->name_mm,
            'လိပ်စာ — '.$state['address'],
            'မှတ်တိုင် — '.$state['landmark'],
        ];

        $this->client->sendMessage(
            $session->chat_id,
            implode("\n", $lines),
            ['inline_keyboard' => [[
                ['text' => '✅ အတည်ပြု', 'callback_data' => 'ok'],
                ['text' => '❌ ပယ်ဖျက်', 'callback_data' => 'cancel'],
            ]]],
        );
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function placeOrder(TelegramSession $session, array $state): void
    {
        if (($state['step'] ?? '') !== 'confirm') {
            $this->client->sendMessage(
                $session->chat_id,
                'အော်ဒါ အတည်ပြုချိန် ကုန်ဆုံးသွားပါပြီ။ /start ဖြင့် ပြန်စပါ။',
            );

            return;
        }

        // Guard against a double tap: the second callback sees "creating".
        $state['step'] = 'creating';
        $this->save($session, $state);

        $quantity = max(1, (int) ($state['qty'] ?? 1));

        try {
            $order = $this->orders->create([
                'customer' => [
                    'name' => (string) $state['name'],
                    'phone' => (string) $state['phone'],
                ],
                'township_id' => (int) $state['township_id'],
                'address_line' => (string) $state['address'],
                'landmark' => (string) $state['landmark'],
                'payment_method' => (string) ($state['payment_method'] ?? 'cod'),
                'items' => [
                    ['variant_id' => (int) $state['variant_id'], 'qty' => $quantity],
                ],
            ], 'tg-'.$session->chat_id.'-'.$session->id.'-'.Carbon::now()->timestamp, 'telegram');
        } catch (ValidationException $exception) {
            $state['step'] = 'confirm';
            $this->save($session, $state);

            $this->client->sendMessage($session->chat_id, $this->firstError($exception));

            return;
        }

        $trackingUrl = $this->trackingUrl($order);

        if ($this->paymentMethods->isPrepaid($order->payment_method)) {
            $this->save($session, [
                'step' => self::STEP_PROOF,
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ]);

            $this->sendPaymentInstructions($session->chat_id, $order, $trackingUrl);
        } else {
            $this->save($session, ['step' => 'idle']);

            $this->client->sendMessage(
                $session->chat_id,
                "အော်ဒါ ရရှိပါပြီ ✅\n\n"
                ."အော်ဒါနံပါတ် — {$order->order_number}\n"
                .'စုစုပေါင်း — '.number_format($order->total_mmk).' MMK ('.$this->paymentMethods->label($order->payment_method)['mm'].")\n"
                ."ပို့ဆောင်ချိန် — ၁ မှ ၃ ရက်\n\n"
                .'အခြေအနေ ကြည့်ရန် — '.$trackingUrl."\n\n"
                .'ဖုန်းဖြင့် ဆက်သွယ်ပါမည်။ ကျေးဇူးတင်ပါတယ်။',
            );
        }

        $this->notifyAdmin($order);
    }

    public function notifyAdmin(Order $order): void
    {
        $adminChatId = (string) config('shop.telegram_admin_chat_id');

        if ($adminChatId === '') {
            return;
        }

        $order->loadMissing(['customer', 'township', 'items']);

        $items = $order->items
            ->map(fn ($item): string => "• {$item->product_name_mm} ({$item->size} · {$item->color}) × {$item->qty}")
            ->implode("\n");

        $method = $this->paymentMethods->label($order->payment_method)['mm'];
        $paymentLine = 'စုစုပေါင်း — '.number_format($order->total_mmk)." MMK ({$method})";

        if ($this->paymentMethods->isPrepaid($order->payment_method)) {
            $paymentLine .= "\n".'ငွေပေးချေမှု — '.($order->payment_status === Order::PAYMENT_PAID ? 'ရရှိပြီး' : 'မရရှိသေးပါ');
        }

        $keyboard = [
            [
                ['text' => '✅ အတည်ပြု', 'callback_data' => 'adm:confirm:'.$order->id],
                ['text' => '❌ ပယ်ဖျက်', 'callback_data' => 'adm:cancel:'.$order->id],
            ],
        ];

        if ($this->paymentMethods->isPrepaid($order->payment_method)
            && $order->payment_status !== Order::PAYMENT_PAID) {
            $keyboard[] = [['text' => '💰 ငွေလက်ခံပြီး', 'callback_data' => 'adm:paid:'.$order->id]];
        }

        $keyboard[] = [['text' => '📄 အော်ဒါ ကြည့်ရန်', 'url' => $this->adminOrderUrl($order)]];

        $this->client->sendMessage(
            $adminChatId,
            "🛒 အော်ဒါအသစ် {$order->order_number}\n\n"
            ."{$order->customer?->name} — {$order->customer?->phone}\n"
            ."{$order->township?->name_mm}\n"
            ."{$order->address_line}\n"
            ."မှတ်တိုင် — {$order->landmark}\n\n"
            ."{$items}\n\n"
            .$paymentLine,
            ['inline_keyboard' => $keyboard],
        );
    }

    /**
     * Deep link from the storefront: /start pay_ZW-000123. The order number is
     * not a secret, so the phone's last four digits gate the payment details.
     */
    private function startPayment(int $chatId, string $orderNumber): void
    {
        if ($orderNumber === '') {
            $this->client->sendMessage(
                $chatId,
                "ငွေပေးချေရန် အော်ဒါနံပါတ် ထည့်ပါ။\nဥပမာ — /pay ZW-000123",
            );

            return;
        }

        $order = Order::query()
            ->with('customer')
            ->where('order_number', $orderNumber)
            ->first();

        if (! $order || ! $order->customer || ! $this->paymentMethods->isPrepaid($order->payment_method)) {
            $this->client->sendMessage($chatId, 'ဒီအော်ဒါအတွက် ကြိုတင်ငွေချေရန် မလိုအပ်ပါ။');

            return;
        }

        if ($order->payment_status === Order::PAYMENT_PAID) {
            $this->client->sendMessage($chatId, 'ဒီအော်ဒါကို ငွေပေးချေပြီးပါပြီ။');

            return;
        }

        if (in_array($order->status, $this->closedStatuses(), true)) {
            $this->client->sendMessage($chatId, 'ဒီအော်ဒါကို ပိတ်ထားပါသည်။');

            return;
        }

        $session = $this->session($chatId);
        $this->save($session, [
            'step' => self::STEP_PAY_VERIFY,
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'attempts' => 0,
        ]);

        $this->client->sendMessage(
            $chatId,
            "{$order->order_number} — ငွေပေးချေမှု\n\n"
            .'အော်ဒါကို စစ်ဆေးရန် ဖုန်းနံပါတ် နောက်ဆုံး ၄ လုံး ထည့်ပါ။',
        );
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function verifyPayPhone(TelegramSession $session, array $state, string $text): void
    {
        $digits = preg_replace('/\D+/', '', $text) ?? '';
        $order = Order::query()->with('customer')->find((int) ($state['order_id'] ?? 0));

        if (! $order || ! $order->customer) {
            $this->save($session, ['step' => 'idle']);
            $this->client->sendMessage($session->chat_id, 'အော်ဒါ မတွေ့ပါ။ ပြန်စပါ။');

            return;
        }

        if (strlen($digits) === 4 && str_ends_with((string) $order->customer->phone, $digits)) {
            $state['step'] = self::STEP_PAY_PROOF;
            $state['attempts'] = 0;
            $this->save($session, $state);

            $this->sendPaymentInstructions($session->chat_id, $order, $this->trackingUrl($order));

            return;
        }

        $attempts = (int) ($state['attempts'] ?? 0) + 1;

        if ($attempts >= 3) {
            $this->save($session, ['step' => 'idle']);
            $this->client->sendMessage(
                $session->chat_id,
                "ဖုန်းနံပါတ် မမှန်ပါ။\nငွေပေးချေမှု ပြန်စရန် /pay {$order->order_number} ကို နှိပ်ပါ။",
            );

            return;
        }

        $state['attempts'] = $attempts;
        $this->save($session, $state);

        $this->client->sendMessage(
            $session->chat_id,
            'ဖုန်းနံပါတ် မမှန်ပါ။ နောက်ဆုံး ၄ လုံး ထည့်ပါ။',
        );
    }

    private function sendPaymentInstructions(int $chatId, Order $order, string $trackingUrl): void
    {
        $account = $this->paymentMethods->accountForOrder($order);
        $method = $this->paymentMethods->label($order->payment_method)['mm'];

        if ($account === null) {
            $this->client->sendMessage(
                $chatId,
                "ငွေပေးချေမှု အချက်အလက် မရနိုင်သေးပါ။\n"
                ."အော်ဒါနံပါတ် — {$order->order_number}\n\n"
                .'အကူအညီ — /contact',
            );

            return;
        }

        $this->client->sendMessage(
            $chatId,
            "ကြိုတင်ငွေချေ လိုအပ်ပါသည် 💳\n\n"
            ."အော်ဒါနံပါတ် — {$order->order_number}\n"
            .'ကျသင့်ငွေ — '.number_format($order->total_mmk)." MMK\n\n"
            ."{$method}\n"
            ."အကောင့်နာမည် — {$account['account_name']}\n"
            ."ဖုန်းနံပါတ် — {$account['phone']}\n"
            ."မှတ်ချက် — အော်ဒါနံပါတ် {$order->order_number} ကို ရေးပါ။\n\n"
            ."ငွေလွှဲပြီးပါက ပြေစာ (ဓာတ်ပုံ သို့မဟုတ် PDF) ကို ဒီ chat ထဲ ပို့ပါ။\n\n"
            .'အော်ဒါအခြေအနေ — '.$trackingUrl,
        );
    }

    /**
     * @param  array<string, mixed>  $message
     */
    private function handleProofUpload(int $chatId, array $message): void
    {
        $session = $this->session($chatId);
        $state = $session->state ?? ['step' => 'idle'];

        if (! in_array($state['step'] ?? '', [self::STEP_PROOF, self::STEP_PAY_PROOF], true)) {
            $this->client->sendMessage(
                $chatId,
                "ပြေစာ ပို့ရန် အော်ဒါ လင့်ခ်မှ ဝင်ပါ။\nဥပမာ — /pay ZW-000123",
            );

            return;
        }

        $order = Order::query()->find((int) ($state['order_id'] ?? 0));

        if (! $order || ! $this->paymentMethods->isPrepaid($order->payment_method)) {
            $this->save($session, ['step' => 'idle']);
            $this->client->sendMessage($chatId, 'အော်ဒါ မတွေ့ပါ။ ပြန်စပါ။');

            return;
        }

        if ($order->payment_status !== Order::PAYMENT_UNPAID
            || in_array($order->status, $this->closedStatuses(), true)) {
            $this->save($session, ['step' => 'idle']);
            $this->client->sendMessage($chatId, 'ဒီအော်ဒါကို ပြေစာ လက်မခံနိုင်တော့ပါ။');

            return;
        }

        if ($order->paymentProofs()->count() >= 5) {
            $this->client->sendMessage(
                $chatId,
                'ပြေစာ အများဆုံး ၅ ခု ပို့နိုင်ပါသည်။ အကူအညီ — /contact',
            );

            return;
        }

        $file = $this->telegramFile($message);

        if ($file === null) {
            $this->client->sendMessage($chatId, 'ပြေစာ ဓာတ်ပုံ သို့မဟုတ် PDF ကို ပို့ပါ။');

            return;
        }

        if ($file['size'] > self::MAX_PROOF_BYTES) {
            $this->client->sendMessage($chatId, 'ပြေစာ ဖိုင် ၅ MB ထက် မကြီးရပါ။');

            return;
        }

        if (! in_array($file['mime'], ['image/jpeg', 'image/png', 'application/pdf'], true)) {
            $this->client->sendMessage($chatId, 'JPG, PNG သို့မဟုတ် PDF ဖိုင် ပို့ပါ။');

            return;
        }

        if ($file['file_id'] !== null
            && $order->paymentProofs()->where('telegram_file_id', $file['file_id'])->exists()) {
            $this->client->sendMessage($chatId, 'ဒီပြေစာကို ရရှိပြီးပါပြီ။');

            return;
        }

        try {
            $stored = $this->proofStorage->store(
                $file['contents'],
                $file['mime'],
                $file['extension'],
                $order,
            );
        } catch (RuntimeException $exception) {
            Log::error('payment-proof.telegram.failed', [
                'order' => $order->order_number,
                'message' => $exception->getMessage(),
            ]);

            $this->client->sendMessage(
                $chatId,
                'ပြေစာ သိမ်းဆည်း၍ မရပါ။ ခဏနေမှ ပြန်ကြိုးစားပါ။',
            );

            return;
        }

        $proof = $order->paymentProofs()->create([
            'payment_id' => $order->payments()->latest('id')->first()?->id,
            'source' => PaymentProof::SOURCE_TELEGRAM,
            'disk' => $stored['disk'],
            'path' => $stored['path'],
            'original_name' => $file['name'],
            'mime_type' => $file['mime'],
            'size_bytes' => $file['size'],
            'status' => PaymentProof::STATUS_PENDING,
            'telegram_file_id' => $file['file_id'],
            'telegram_chat_id' => $chatId,
            'telegram_message_id' => (int) ($message['message_id'] ?? 0) ?: null,
        ]);

        $this->client->sendMessage(
            $chatId,
            "ပြေစာ ရရှိပါပြီ ✅\n\n"
            ."အော်ဒါနံပါတ် — {$order->order_number}\n"
            .'ကျသင့်ငွေ — '.number_format($order->total_mmk)." MMK\n\n"
            .'ငွေလွှဲမှုကို စစ်ဆေးပြီး အတည်ပြုပါမည်။',
        );

        $this->notifyAdminProof($order, $proof, $file['file_id'], $file['mime']);
    }

    /**
     * @param  array<string, mixed>  $message
     * @return array{file_id: string|null, contents: string, mime: string, size: int, extension: string, name: string}|null
     */
    private function telegramFile(array $message): ?array
    {
        $document = is_array($message['document'] ?? null) ? $message['document'] : null;
        $photos = is_array($message['photo'] ?? null) ? $message['photo'] : [];

        if ($document !== null) {
            $fileId = (string) ($document['file_id'] ?? '');
            $name = (string) ($document['file_name'] ?? 'receipt');
            $providedMime = (string) ($document['mime_type'] ?? '');
            $size = (int) ($document['file_size'] ?? 0);
        } elseif ($photos !== []) {
            $largest = end($photos);
            $fileId = is_array($largest) ? (string) ($largest['file_id'] ?? '') : '';
            $name = 'receipt.jpg';
            $providedMime = 'image/jpeg';
            $size = is_array($largest) ? (int) ($largest['file_size'] ?? 0) : 0;
        } else {
            return null;
        }

        if ($fileId === '') {
            return null;
        }

        $remote = $this->client->getFile($fileId);

        if ($remote === null || ! isset($remote['file_path'])) {
            return null;
        }

        $contents = $this->client->downloadFile((string) $remote['file_path']);

        if ($contents === null) {
            return null;
        }

        $mime = $this->detectMime($contents, $providedMime);

        if ($mime === null) {
            return null;
        }

        return [
            'file_id' => $fileId,
            'contents' => $contents,
            'mime' => $mime,
            'size' => $size > 0 ? $size : strlen($contents),
            'extension' => match ($mime) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'application/pdf' => 'pdf',
                default => 'bin',
            },
            'name' => $name,
        ];
    }

    private function detectMime(string $contents, string $fallback): ?string
    {
        $allowed = ['image/jpeg', 'image/png', 'application/pdf'];
        $detected = null;

        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);

            if ($finfo !== false) {
                $detected = finfo_buffer($finfo, $contents) ?: null;
                finfo_close($finfo);
            }
        }

        if ($detected !== null && in_array($detected, $allowed, true)) {
            return $detected;
        }

        $fallback = strtolower(trim(explode(';', $fallback)[0]));

        return in_array($fallback, $allowed, true) ? $fallback : null;
    }

    private function notifyAdminProof(
        Order $order,
        PaymentProof $proof,
        ?string $fileId,
        string $mime,
    ): void {
        $adminChatId = (string) config('shop.telegram_admin_chat_id');

        if ($adminChatId === '') {
            return;
        }

        $order->loadMissing('customer');

        $caption = "🧾 ပြေစာ အသစ် {$order->order_number}\n\n"
            ."{$order->customer?->name} — {$order->customer?->phone}\n"
            .'ငွေပေးချေမှု — '.$this->paymentMethods->label($order->payment_method)['mm']."\n"
            .'ကျသင့်ငွေ — '.number_format($order->total_mmk)." MMK\n"
            .'ပို့သူ — '.($proof->source === PaymentProof::SOURCE_TELEGRAM ? 'Telegram' : 'ဝဘ်ဆိုက်');

        $keyboard = ['inline_keyboard' => [
            [['text' => '💰 ငွေလက်ခံပြီး', 'callback_data' => 'adm:paid:'.$order->id]],
            [['text' => '📄 အော်ဒါ ကြည့်ရန်', 'url' => $this->adminOrderUrl($order)]],
        ]];

        if ($fileId !== null && $mime === 'image/jpeg') {
            $this->client->sendPhoto($adminChatId, $fileId, $caption, $keyboard);

            return;
        }

        if ($fileId !== null && $mime === 'application/pdf') {
            $this->client->sendDocument($adminChatId, $fileId, $caption, $keyboard);

            return;
        }

        $this->client->sendMessage($adminChatId, $caption, $keyboard);
    }

    private function adminOrderUrl(Order $order): string
    {
        return rtrim((string) config('shop.frontend_url'), '/').'/admin/orders/'.$order->id;
    }

    private function trackingUrl(Order $order): string
    {
        return rtrim((string) config('shop.frontend_url'), '/')
            ."/order/{$order->order_number}/{$this->tokens->issue($order)}";
    }

    /**
     * @return array<int, string>
     */
    private function closedStatuses(): array
    {
        return [
            Order::STATUS_CANCELLED,
            Order::STATUS_REFUSED,
            Order::STATUS_RETURNED,
        ];
    }

    /**
     * Status lookup requires the last four digits of the order's phone number,
     * because order numbers are sequential and otherwise enumerable.
     */
    private function status(int $chatId, string $argument): void
    {
        if (! preg_match('/^(ZW-\d{6})\s+(\d{4})$/', strtoupper(trim($argument)), $matches)) {
            $this->client->sendMessage(
                $chatId,
                "ဖုန်းနံပါတ် နောက်ဆုံး ၄ လုံး ထည့်ပါ။\nဥပမာ — /status ZW-000123 4567",
            );

            return;
        }

        $order = Order::query()
            ->with('customer')
            ->where('order_number', $matches[1])
            ->first();

        if (! $order || ! $order->customer || ! str_ends_with((string) $order->customer->phone, $matches[2])) {
            $this->client->sendMessage($chatId, 'အော်ဒါနံပါတ် သို့မဟုတ် ဖုန်းနံပါတ် မမှန်ပါ။');

            return;
        }

        $label = self::STATUS_LABELS[$order->status] ?? $order->status;
        $trackingUrl = $this->trackingUrl($order);
        $paymentLabel = $order->payment_status === Order::PAYMENT_PAID
            ? 'ရရှိပြီး'
            : ($order->payment_status === Order::PAYMENT_REFUNDED ? 'ပြန်အမ်းပြီး' : 'မရရှိသေးပါ');

        $this->client->sendMessage(
            $chatId,
            "{$order->order_number}\n"
            ."အခြေအနေ — {$label}\n"
            .'ငွေပေးချေမှု — '.$this->paymentMethods->label($order->payment_method)['mm']." · {$paymentLabel}\n"
            .'စုစုပေါင်း — '.number_format($order->total_mmk)." MMK\n\n"
            .$trackingUrl,
        );
    }

    private function cancel(TelegramSession $session): void
    {
        $this->save($session, ['step' => 'idle']);

        $this->client->sendMessage(
            $session->chat_id,
            "ပယ်ဖျက်ပြီးပါပြီ။\nအော်ဒါ အသစ် စတင်ရန် /start ကို နှိပ်ပါ။",
        );
    }

    private function session(int $chatId): TelegramSession
    {
        $session = TelegramSession::query()->firstOrCreate(
            ['chat_id' => $chatId],
            [
                'state' => ['step' => 'idle'],
                'expires_at' => Carbon::now()->addHours(self::SESSION_HOURS),
            ],
        );

        if ($session->expires_at->isPast()) {
            $this->save($session, ['step' => 'idle']);
        }

        return $session;
    }

    /**
     * @param  array<string, mixed>  $state
     */
    private function save(TelegramSession $session, array $state): void
    {
        $session->state = $state;
        $session->expires_at = Carbon::now()->addHours(self::SESSION_HOURS);
        $session->save();
    }

    private function firstError(ValidationException $exception): string
    {
        $errors = $exception->errors();

        return (string) (reset($errors)[0] ?? 'အချက်အလက် မမှန်ပါ။ ပြန်ကြိုးစားပါ။');
    }

    private function helpText(): string
    {
        return "ZayWear အကူအညီ\n\n"
            ."/start — အော်ဒါ စတင်ရန်\n"
            ."/shop — ပစ္စည်းများ ကြည့်ရန်\n"
            ."/pay ZW-000123 — ကြိုတင်ငွေချေ ပြေစာ ပို့ရန်\n"
            ."/status ZW-000123 4567 — အော်ဒါ အခြေအနေ\n"
            ."/contact — ဆက်သွယ်ရန်\n"
            ."/cancel — လက်ရှိ အော်ဒါ ပယ်ဖျက်ရန်\n"
            .'/help — အကူအညီ';
    }
}
