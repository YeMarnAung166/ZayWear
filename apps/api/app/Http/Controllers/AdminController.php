<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderStateMachine;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AdminController extends Controller
{
    public function index(Request $request): View
    {
        $status = $request->string('status')->toString();

        $orders = Order::query()
            ->with(['customer', 'township'])
            ->when($status !== '', fn ($q) => $q->where('status', $status))
            ->withCount('items')
            ->latest('id')
            ->paginate(50)
            ->withQueryString();

        return view('admin.index', [
            'orders' => $orders,
            'status' => $status,
            'counts' => Order::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function show(Order $order): View
    {
        $order->load(['customer', 'township', 'items', 'events', 'shipment', 'payments']);

        return view('admin.show', [
            'order' => $order,
            'transitions' => [
                Order::STATUS_PENDING => [Order::STATUS_CONFIRMED, Order::STATUS_CANCELLED],
                Order::STATUS_CONFIRMED => [Order::STATUS_PACKED, Order::STATUS_CANCELLED],
                Order::STATUS_PACKED => [Order::STATUS_SHIPPED, Order::STATUS_CANCELLED],
                Order::STATUS_SHIPPED => [Order::STATUS_DELIVERED, Order::STATUS_REFUSED],
                Order::STATUS_DELIVERED => [Order::STATUS_RETURNED],
                Order::STATUS_REFUSED => [Order::STATUS_RETURNED],
            ][$order->status] ?? [],
        ]);
    }

    public function updateStatus(Request $request, Order $order, OrderStateMachine $stateMachine): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string'],
            'refusal_reason' => ['nullable', 'string', 'in:wrong_size,too_expensive,did_not_order,unreachable,changed_mind,other'],
        ]);

        try {
            $stateMachine->transition(
                $order,
                $validated['status'],
                'admin',
                null,
                $validated['refusal_reason'] ?? null,
            );
        } catch (ValidationException $exception) {
            return back()->withErrors($exception->errors());
        }

        return back()->with('status_message', "Order moved to {$validated['status']}.");
    }

    public function updateShipment(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'carrier' => ['required', 'string', 'max:80'],
            'tracking_number' => ['nullable', 'string', 'max:80'],
        ]);

        $order->shipments()->updateOrCreate(
            ['order_id' => $order->id],
            [
                'carrier' => $validated['carrier'],
                'tracking_number' => $validated['tracking_number'] ?? null,
                'cod_amount_mmk' => $order->payment_method === 'cod' ? $order->total_mmk : 0,
                'dispatched_at' => $order->shipped_at ?? Carbon::now(),
            ],
        );

        return back()->with('status_message', 'Shipment saved.');
    }

    public function metrics(): View
    {
        $since = Carbon::now()->subDays(30);
        $refused = Order::query()->where('status', Order::STATUS_REFUSED)->where('created_at', '>=', $since)->count();
        $delivered = Order::query()->where('status', Order::STATUS_DELIVERED)->where('created_at', '>=', $since)->count();
        $denominator = $refused + $delivered;

        $durations = Order::query()
            ->whereNotNull('delivered_at')
            ->get(['created_at', 'delivered_at'])
            ->map(fn (Order $order) => $order->created_at->diffInMinutes($order->delivered_at) / 60)
            ->sort()
            ->values();

        return view('admin.metrics', [
            'ordersToday' => Order::query()->whereDate('created_at', Carbon::today())->count(),
            'orders7d' => Order::query()->where('created_at', '>=', Carbon::now()->subDays(7))->count(),
            'orders30d' => Order::query()->where('created_at', '>=', $since)->count(),
            'refusalRate' => $denominator === 0 ? null : round($refused / $denominator * 100, 1),
            'refusalReasons' => Order::query()
                ->where('status', Order::STATUS_REFUSED)
                ->where('created_at', '>=', $since)
                ->selectRaw("coalesce(refusal_reason, 'unspecified') as reason, count(*) as total")
                ->groupBy('reason')
                ->orderByDesc('total')
                ->pluck('total', 'reason')
                ->map(fn ($total) => (int) $total),
            'medianDelivery' => $durations->isEmpty() ? null : round((float) $durations->median(), 1),
            'revenue30d' => (int) Order::query()
                ->where('status', Order::STATUS_DELIVERED)
                ->where('created_at', '>=', $since)
                ->sum('total_mmk'),
            'counts' => Order::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }
}
