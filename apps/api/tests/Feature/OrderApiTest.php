<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\Township;
use App\Services\TrackingToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        Cache::flush();

        config([
            'shop.admin_token' => 'test-admin-token',
            'shop.admin_password' => 'test-admin-password',
            'shop.order_token_secret' => 'test-order-token-secret',
            'shop.order_token_ttl_days' => 90,
            'shop.free_delivery_threshold_mmk' => 80000,
        ]);
    }

    public function test_it_creates_a_cod_order_with_a_snapshotted_delivery_fee(): void
    {
        $variant = $this->variantWithStock(1);
        $township = $this->township('Bahan');
        $stockBefore = $variant->stock_qty;
        $unitPrice = $this->unitPrice($variant);

        $response = $this->postJson('/api/orders', $this->payload($variant, $township), [
            'Idempotency-Key' => 'test-order-1',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', Order::STATUS_PENDING)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_UNPAID)
            ->assertJsonPath('data.delivery_fee_mmk', 1500)
            ->assertJsonPath('data.subtotal_mmk', $unitPrice)
            ->assertJsonPath('data.total_mmk', $unitPrice + 1500);

        $orderNumber = $response->json('data.order_number');

        $this->assertMatchesRegularExpression('/^ZW-\d{6}$/', $orderNumber);
        $this->assertSame("/order/{$orderNumber}/{$response->json('tracking.token')}", $response->json('tracking.path'));
        $this->assertSame(1, Order::query()->count());
        $this->assertSame($stockBefore - 1, $variant->fresh()->stock_qty);
    }

    public function test_a_web_order_alerts_the_telegram_admin_chat(): void
    {
        config([
            'shop.telegram_bot_token' => 'test-token',
            'shop.telegram_admin_chat_id' => '999888777',
        ]);

        Http::fake();

        $variant = $this->variantWithStock(3);
        $township = $this->township('Bahan');

        $response = $this->postJson('/api/orders', $this->payload($variant, $township));

        $response->assertCreated();

        $orderNumber = $response->json('data.order_number');

        Http::assertSent(fn ($request): bool => str_contains($request->url(), 'sendMessage')
            && (string) $request['chat_id'] === '999888777'
            && str_contains((string) $request['text'], $orderNumber));
    }

    public function test_delivery_is_free_once_the_subtotal_reaches_the_threshold(): void
    {
        $variant = $this->variantWithStock(20);
        $township = $this->township('Bahan');
        $unitPrice = $this->unitPrice($variant);
        $quantity = (int) ceil(80000 / $unitPrice);

        $response = $this->postJson('/api/orders', $this->payload($variant, $township, $quantity));

        $response->assertCreated()
            ->assertJsonPath('data.delivery_fee_mmk', 0)
            ->assertJsonPath('data.subtotal_mmk', $unitPrice * $quantity)
            ->assertJsonPath('data.total_mmk', $unitPrice * $quantity);
    }

    public function test_replaying_the_same_idempotency_key_returns_the_same_order(): void
    {
        $variant = $this->variantWithStock(2);
        $township = $this->township('Bahan');
        $headers = ['Idempotency-Key' => 'retry-me'];
        $stockBefore = $variant->stock_qty;

        $first = $this->postJson('/api/orders', $this->payload($variant, $township), $headers);
        $second = $this->postJson('/api/orders', $this->payload($variant, $township), $headers);

        $first->assertCreated();
        $second->assertOk();

        $this->assertSame(
            $first->json('data.order_number'),
            $second->json('data.order_number'),
        );
        $this->assertSame(1, Order::query()->count());
        $this->assertSame($stockBefore - 1, $variant->fresh()->stock_qty);
    }

    public function test_it_rejects_a_quantity_above_available_stock(): void
    {
        $variant = $this->variantWithStock(1);
        $township = $this->township('Bahan');

        $this->postJson('/api/orders', $this->payload($variant, $township, 2))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.qty');

        $this->assertSame(0, Order::query()->count());
        $this->assertSame(1, $variant->fresh()->stock_qty);
    }

    public function test_it_rejects_a_township_that_is_not_delivered_to(): void
    {
        $variant = $this->variantWithStock(1);
        $township = $this->township('Bahan');
        $township->update(['is_active' => false]);

        $this->postJson('/api/orders', $this->payload($variant, $township))
            ->assertStatus(422)
            ->assertJsonValidationErrors('township_id');
    }

    public function test_tracking_returns_the_order_for_a_valid_token(): void
    {
        $order = $this->placeOrder();
        $token = app(TrackingToken::class)->issue($order);

        $this->getJson("/api/orders/{$order->order_number}/{$token}")
            ->assertOk()
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertJsonPath('data.order_number', $order->order_number)
            ->assertJsonPath('data.status', Order::STATUS_PENDING);
    }

    public function test_tracking_returns_only_what_the_tracker_needs(): void
    {
        $order = $this->placeOrder();
        $token = app(TrackingToken::class)->issue($order);

        $response = $this->getJson("/api/orders/{$order->order_number}/{$token}")
            ->assertOk()
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertJsonPath('data.order_number', $order->order_number)
            ->assertJsonPath('data.status', Order::STATUS_PENDING)
            ->assertJsonStructure([
                'data' => [
                    'order_number',
                    'status',
                    'events' => ['*' => ['to', 'at']],
                    'shipment',
                    'refusal_reason',
                    'created_at',
                ],
            ]);

        $data = $response->json('data');

        foreach (['address_line', 'landmark', 'note', 'customer', 'items', 'subtotal_mmk', 'payment_status', 'payment_method'] as $field) {
            $this->assertArrayNotHasKey($field, $data, "The public tracking payload must not include {$field}.");
        }
    }

    public function test_tracking_rejects_a_tampered_token(): void
    {
        $order = $this->placeOrder();

        $this->getJson("/api/orders/{$order->order_number}/not-a-real-token")
            ->assertForbidden();
    }

    public function test_tracking_rejects_an_expired_token(): void
    {
        $order = $this->placeOrder();
        $token = app(TrackingToken::class)->issue($order);

        $this->travel(91)->days();

        $this->getJson("/api/orders/{$order->order_number}/{$token}")
            ->assertForbidden();
    }

    public function test_admin_endpoints_require_the_admin_token(): void
    {
        $this->getJson('/api/admin/orders')->assertUnauthorized();

        $this->getJson('/api/admin/orders', ['Authorization' => 'Bearer wrong-token'])
            ->assertUnauthorized();
    }

    public function test_admin_rejects_an_invalid_status_transition(): void
    {
        $order = $this->placeOrder();

        $this->patchJson(
            "/api/admin/orders/{$order->id}/status",
            ['status' => Order::STATUS_DELIVERED],
            $this->adminHeaders(),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertSame(Order::STATUS_PENDING, $order->fresh()->status);
    }

    public function test_admin_can_confirm_an_order_and_payment_is_collected_on_delivery(): void
    {
        $order = $this->placeOrder();

        $this->patchJson(
            "/api/admin/orders/{$order->id}/status",
            ['status' => Order::STATUS_CONFIRMED],
            $this->adminHeaders(),
        )
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_CONFIRMED);

        $this->assertNotNull($order->fresh()->confirmed_at);

        foreach ([Order::STATUS_PACKED, Order::STATUS_SHIPPED, Order::STATUS_DELIVERED] as $status) {
            $this->patchJson(
                "/api/admin/orders/{$order->id}/status",
                ['status' => $status],
                $this->adminHeaders(),
            )->assertOk();
        }

        $delivered = $order->fresh();

        $this->assertSame(Order::STATUS_DELIVERED, $delivered->status);
        $this->assertSame(Order::PAYMENT_PAID, $delivered->payment_status);
        $this->assertNotNull($delivered->delivered_at);
        $this->assertSame(5, $delivered->events()->count());
    }

    public function test_metrics_break_down_refusal_reasons(): void
    {
        $refused = $this->placeOrder();
        $refused->update([
            'status' => Order::STATUS_REFUSED,
            'refusal_reason' => 'wrong_size',
        ]);

        $this->placeOrder();

        $this->getJson('/api/admin/metrics', $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('refusal_reasons_30d.wrong_size', 1);
    }

    public function test_admin_session_accepts_the_configured_password(): void
    {
        $this->postJson('/api/admin/session', ['password' => 'test-admin-password'])
            ->assertOk()
            ->assertJsonPath('ok', true);
    }

    public function test_admin_session_rejects_a_wrong_password(): void
    {
        $this->postJson('/api/admin/session', ['password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('password');
    }

    public function test_admin_session_is_rate_limited(): void
    {
        config(['shop.rate_limits.admin_login' => 2]);

        $this->postJson('/api/admin/session', ['password' => 'wrong-password'])
            ->assertStatus(422);
        $this->postJson('/api/admin/session', ['password' => 'wrong-password'])
            ->assertStatus(422);
        $this->postJson('/api/admin/session', ['password' => 'wrong-password'])
            ->assertStatus(429);
    }

    public function test_admin_order_detail_has_pricing_contact_and_allowed_transitions(): void
    {
        $order = $this->placeOrder();
        $order->update(['note' => 'Call before delivery']);

        $response = $this->getJson("/api/admin/orders/{$order->id}", $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.note', 'Call before delivery')
            ->assertJsonPath('data.township.name_en', 'Bahan')
            ->assertJsonPath('data.customer.phone', '09771234567')
            ->assertJsonPath('data.allowed_transitions', [
                Order::STATUS_CONFIRMED,
                Order::STATUS_CANCELLED,
            ]);

        $this->assertSame($order->subtotal_mmk, $response->json('data.subtotal_mmk'));
        $this->assertSame($order->delivery_fee_mmk, $response->json('data.delivery_fee_mmk'));
        $this->assertSame(0, $response->json('data.discount_mmk'));
        $this->assertSame($order->total_mmk, $response->json('data.total_mmk'));
    }

    public function test_admin_order_list_returns_status_counts(): void
    {
        $this->placeOrder();

        $this->getJson('/api/admin/orders', $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('meta.status_counts.pending', 1)
            ->assertJsonPath('meta.per_page', 50);
    }

    public function test_admin_can_attach_a_shipment_with_the_cod_amount(): void
    {
        $order = $this->placeOrder();

        $this->postJson(
            "/api/admin/orders/{$order->id}/shipment",
            ['carrier' => 'Royal Express', 'tracking_number' => 'RX-123'],
            $this->adminHeaders(),
        )
            ->assertOk()
            ->assertJsonPath('data.shipment.carrier', 'Royal Express')
            ->assertJsonPath('data.shipment.tracking_number', 'RX-123')
            ->assertJsonPath('data.shipment.cod_amount_mmk', $order->total_mmk);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(ProductVariant $variant, Township $township, int $quantity = 1): array
    {
        return [
            'customer' => [
                'name' => 'Thiri Aung',
                'phone' => '09771234567',
            ],
            'township_id' => $township->id,
            'address_line' => 'No 45, Inya Road',
            'landmark' => 'Near Bahan market',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $variant->id, 'qty' => $quantity],
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function adminHeaders(): array
    {
        return ['Authorization' => 'Bearer test-admin-token'];
    }

    private function township(string $nameEn): Township
    {
        return Township::query()->where('name_en', $nameEn)->firstOrFail();
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

    private function unitPrice(ProductVariant $variant): int
    {
        return $variant->product->base_price_mmk + $variant->price_delta_mmk;
    }

    private function placeOrder(): Order
    {
        $variant = $this->variantWithStock(1);
        $township = $this->township('Bahan');

        $response = $this->postJson('/api/orders', $this->payload($variant, $township));

        $response->assertCreated();

        return Order::query()->where('order_number', $response->json('data.order_number'))->firstOrFail();
    }
}
