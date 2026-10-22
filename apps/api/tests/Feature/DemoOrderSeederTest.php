<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Services\TrackingToken;
use Database\Seeders\DemoOrderSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoOrderSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_every_status_with_events_payments_and_shipments(): void
    {
        $this->seed();

        $stockBefore = ProductVariant::query()->sum('stock_qty');

        $this->seed(DemoOrderSeeder::class);

        $this->assertSame(10, Order::query()->where('placed_via', 'demo')->count());

        foreach ([
            Order::STATUS_PENDING,
            Order::STATUS_CONFIRMED,
            Order::STATUS_PACKED,
            Order::STATUS_SHIPPED,
            Order::STATUS_DELIVERED,
            Order::STATUS_REFUSED,
            Order::STATUS_RETURNED,
            Order::STATUS_CANCELLED,
        ] as $status) {
            $this->assertTrue(
                Order::query()->where('status', $status)->exists(),
                "No demo order in status {$status}.",
            );
        }

        $this->assertSame(2, Order::query()->where('status', Order::STATUS_DELIVERED)->count());

        // Demo history must not consume stock.
        $this->assertSame($stockBefore, ProductVariant::query()->sum('stock_qty'));

        $tokens = app(TrackingToken::class);

        foreach (Order::query()->with(['items', 'events', 'payments', 'shipment'])->get() as $order) {
            $this->assertMatchesRegularExpression('/^ZW-\d{6}$/', $order->order_number);
            $this->assertSame($order->subtotal_mmk + $order->delivery_fee_mmk - $order->discount_mmk, $order->total_mmk);
            $this->assertSame(1, $order->items->count());
            $this->assertGreaterThanOrEqual(1, $order->events->count());
            $this->assertSame(1, $order->payments->count());
            $this->assertTrue($tokens->verify($order, $tokens->issue($order)));
            $this->assertNotNull($order->created_at);

            if (in_array($order->status, [Order::STATUS_SHIPPED, Order::STATUS_DELIVERED, Order::STATUS_REFUSED, Order::STATUS_RETURNED], true)) {
                $this->assertNotNull($order->shipment);
                $this->assertNotNull($order->shipment->tracking_number);
            }
        }

        $delivered = Order::query()->where('status', Order::STATUS_DELIVERED)->firstOrFail();
        $this->assertSame(Order::PAYMENT_PAID, $delivered->payment_status);
        $this->assertNotNull($delivered->delivered_at);
        $this->assertSame('paid', $delivered->payments->first()->status);
        $this->assertTrue($delivered->delivered_at->greaterThan($delivered->created_at));

        $refused = Order::query()->where('status', Order::STATUS_REFUSED)->firstOrFail();
        $this->assertSame('unreachable', $refused->refusal_reason);
        $this->assertNotNull($refused->refused_at);

        $returned = Order::query()->where('status', Order::STATUS_RETURNED)->firstOrFail();
        $this->assertNotNull($returned->refused_at);
        $this->assertNotNull($returned->returned_at);
        $this->assertTrue($returned->returned_at->greaterThan($returned->refused_at));

        $cancelled = Order::query()->where('status', Order::STATUS_CANCELLED)->firstOrFail();
        $this->assertNotNull($cancelled->cancel_reason);
    }

    public function test_running_it_twice_does_not_duplicate_orders(): void
    {
        $this->seed();
        $this->seed(DemoOrderSeeder::class);
        $this->seed(DemoOrderSeeder::class);

        $this->assertSame(10, Order::query()->count());
    }

    public function test_it_does_nothing_without_a_catalog(): void
    {
        $this->seed(DemoOrderSeeder::class);

        $this->assertSame(0, Order::query()->count());
    }
}
