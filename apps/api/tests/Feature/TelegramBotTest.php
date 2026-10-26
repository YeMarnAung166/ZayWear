<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\TelegramSession;
use App\Models\Township;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TelegramBotTest extends TestCase
{
    use RefreshDatabase;

    private const CHAT_ID = 555000111;

    private const ADMIN_CHAT_ID = 999888777;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        Storage::fake('local');

        config([
            'shop.telegram_bot_token' => 'test-token',
            'shop.telegram_webhook_secret' => 'test-secret',
            'shop.telegram_admin_chat_id' => '',
            'shop.frontend_url' => 'http://localhost:3000',
        ]);

        Http::fake();
    }

    public function test_the_webhook_rejects_a_request_without_the_secret_header(): void
    {
        $this->postJson('/api/telegram/webhook', [
            'message' => ['chat' => ['id' => self::CHAT_ID], 'text' => '/start'],
        ])->assertUnauthorized();
    }

    public function test_start_lists_the_catalogue(): void
    {
        $this->sendText('/start');

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && str_contains((string) $request['text'], 'ZayWear'));
    }

    public function test_a_product_deep_link_offers_its_sizes(): void
    {
        $variant = $this->variantWithStock(5);

        $this->sendText('/start product_'.$variant->product_id);

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && str_contains((string) $request['text'], 'အရွယ်အစား ရွေးပါ')
            && $this->keyboardContains($request['reply_markup'] ?? [], 'v:'.$variant->id));
    }

    public function test_a_size_deep_link_skips_straight_to_quantity(): void
    {
        $variant = $this->variantWithStock(5);

        $this->sendText("/start product_{$variant->product_id}_size_{$variant->size}");

        $this->assertStringContainsString('အရေအတွက် ရွေးပါ', $this->lastMessage());
        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && $this->keyboardContains($request['reply_markup'] ?? [], 'q:1'));
    }

    public function test_it_places_a_cod_order_through_the_chat(): void
    {
        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();
        $stockBefore = $variant->stock_qty;
        $unitPrice = $variant->product->base_price_mmk + $variant->price_delta_mmk;

        $this->startAtQuantity($variant);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('pm:cod');
        $this->press('ok');

        $order = Order::query()->sole();
        $fee = $unitPrice >= 80000 ? 0 : 1500;

        $this->assertSame('telegram', $order->placed_via);
        $this->assertSame(Order::STATUS_PENDING, $order->status);
        $this->assertSame('cod', $order->payment_method);
        $this->assertSame($unitPrice, $order->subtotal_mmk);
        $this->assertSame($fee, $order->delivery_fee_mmk);
        $this->assertSame($unitPrice + $fee, $order->total_mmk);
        $this->assertSame($stockBefore - 1, $variant->fresh()->stock_qty);
        $this->assertSame('09771234567', $order->customer->phone);
        $this->assertSame(1, $order->items()->count());
        $this->assertSame(1, $order->payments()->count());

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && str_contains((string) $request['text'], $order->order_number));
    }

    public function test_the_payment_step_offers_enabled_prepaid_methods(): void
    {
        $this->enableKbzpay();

        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->startAtQuantity($variant);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');

        $this->assertTrue($this->lastMessageKeyboardContains('pm:kbzpay'));
        $this->assertTrue($this->lastMessageKeyboardContains('pm:cod'));

        $this->press('pm:kbzpay');

        $this->assertStringContainsString('MMK (KBZPay)', $this->lastMessage());
        $this->assertSame(0, Order::query()->count());
    }

    public function test_a_prepaid_method_cannot_be_selected_while_it_is_unavailable(): void
    {
        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->startAtQuantity($variant);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');

        $this->press('pm:kbzpay');

        $this->assertStringContainsString('မရနိုင်တော့ပါ', $this->lastMessage());
        $this->assertSame(0, Order::query()->count());
    }

    public function test_a_telegram_prepaid_order_accepts_a_receipt_and_can_be_marked_paid(): void
    {
        config(['shop.telegram_admin_chat_id' => (string) self::ADMIN_CHAT_ID]);
        $this->enableKbzpay();

        // Replace the permissive fake from setUp so the Telegram file
        // download returns a real image body for MIME detection.
        Http::swap(new Factory);
        Http::fake(function ($request) {
            if (str_contains($request->url(), '/getFile')) {
                return Http::response([
                    'ok' => true,
                    'result' => ['file_path' => 'photos/receipt.png'],
                ]);
            }

            if (str_contains($request->url(), '/file/bot')) {
                return Http::response(
                    base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lK3r5QAAAABJRU5ErkJggg=='),
                    200,
                    ['Content-Type' => 'image/png'],
                );
            }

            return Http::response(['ok' => true, 'result' => true]);
        });

        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->startAtQuantity($variant);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('pm:kbzpay');
        $this->press('ok');

        $order = Order::query()->sole();

        $this->assertSame('kbzpay', $order->payment_method);
        $this->assertSame(Order::STATUS_PENDING, $order->status);
        $this->assertSame(Order::PAYMENT_UNPAID, $order->payment_status);

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && (string) $request['chat_id'] === (string) self::CHAT_ID
            && str_contains((string) $request['text'], 'အကောင့်နာမည် — ZayWear Store')
            && str_contains((string) $request['text'], 'ပြေစာ'));

        // The initial admin alert already offers the manual verification path.
        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && (string) $request['chat_id'] === (string) self::ADMIN_CHAT_ID
            && $this->keyboardContains($request['reply_markup'] ?? [], 'adm:paid:'.$order->id));

        $session = TelegramSession::query()->where('chat_id', self::CHAT_ID)->sole();
        $this->assertSame('proof', $session->state['step']);

        $this->sendPhoto('telegram-file-1');

        $proof = $order->paymentProofs()->sole();

        $this->assertSame(PaymentProof::SOURCE_TELEGRAM, $proof->source);
        $this->assertSame('telegram-file-1', $proof->telegram_file_id);
        $this->assertSame(PaymentProof::STATUS_PENDING, $proof->status);
        $this->assertSame('image/png', $proof->mime_type);
        Storage::disk('local')->assertExists($proof->path);

        Http::assertSent(fn ($request): bool => str_contains(
            (string) ($request['caption'] ?? $request['text'] ?? ''),
            'ပြေစာ အသစ်',
        )
            && (string) $request['chat_id'] === (string) self::ADMIN_CHAT_ID
            && $this->keyboardContains($request['reply_markup'] ?? [], 'adm:paid:'.$order->id));

        $this->press('adm:paid:'.$order->id, self::ADMIN_CHAT_ID);

        $order->refresh();

        $this->assertSame(Order::PAYMENT_PAID, $order->payment_status);
        $this->assertSame(Order::STATUS_CONFIRMED, $order->status);
        $this->assertSame(PaymentProof::STATUS_APPROVED, $proof->fresh()->status);
    }

    public function test_it_orders_more_than_one_item(): void
    {
        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->startAtQuantity($variant);
        $this->press('q:2');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('pm:cod');
        $this->press('ok');

        $order = Order::query()->sole();

        $this->assertSame(2, $order->items()->first()->qty);
        $this->assertSame(3, $variant->fresh()->stock_qty);
    }

    public function test_a_double_tap_on_confirm_does_not_create_two_orders(): void
    {
        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->startAtQuantity($variant);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('pm:cod');
        $this->press('ok');
        $this->press('ok');

        $this->assertSame(1, Order::query()->count());
    }

    public function test_an_invalid_phone_number_keeps_the_customer_in_the_flow(): void
    {
        $variant = $this->variantWithStock(5);

        $this->sendText('/start product_'.$variant->product_id);
        $this->press('v:'.$variant->id);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('12345');

        $this->assertSame(0, Order::query()->count());
        $this->assertStringContainsString('ဖုန်းနံပါတ် မမှန်ပါ', $this->lastMessage());
    }

    public function test_status_requires_the_last_four_phone_digits(): void
    {
        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->startAtQuantity($variant);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('pm:cod');
        $this->press('ok');

        $order = Order::query()->sole();

        $this->sendText('/status '.$order->order_number);
        $this->assertStringContainsString('နောက်ဆုံး ၄ လုံး', $this->lastMessage());

        $this->sendText('/status '.$order->order_number.' 0000');
        $this->assertStringContainsString('မမှန်ပါ', $this->lastMessage());

        $this->sendText('/status '.$order->order_number.' 4567');
        $this->assertStringContainsString($order->order_number, $this->lastMessage());
        $this->assertStringContainsString('/order/', $this->lastMessage());
    }

    public function test_the_admin_alert_can_confirm_an_order(): void
    {
        config(['shop.telegram_admin_chat_id' => (string) self::ADMIN_CHAT_ID]);

        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->startAtQuantity($variant);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('pm:cod');
        $this->press('ok');

        $order = Order::query()->sole();

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && (string) $request['chat_id'] === (string) self::ADMIN_CHAT_ID
            && $this->keyboardContains($request['reply_markup'] ?? [], 'adm:confirm:'.$order->id));

        $this->press('adm:confirm:'.$order->id, self::ADMIN_CHAT_ID);

        $this->assertSame(Order::STATUS_CONFIRMED, $order->fresh()->status);
        $this->assertNotNull($order->fresh()->confirmed_at);
    }

    public function test_a_customer_chat_cannot_confirm_an_order_from_the_admin_alert(): void
    {
        config(['shop.telegram_admin_chat_id' => (string) self::ADMIN_CHAT_ID]);

        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->startAtQuantity($variant);
        $this->press('q:1');
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('pm:cod');
        $this->press('ok');

        $order = Order::query()->sole();

        $this->press('adm:confirm:'.$order->id, self::CHAT_ID);

        $this->assertSame(Order::STATUS_PENDING, $order->fresh()->status);
    }

    public function test_cancel_resets_the_session(): void
    {
        $variant = $this->variantWithStock(5);

        $this->sendText('/start product_'.$variant->product_id);
        $this->press('v:'.$variant->id);
        $this->sendText('/cancel');
        $this->sendText('Thiri Aung');

        $this->assertDatabaseHas('telegram_sessions', [
            'chat_id' => self::CHAT_ID,
        ]);
        $this->assertSame(0, Order::query()->count());
    }

    /**
     * Open the product and tap its first size, landing on the quantity step.
     */
    private function startAtQuantity(ProductVariant $variant): void
    {
        $this->sendText('/start product_'.$variant->product_id);
        $this->press('v:'.$variant->id);
    }

    private function sendText(string $text, int $updateId = 1): void
    {
        $this->update([
            'update_id' => $updateId,
            'message' => [
                'message_id' => $updateId,
                'chat' => ['id' => self::CHAT_ID],
                'text' => $text,
            ],
        ]);
    }

    private function press(string $data, int $chatId = self::CHAT_ID, int $updateId = 1): void
    {
        $this->update([
            'update_id' => $updateId,
            'callback_query' => [
                'id' => 'callback-'.$updateId,
                'from' => ['id' => $chatId],
                'message' => [
                    'message_id' => $updateId,
                    'chat' => ['id' => $chatId],
                    'text' => 'previous',
                ],
                'data' => $data,
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function update(array $payload): void
    {
        $this->postJson('/api/telegram/webhook', $payload, [
            'X-Telegram-Bot-Api-Secret-Token' => 'test-secret',
        ])->assertOk();
    }

    private function lastMessage(): string
    {
        $messages = collect(Http::recorded())
            ->map(fn ($pair) => $pair[0])
            ->filter(fn ($request): bool => str_contains($request->url(), 'sendMessage'))
            ->map(fn ($request): string => (string) $request['text'])
            ->values();

        return (string) $messages->last();
    }

    private function lastMessageKeyboardContains(string $callbackData): bool
    {
        $requests = collect(Http::recorded())
            ->map(fn ($pair) => $pair[0])
            ->filter(fn ($request): bool => str_contains($request->url(), 'sendMessage'))
            ->values();

        $last = $requests->last();

        return $last !== null && $this->keyboardContains($last['reply_markup'] ?? [], $callbackData);
    }

    private function sendPhoto(string $fileId, int $updateId = 1): void
    {
        $this->update([
            'update_id' => $updateId,
            'message' => [
                'message_id' => $updateId,
                'chat' => ['id' => self::CHAT_ID],
                'photo' => [
                    ['file_id' => $fileId, 'file_size' => 1024, 'width' => 1, 'height' => 1],
                ],
            ],
        ]);
    }

    private function enableKbzpay(): void
    {
        foreach ([
            'kbzpay_enabled' => true,
            'kbzpay_account_name' => 'ZayWear Store',
            'kbzpay_phone' => '09771234567',
        ] as $key => $value) {
            Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }

    /**
     * @param  mixed  $markup
     */
    private function keyboardContains($markup, string $callbackData): bool
    {
        foreach ($markup['inline_keyboard'] ?? [] as $row) {
            foreach ($row as $button) {
                if (($button['callback_data'] ?? '') === $callbackData) {
                    return true;
                }
            }
        }

        return false;
    }

    private function variantWithStock(int $stock): ProductVariant
    {
        $variant = ProductVariant::query()
            ->with('product')
            ->where('is_active', true)
            ->orderBy('id')
            ->firstOrFail();

        $variant->update(['stock_qty' => $stock]);

        return $variant->fresh();
    }
}
