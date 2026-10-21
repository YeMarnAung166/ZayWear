<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\ProductVariant;
use App\Models\Township;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Creates an order from validated input.
 *
 * Shared by the web checkout and the Telegram bot so pricing, stock handling
 * and payment records stay identical across channels.
 */
class OrderCreator
{
    public function __construct(private readonly OrderPricing $pricing) {}

    /**
     * @param  array{customer: array{name: string, phone: string}, township_id: int, address_line: string, landmark: string, note?: string|null, payment_method: string, items: array<int, array{variant_id: int, qty: int}>}  $data
     */
    public function create(array $data, ?string $idempotencyKey = null, string $channel = 'web'): Order
    {
        $township = Township::query()->active()->find($data['township_id']);

        if (! $township) {
            throw ValidationException::withMessages([
                'township_id' => ['We do not deliver to this township yet.'],
            ]);
        }

        return DB::transaction(function () use ($data, $township, $idempotencyKey, $channel): Order {
            $requestedIds = collect($data['items'])->pluck('variant_id')->unique()->values();

            /** @var Collection<int, ProductVariant> $variants */
            $variants = ProductVariant::query()
                ->with('product')
                ->whereIn('id', $requestedIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $lines = [];

            foreach ($data['items'] as $index => $item) {
                $variant = $variants->get($item['variant_id']);

                if (! $variant || ! $variant->is_active) {
                    throw ValidationException::withMessages([
                        "items.{$index}.variant_id" => ['This item is no longer available.'],
                    ]);
                }

                if ($variant->stock_qty < $item['qty']) {
                    throw ValidationException::withMessages([
                        "items.{$index}.qty" => ["Only {$variant->stock_qty} left in {$variant->size}."],
                    ]);
                }

                $variant->decrement('stock_qty', $item['qty']);
                $lines[] = ['variant' => $variant, 'qty' => (int) $item['qty']];
            }

            $quote = $this->pricing->quote($lines, $township);

            $customer = Customer::query()->updateOrCreate(
                ['phone' => $data['customer']['phone']],
                [
                    'name' => $data['customer']['name'],
                    'township_id' => $township->id,
                ],
            );

            $order = Order::query()->create([
                'customer_id' => $customer->id,
                'status' => Order::STATUS_PENDING,
                'payment_status' => Order::PAYMENT_UNPAID,
                'payment_method' => $data['payment_method'],
                'subtotal_mmk' => $quote['subtotal_mmk'],
                'delivery_fee_mmk' => $quote['delivery_fee_mmk'],
                'discount_mmk' => $quote['discount_mmk'],
                'total_mmk' => $quote['total_mmk'],
                'township_id' => $township->id,
                'address_line' => $data['address_line'],
                'landmark' => $data['landmark'],
                'note' => $data['note'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'placed_via' => $channel,
            ]);

            $order->order_number = 'ZW-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT);
            $order->save();

            foreach ($lines as $line) {
                $variant = $line['variant'];
                $unit = $this->pricing->unitPrice($variant);

                $order->items()->create([
                    'product_id' => $variant->product_id,
                    'variant_id' => $variant->id,
                    'product_name_mm' => $variant->product->name_mm,
                    'product_name_en' => $variant->product->name_en,
                    'size' => $variant->size,
                    'color' => $variant->color,
                    'unit_price_mmk' => $unit,
                    'qty' => $line['qty'],
                    'line_total_mmk' => $unit * $line['qty'],
                ]);
            }

            OrderEvent::query()->create([
                'order_id' => $order->id,
                'from_status' => null,
                'to_status' => Order::STATUS_PENDING,
                'actor' => 'customer',
                'reason' => "Order placed via {$channel}",
                'created_at' => Carbon::now(),
            ]);

            $order->payments()->create([
                'provider' => $data['payment_method'],
                'amount_mmk' => $quote['total_mmk'],
                'status' => 'pending',
            ]);

            return $order;
        });
    }
}
