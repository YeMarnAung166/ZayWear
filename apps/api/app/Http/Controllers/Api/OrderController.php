<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderEvent;
use App\Models\ProductVariant;
use App\Models\Township;
use App\Services\OrderPricing;
use App\Services\TrackingToken;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['customer', 'township', 'items', 'events', 'shipment'];

    public function store(
        StoreOrderRequest $request,
        OrderPricing $pricing,
        TrackingToken $tokens,
    ): JsonResponse {
        $data = $request->validated();
        $idempotencyKey = $request->header('Idempotency-Key');

        if ($idempotencyKey) {
            $existing = Order::query()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing) {
                return $this->respond($existing->load(self::RELATIONS), $tokens, 200);
            }
        }

        $township = Township::query()->active()->find($data['township_id']);

        if (! $township) {
            throw ValidationException::withMessages([
                'township_id' => ['We do not deliver to this township yet.'],
            ]);
        }

        try {
            $order = DB::transaction(function () use ($data, $township, $pricing, $idempotencyKey) {
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

                $quote = $pricing->quote($lines, $township);

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
                    'placed_via' => 'web',
                ]);

                $order->order_number = 'ZW-'.str_pad((string) $order->id, 6, '0', STR_PAD_LEFT);
                $order->save();

                foreach ($lines as $line) {
                    $variant = $line['variant'];
                    $unit = $pricing->unitPrice($variant);

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
                    'reason' => 'Order placed via web',
                    'created_at' => Carbon::now(),
                ]);

                $order->payments()->create([
                    'provider' => $data['payment_method'],
                    'amount_mmk' => $quote['total_mmk'],
                    'status' => 'pending',
                ]);

                return $order;
            });
        } catch (QueryException $exception) {
            // Concurrent duplicate submission: return the order that won the race.
            if ($idempotencyKey) {
                $existing = Order::query()->where('idempotency_key', $idempotencyKey)->first();

                if ($existing) {
                    return $this->respond($existing->load(self::RELATIONS), $tokens, 200);
                }
            }

            throw $exception;
        }

        return $this->respond($order->load(self::RELATIONS), $tokens, 201);
    }

    public function show(Request $request, string $orderNumber, string $token, TrackingToken $tokens): JsonResponse
    {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with(self::RELATIONS)
            ->firstOrFail();

        if (! $tokens->verify($order, $token)) {
            return response()->json([
                'message' => 'This tracking link is invalid or has expired.',
            ], 403);
        }

        $request->attributes->set('referrer_policy', 'no-referrer');

        return response()
            ->json(['data' => new OrderResource($order)])
            ->header('Referrer-Policy', 'no-referrer');
    }

    private function respond(Order $order, TrackingToken $tokens, int $status): JsonResponse
    {
        $token = $tokens->issue($order);

        return response()
            ->json([
                'data' => new OrderResource($order),
                'tracking' => [
                    'token' => $token,
                    'path' => "/order/{$order->order_number}/{$token}",
                ],
            ], $status)
            ->header('Referrer-Policy', 'no-referrer');
    }
}
