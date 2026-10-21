<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\Township;
use App\Services\TrackingToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        config([
            'shop.admin_token' => 'test-admin-token',
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
