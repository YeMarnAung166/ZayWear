<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Services\OrderStateMachine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminOrderController extends Controller
{
    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['customer', 'township', 'items', 'events', 'shipment', 'payments'];

    public function index(Request $request): JsonResponse
    {
        $query = Order::query()
            ->with(['customer', 'township'])
            ->withCount('items');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        if ($from = $request->string('from')->toString()) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->string('to')->toString()) {
            $query->whereDate('created_at', '<=', $to);
        }

        if ($search = $request->string('q')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhereHas('customer', fn ($c) => $c->where('phone', 'like', "%{$search}%"));
            });
        }

        $orders = $query->latest('id')->paginate(50)->withQueryString();

        return response()->json([
            'data' => collect($orders->items())->map(fn (Order $order) => $this->present($order)),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
                'status_counts' => $this->statusCounts(),
            ],
        ]);
    }

    public function show(int $id, OrderStateMachine $stateMachine): JsonResponse
    {
        $order = Order::query()->with(self::RELATIONS)->findOrFail($id);

        return response()->json([
            'data' => $this->present(
                $order,
                full: true,
                allowedTransitions: $stateMachine->allowedTransitions($order->status),
            ),
        ]);
    }

    public function updateStatus(
        UpdateOrderStatusRequest $request,
        int $id,
        OrderStateMachine $stateMachine,
    ): JsonResponse {
        $order = Order::query()->findOrFail($id);

        $stateMachine->transition(
            $order,
            $request->string('status')->toString(),
            'admin',
            $request->input('reason'),
            $request->input('refusal_reason'),
        );

        $order = $order->fresh()->load(self::RELATIONS);

        return response()->json([
            'data' => $this->present(
                $order,
                full: true,
                allowedTransitions: $stateMachine->allowedTransitions($order->status),
            ),
        ]);
    }

    public function shipment(
        Request $request,
        int $id,
        OrderStateMachine $stateMachine,
    ): JsonResponse {
        $validated = $request->validate([
            'carrier' => ['required', 'string', 'max:80'],
            'tracking_number' => ['nullable', 'string', 'max:80'],
        ]);

        $order = Order::query()->findOrFail($id);

        $order->shipments()->updateOrCreate(
            ['order_id' => $order->id],
            [
                'carrier' => $validated['carrier'],
                'tracking_number' => $validated['tracking_number'] ?? null,
                'cod_amount_mmk' => $order->payment_method === 'cod' ? $order->total_mmk : 0,
                'dispatched_at' => $order->shipped_at ?? Carbon::now(),
            ],
        );

        $order = $order->fresh()->load(self::RELATIONS);

        return response()->json([
            'data' => $this->present(
                $order,
                full: true,
                allowedTransitions: $stateMachine->allowedTransitions($order->status),
            ),
        ]);
    }

    public function metrics(): JsonResponse
    {
        $delivered = Order::query()
            ->where('status', Order::STATUS_DELIVERED)
            ->whereNotNull('delivered_at')
            ->get(['created_at', 'delivered_at', 'total_mmk']);

        $deliveryHours = $delivered
            ->map(fn (Order $order) => $order->created_at->diffInMinutes($order->delivered_at) / 60)
            ->sort()
            ->values();

        $since = Carbon::now()->subDays(30);
        $refused = Order::query()->where('status', Order::STATUS_REFUSED)->where('created_at', '>=', $since)->count();
        $delivered30 = Order::query()->where('status', Order::STATUS_DELIVERED)->where('created_at', '>=', $since)->count();
        $denominator = $refused + $delivered30;

        return response()->json([
            'orders_today' => Order::query()->whereDate('created_at', Carbon::today())->count(),
            'orders_7d' => Order::query()->where('created_at', '>=', Carbon::now()->subDays(7))->count(),
            'orders_30d' => Order::query()->where('created_at', '>=', $since)->count(),
            'refusal_rate_30d' => $denominator === 0 ? null : round($refused / $denominator, 3),
            'refusal_reasons_30d' => Order::query()
                ->where('status', Order::STATUS_REFUSED)
                ->where('created_at', '>=', $since)
                ->selectRaw("coalesce(refusal_reason, 'unspecified') as reason, count(*) as total")
                ->groupBy('reason')
                ->orderByDesc('total')
                ->pluck('total', 'reason')
                ->map(fn ($total) => (int) $total),
            'median_delivery_hours' => $deliveryHours->isEmpty() ? null : round((float) $deliveryHours->median(), 2),
            'revenue_30d_mmk' => (int) Order::query()
                ->where('status', Order::STATUS_DELIVERED)
                ->where('created_at', '>=', $since)
                ->sum('total_mmk'),
            'status_counts' => $this->statusCounts(),
        ]);
    }

    /**
     * @return array<string, int>
     */
    private function statusCounts(): array
    {
        return Order::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($total) => (int) $total)
            ->all();
    }

    /**
     * @param  array<int, string>  $allowedTransitions
     * @return array<string, mixed>
     */
    private function present(
        Order $order,
        bool $full = false,
        array $allowedTransitions = [],
    ): array {
        $itemsCount = $order->items_count
            ?? ($order->relationLoaded('items') ? $order->items->count() : 0);

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'placed_via' => $order->placed_via,
            'subtotal_mmk' => $order->subtotal_mmk,
            'delivery_fee_mmk' => $order->delivery_fee_mmk,
            'discount_mmk' => $order->discount_mmk,
            'total_mmk' => $order->total_mmk,
            'note' => $order->note,
            'customer' => [
                'name' => $order->customer?->name,
                'phone' => $full
                    ? $order->customer?->phone
                    : $this->maskPhone((string) $order->customer?->phone),
            ],
            'township' => $order->township ? [
                'name_mm' => $order->township->name_mm,
                'name_en' => $order->township->name_en,
                'region' => $order->township->region,
            ] : null,
            'address_line' => $order->address_line,
            'landmark' => $order->landmark,
            'items_count' => $itemsCount,
            'created_at' => $order->created_at?->toIso8601String(),
            'items' => $full ? $order->items->map(fn ($item) => [
                'name_mm' => $item->product_name_mm,
                'name_en' => $item->product_name_en,
                'size' => $item->size,
                'color' => $item->color,
                'qty' => $item->qty,
                'unit_price_mmk' => $item->unit_price_mmk,
                'line_total_mmk' => $item->line_total_mmk,
            ])->values() : [],
            'events' => $full ? $order->events->map(fn ($event) => [
                'from' => $event->from_status,
                'to' => $event->to_status,
                'actor' => $event->actor,
                'reason' => $event->reason,
                'at' => $event->created_at?->toIso8601String(),
            ])->values() : [],
            'shipment' => $full && $order->shipment ? [
                'carrier' => $order->shipment->carrier,
                'tracking_number' => $order->shipment->tracking_number,
                'cod_amount_mmk' => $order->shipment->cod_amount_mmk,
                'dispatched_at' => $order->shipment->dispatched_at?->toIso8601String(),
                'delivered_at' => $order->shipment->delivered_at?->toIso8601String(),
            ] : null,
            'refusal_reason' => $order->refusal_reason,
            'cancel_reason' => $order->cancel_reason,
            'allowed_transitions' => $full ? $allowedTransitions : [],
        ];
    }

    private function maskPhone(string $phone): string
    {
        return strlen($phone) > 4
            ? substr($phone, 0, 4).str_repeat('*', max(0, strlen($phone) - 6)).substr($phone, -2)
            : $phone;
    }
}
