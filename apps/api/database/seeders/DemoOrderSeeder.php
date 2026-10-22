<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\Shipment;
use App\Models\Township;
use App\Services\OrderPricing;
use App\Services\TrackingToken;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Local verification data: ten orders spread across every status so the admin
 * list, order detail, metrics, and tracking pages all have something to show.
 *
 * Opt-in on purpose — `migrate:fresh --seed` must never insert fake customers.
 * Rows are tagged `placed_via = demo`, which also makes the seeder idempotent.
 */
class DemoOrderSeeder extends Seeder
{
    /**
     * @var list<array{status: string, hours_ago: int, qty: int, name: string, phone: string}>
     */
    private const SCENARIOS = [
        ['status' => Order::STATUS_PENDING, 'hours_ago' => 2, 'qty' => 1, 'name' => 'သီရိ အောင်', 'phone' => '09771234567'],
        ['status' => Order::STATUS_PENDING, 'hours_ago' => 27, 'qty' => 2, 'name' => 'Aung Ko Ko', 'phone' => '09660011223'],
        ['status' => Order::STATUS_CONFIRMED, 'hours_ago' => 49, 'qty' => 1, 'name' => 'မြင့်မြတ်', 'phone' => '09442100987'],
        ['status' => Order::STATUS_PACKED, 'hours_ago' => 73, 'qty' => 1, 'name' => 'Su Myat Noe', 'phone' => '09798001122'],
        ['status' => Order::STATUS_SHIPPED, 'hours_ago' => 97, 'qty' => 2, 'name' => 'ဇော်လင်း', 'phone' => '09254113344'],
        ['status' => Order::STATUS_DELIVERED, 'hours_ago' => 146, 'qty' => 1, 'name' => 'Nilar Win', 'phone' => '09777889900'],
        ['status' => Order::STATUS_DELIVERED, 'hours_ago' => 290, 'qty' => 2, 'name' => 'ခင်လှ', 'phone' => '09500112211'],
        ['status' => Order::STATUS_REFUSED, 'hours_ago' => 194, 'qty' => 1, 'name' => 'Kyaw Zin', 'phone' => '09970005566'],
        ['status' => Order::STATUS_RETURNED, 'hours_ago' => 242, 'qty' => 1, 'name' => 'ဝင်းမောင်', 'phone' => '09420006677'],
        ['status' => Order::STATUS_CANCELLED, 'hours_ago' => 121, 'qty' => 1, 'name' => 'Thandar Aye', 'phone' => '09660008899'],
    ];

    public function run(): void
    {
        if (Order::query()->where('placed_via', 'demo')->exists()) {
            $this->command?->warn('Demo orders already exist. Delete them first if you want a fresh set:');
            $this->command?->line('  php artisan tinker --execute "App\\Models\\Order::where(\'placed_via\', \'demo\')->delete();"');

            return;
        }

        $variants = ProductVariant::query()
            ->with('product')
            ->where('is_active', true)
            ->orderBy('id')
            ->limit(6)
            ->get();

        $townships = Township::query()->where('is_active', true)->orderBy('id')->limit(4)->get();

        if ($variants->isEmpty() || $townships->isEmpty()) {
            $this->command?->error('Seed products and townships first: php artisan db:seed');

            return;
        }

        $pricing = app(OrderPricing::class);
        $tokens = app(TrackingToken::class);
        $rows = [];

        foreach (self::SCENARIOS as $index => $scenario) {
            $variant = $variants[$index % $variants->count()];
            $township = $townships[$index % $townships->count()];
            $createdAt = Carbon::now()->subHours($scenario['hours_ago'])->startOfHour();

            $customer = Customer::query()->firstOrCreate(
                ['phone' => $scenario['phone']],
                ['name' => $scenario['name'], 'township_id' => $township->id],
            );

            $quote = $pricing->quote(
                [['variant' => $variant, 'qty' => $scenario['qty']]],
                $township,
            );

            $timeline = $this->timeline($scenario['status'], $createdAt);
            $lastAt = end($timeline)['at'];

            $order = new Order([
                'customer_id' => $customer->id,
                'status' => $scenario['status'],
                'payment_method' => 'cod',
                'payment_status' => $this->paymentStatus($scenario['status']),
                'subtotal_mmk' => $quote['subtotal_mmk'],
                'delivery_fee_mmk' => $quote['delivery_fee_mmk'],
                'discount_mmk' => 0,
                'total_mmk' => $quote['total_mmk'],
                'township_id' => $township->id,
                'address_line' => 'အမှတ် '.($index + 12).'၊ လမ်း '.($index + 3).'၊ '.$township->name_mm,
                'landmark' => $township->name_mm.' ဈေး အနီး',
                'note' => $index === 0 ? 'ဖုန်းမကြိုပါနဲ့၊ မနက်ပိုင်း ပို့ပါ။' : null,
                'placed_via' => 'demo',
            ]);

            $order->created_at = $createdAt;
            $order->updated_at = $lastAt;

            foreach ([
                Order::STATUS_CONFIRMED => 'confirmed_at',
                Order::STATUS_PACKED => 'packed_at',
                Order::STATUS_SHIPPED => 'shipped_at',
                Order::STATUS_DELIVERED => 'delivered_at',
                Order::STATUS_REFUSED => 'refused_at',
                Order::STATUS_RETURNED => 'returned_at',
                Order::STATUS_CANCELLED => 'cancelled_at',
            ] as $eventStatus => $column) {
                $entry = collect($timeline)->firstWhere('to', $eventStatus);

                if ($entry !== null) {
                    $order->{$column} = $entry['at'];
                }
            }

            if (in_array($scenario['status'], [Order::STATUS_REFUSED, Order::STATUS_RETURNED], true)) {
                $order->refusal_reason = 'unreachable';
            }

            if ($scenario['status'] === Order::STATUS_CANCELLED) {
                $order->cancel_reason = 'Customer changed their mind';
            }

            $order->save();

            // The number is derived from the primary key, same as OrderCreator.
            $order->order_number = 'ZW-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT);
            Order::withoutTimestamps(fn () => $order->save());

            OrderItem::query()->create([
                'order_id' => $order->id,
                'product_id' => $variant->product_id,
                'variant_id' => $variant->id,
                'product_name_mm' => $variant->product->name_mm,
                'product_name_en' => $variant->product->name_en,
                'size' => $variant->size,
                'color' => $variant->color,
                'unit_price_mmk' => $pricing->unitPrice($variant),
                'qty' => $scenario['qty'],
                'line_total_mmk' => $quote['subtotal_mmk'],
            ]);

            foreach ($timeline as $event) {
                OrderEvent::query()->create([
                    'order_id' => $order->id,
                    'from_status' => $event['from'],
                    'to_status' => $event['to'],
                    'actor' => $event['to'] === Order::STATUS_PENDING ? 'customer' : 'admin',
                    'reason' => null,
                    'created_at' => $event['at'],
                ]);
            }

            Payment::query()->create([
                'order_id' => $order->id,
                'provider' => 'cod',
                'amount_mmk' => $order->total_mmk,
                'status' => $this->paymentRowStatus($scenario['status']),
                'paid_at' => $scenario['status'] === Order::STATUS_DELIVERED ? $order->delivered_at : null,
            ]);

            if ($order->shipped_at !== null) {
                Shipment::query()->create([
                    'order_id' => $order->id,
                    'carrier' => 'ZayWear Express (demo)',
                    'tracking_number' => 'ZWX-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT),
                    'cod_amount_mmk' => $order->total_mmk,
                    'dispatched_at' => $order->shipped_at,
                    'delivered_at' => $order->delivered_at,
                ]);
            }

            $rows[] = [
                $order->order_number,
                $scenario['status'],
                number_format($order->total_mmk).' MMK',
                rtrim((string) config('shop.frontend_url'), '/').'/order/'.$order->order_number.'/'.$tokens->issue($order),
            ];
        }

        $this->command?->info('Demo orders created (placed_via = demo).');
        $this->command?->table(['Order', 'Status', 'Total', 'Tracking'], $rows);
        $this->command?->line('Status lookups in the bot use the last four phone digits, e.g. /status '.$rows[0][0].' 4567');
    }

    /**
     * @return list<array{from: string|null, to: string, at: Carbon}>
     */
    private function timeline(string $status, Carbon $createdAt): array
    {
        $shippedAt = $createdAt->copy()->addHours(8);

        return match ($status) {
            Order::STATUS_PENDING => [
                ['from' => null, 'to' => Order::STATUS_PENDING, 'at' => $createdAt],
            ],
            Order::STATUS_CONFIRMED => [
                ['from' => null, 'to' => Order::STATUS_PENDING, 'at' => $createdAt],
                ['from' => Order::STATUS_PENDING, 'to' => Order::STATUS_CONFIRMED, 'at' => $createdAt->copy()->addHours(3)],
            ],
            Order::STATUS_PACKED => [
                ['from' => null, 'to' => Order::STATUS_PENDING, 'at' => $createdAt],
                ['from' => Order::STATUS_PENDING, 'to' => Order::STATUS_CONFIRMED, 'at' => $createdAt->copy()->addHours(3)],
                ['from' => Order::STATUS_CONFIRMED, 'to' => Order::STATUS_PACKED, 'at' => $createdAt->copy()->addHours(5)],
            ],
            Order::STATUS_SHIPPED => [
                ['from' => null, 'to' => Order::STATUS_PENDING, 'at' => $createdAt],
                ['from' => Order::STATUS_PENDING, 'to' => Order::STATUS_CONFIRMED, 'at' => $createdAt->copy()->addHours(3)],
                ['from' => Order::STATUS_CONFIRMED, 'to' => Order::STATUS_PACKED, 'at' => $createdAt->copy()->addHours(5)],
                ['from' => Order::STATUS_PACKED, 'to' => Order::STATUS_SHIPPED, 'at' => $shippedAt],
            ],
            Order::STATUS_DELIVERED => [
                ['from' => null, 'to' => Order::STATUS_PENDING, 'at' => $createdAt],
                ['from' => Order::STATUS_PENDING, 'to' => Order::STATUS_CONFIRMED, 'at' => $createdAt->copy()->addHours(3)],
                ['from' => Order::STATUS_CONFIRMED, 'to' => Order::STATUS_PACKED, 'at' => $createdAt->copy()->addHours(5)],
                ['from' => Order::STATUS_PACKED, 'to' => Order::STATUS_SHIPPED, 'at' => $shippedAt],
                ['from' => Order::STATUS_SHIPPED, 'to' => Order::STATUS_DELIVERED, 'at' => $shippedAt->copy()->addHours(51)],
            ],
            Order::STATUS_REFUSED => [
                ['from' => null, 'to' => Order::STATUS_PENDING, 'at' => $createdAt],
                ['from' => Order::STATUS_PENDING, 'to' => Order::STATUS_CONFIRMED, 'at' => $createdAt->copy()->addHours(3)],
                ['from' => Order::STATUS_CONFIRMED, 'to' => Order::STATUS_PACKED, 'at' => $createdAt->copy()->addHours(5)],
                ['from' => Order::STATUS_PACKED, 'to' => Order::STATUS_SHIPPED, 'at' => $shippedAt],
                ['from' => Order::STATUS_SHIPPED, 'to' => Order::STATUS_REFUSED, 'at' => $shippedAt->copy()->addHours(30)],
            ],
            Order::STATUS_RETURNED => [
                ['from' => null, 'to' => Order::STATUS_PENDING, 'at' => $createdAt],
                ['from' => Order::STATUS_PENDING, 'to' => Order::STATUS_CONFIRMED, 'at' => $createdAt->copy()->addHours(3)],
                ['from' => Order::STATUS_CONFIRMED, 'to' => Order::STATUS_PACKED, 'at' => $createdAt->copy()->addHours(5)],
                ['from' => Order::STATUS_PACKED, 'to' => Order::STATUS_SHIPPED, 'at' => $shippedAt],
                ['from' => Order::STATUS_SHIPPED, 'to' => Order::STATUS_REFUSED, 'at' => $shippedAt->copy()->addHours(30)],
                ['from' => Order::STATUS_REFUSED, 'to' => Order::STATUS_RETURNED, 'at' => $shippedAt->copy()->addHours(54)],
            ],
            Order::STATUS_CANCELLED => [
                ['from' => null, 'to' => Order::STATUS_PENDING, 'at' => $createdAt],
                ['from' => Order::STATUS_PENDING, 'to' => Order::STATUS_CANCELLED, 'at' => $createdAt->copy()->addHours(2)],
            ],
        };
    }

    private function paymentStatus(string $status): string
    {
        return match ($status) {
            Order::STATUS_DELIVERED => Order::PAYMENT_PAID,
            Order::STATUS_REFUSED, Order::STATUS_CANCELLED => Order::PAYMENT_FAILED,
            default => Order::PAYMENT_UNPAID,
        };
    }

    private function paymentRowStatus(string $status): string
    {
        return match ($status) {
            Order::STATUS_DELIVERED => 'paid',
            Order::STATUS_REFUSED, Order::STATUS_CANCELLED => 'failed',
            default => 'pending',
        };
    }
}
