<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\Township;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TelegramBotTest extends TestCase
{
    use RefreshDatabase;

    private const CHAT_ID = 555000111;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

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

    public function test_it_places_a_cod_order_through_the_chat(): void
    {
        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();
        $stockBefore = $variant->stock_qty;
        $unitPrice = $variant->product->base_price_mmk + $variant->price_delta_mmk;

        $this->sendText('/start product_'.$variant->product_id);
        $this->press('v:'.$variant->id);
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('ok');

        $order = Order::query()->sole();

        $this->assertSame('telegram', $order->placed_via);
        $this->assertSame(Order::STATUS_PENDING, $order->status);
        $this->assertSame('cod', $order->payment_method);
        $this->assertSame($unitPrice, $order->subtotal_mmk);
        $this->assertSame(1500, $order->delivery_fee_mmk);
        $this->assertSame($unitPrice + 1500, $order->total_mmk);
        $this->assertSame($stockBefore - 1, $variant->fresh()->stock_qty);
        $this->assertSame('09771234567', $order->customer->phone);
        $this->assertSame(1, $order->items()->count());
        $this->assertSame(1, $order->payments()->count());

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && str_contains((string) $request['text'], $order->order_number));
    }

    public function test_a_double_tap_on_confirm_does_not_create_two_orders(): void
    {
        $variant = $this->variantWithStock(5);
        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        $this->sendText('/start product_'.$variant->product_id);
        $this->press('v:'.$variant->id);
        $this->sendText('Thiri Aung');
        $this->sendText('09771234567');
        $this->press('t:'.$township->id);
        $this->sendText('No 45, Inya Road, Bahan');
        $this->sendText('Near Bahan market');
        $this->press('ok');
        $this->press('ok');

        $this->assertSame(1, Order::query()->count());
    }

    public function test_an_invalid_phone_number_keeps_the_customer_in_the_flow(): void
    {
        $variant = $this->variantWithStock(5);

        $this->sendText('/start product_'.$variant->product_id);
        $this->press('v:'.$variant->id);
        $this->sendText('Thiri Aung');
        $this->sendText('12345');

        $this->assertSame(0, Order::query()->count());

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && str_contains((string) $request['text'], 'ဖုန်းနံပါတ် မမှန်ပါ'));
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

    private function press(string $data, int $updateId = 1): void
    {
        $this->update([
            'update_id' => $updateId,
            'callback_query' => [
                'id' => 'callback-'.$updateId,
                'from' => ['id' => self::CHAT_ID],
                'message' => [
                    'message_id' => $updateId,
                    'chat' => ['id' => self::CHAT_ID],
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
