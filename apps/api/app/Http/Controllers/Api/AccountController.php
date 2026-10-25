<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerAddressResource;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Services\CustomerAuth;
use App\Services\TrackingToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['customer', 'township', 'items', 'events', 'shipment'];

    public function orders(Request $request): JsonResponse
    {
        $orders = Order::query()
            ->where('customer_id', $this->customer($request)->id)
            ->with(self::RELATIONS)
            ->latest('id')
            ->paginate(10);

        return OrderResource::collection($orders)->response();
    }

    public function order(Request $request, string $orderNumber, TrackingToken $tokens): JsonResponse
    {
        $order = $this->findOrder($request, $orderNumber);

        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        return response()->json([
            'data' => new OrderResource($order),
            'tracking' => [
                'path' => "/order/{$order->order_number}/{$tokens->issue($order)}",
            ],
        ]);
    }

    public function reorder(Request $request, string $orderNumber): JsonResponse
    {
        $order = Order::query()
            ->where('customer_id', $this->customer($request)->id)
            ->where('order_number', $orderNumber)
            ->with(['items.variant.product.images'])
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        $lines = [];
        $unavailable = [];

        foreach ($order->items as $item) {
            $variant = $item->variant;
            $product = $variant?->product;

            if (! $variant || ! $variant->is_active || $variant->stock_qty < 1 || ! $product || ! $product->is_active) {
                $unavailable[] = [
                    'name_mm' => $item->product_name_mm,
                    'name_en' => $item->product_name_en,
                    'size' => $item->size,
                ];

                continue;
            }

            $image = $product->images->firstWhere('is_primary', true) ?? $product->images->first();
            $maxQty = min($variant->stock_qty, 20);

            $lines[] = [
                'variantId' => $variant->id,
                'productId' => $product->id,
                'productSlug' => $product->slug,
                'name_mm' => $product->name_mm,
                'name_en' => $product->name_en,
                'size' => $variant->size,
                'color' => $variant->color,
                'unitPrice' => $product->base_price_mmk + $variant->price_delta_mmk,
                'qty' => min((int) $item->qty, $maxQty),
                'image' => $image?->path ?? '',
                'maxQty' => $maxQty,
            ];
        }

        return response()->json([
            'data' => [
                'lines' => $lines,
                'unavailable' => $unavailable,
            ],
        ]);
    }

    public function addresses(Request $request): JsonResponse
    {
        $addresses = $this->customer($request)
            ->addresses()
            ->with('township')
            ->orderByDesc('is_default')
            ->latest('id')
            ->get();

        return response()->json([
            'data' => CustomerAddressResource::collection($addresses)->resolve(),
        ]);
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $validated = $request->validate($this->addressRules());
        $customer = $this->customer($request);

        $isDefault = array_key_exists('is_default', $validated)
            ? (bool) $validated['is_default']
            : $customer->addresses()->count() === 0;

        if ($isDefault) {
            $customer->addresses()->update(['is_default' => false]);
        }

        $address = $customer->addresses()->create([
            'label' => $validated['label'] ?? 'Home',
            'township_id' => $validated['township_id'],
            'address_line' => $validated['address_line'],
            'landmark' => $validated['landmark'],
            'is_default' => $isDefault,
        ]);

        $address->load('township');

        return response()->json(['data' => new CustomerAddressResource($address)], 201);
    }

    public function updateAddress(Request $request, CustomerAddress $address): JsonResponse
    {
        $customer = $this->customer($request);

        if ($address->customer_id !== $customer->id) {
            return response()->json(['message' => 'Address not found.'], 404);
        }

        $validated = $request->validate($this->addressRules());

        if (($validated['is_default'] ?? false) === true) {
            $customer->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        $address->update($validated);
        $address->load('township');

        return response()->json(['data' => new CustomerAddressResource($address)]);
    }

    public function deleteAddress(Request $request, CustomerAddress $address): JsonResponse
    {
        $customer = $this->customer($request);

        if ($address->customer_id !== $customer->id) {
            return response()->json(['message' => 'Address not found.'], 404);
        }

        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $customer->addresses()->latest('id')->first()?->update(['is_default' => true]);
        }

        return response()->json(['message' => 'Address removed.']);
    }

    public function lookup(Request $request, CustomerAuth $auth, TrackingToken $tokens): JsonResponse
    {
        $validated = $request->validate([
            'order_number' => ['required', 'string', 'max:16'],
            'phone' => ['required', 'string', 'max:20'],
        ]);

        $phone = $auth->normalizePhone($validated['phone']);

        if ($phone === null) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        $order = Order::query()
            ->where('order_number', strtoupper(trim($validated['order_number'])))
            ->whereHas('customer', fn ($query) => $query->where('phone', $phone))
            ->with(self::RELATIONS)
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        return response()->json([
            'data' => new OrderResource($order),
            'tracking' => [
                'path' => "/order/{$order->order_number}/{$tokens->issue($order)}",
            ],
        ]);
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function addressRules(): array
    {
        return [
            'label' => ['sometimes', 'string', 'max:40'],
            'township_id' => ['required', 'integer', 'exists:townships,id'],
            'address_line' => ['required', 'string', 'min:5', 'max:500'],
            'landmark' => ['required', 'string', 'min:5', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    private function customer(Request $request): Customer
    {
        /** @var Customer $customer */
        $customer = $request->attributes->get('customer');

        return $customer;
    }

    private function findOrder(Request $request, string $orderNumber): ?Order
    {
        return Order::query()
            ->where('customer_id', $this->customer($request)->id)
            ->where('order_number', $orderNumber)
            ->with(self::RELATIONS)
            ->first();
    }
}
