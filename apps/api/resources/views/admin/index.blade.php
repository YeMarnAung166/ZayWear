@extends('admin.layout')

@section('content')
    <h1 style="font-size: 20px;">Orders</h1>

    <form method="GET" style="margin-bottom: 16px; display: flex; gap: 8px; align-items: end;">
        <div>
            <label for="status">Status</label>
            <select name="status" id="status">
                <option value="">All</option>
                @foreach (['pending','confirmed','packed','shipped','delivered','cancelled','refused','returned'] as $option)
                    <option value="{{ $option }}" @selected($status === $option)>
                        {{ $option }} ({{ $counts[$option] ?? 0 }})
                    </option>
                @endforeach
            </select>
        </div>
        <button type="submit">Filter</button>
    </form>

    <table>
        <thead>
        <tr>
            <th>Order</th>
            <th>Placed</th>
            <th>Customer</th>
            <th>Township</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Payment</th>
        </tr>
        </thead>
        <tbody>
        @forelse ($orders as $order)
            <tr>
                <td><a href="{{ route('admin.orders.show', $order) }}">{{ $order->order_number }}</a></td>
                <td>{{ $order->created_at?->format('d M H:i') }}</td>
                <td>
                    {{ $order->customer?->name }}<br>
                    <small>{{ $order->customer?->phone }}</small>
                </td>
                <td>{{ $order->township?->name_en }}</td>
                <td>{{ $order->items_count }}</td>
                <td>{{ number_format($order->total_mmk) }} MMK</td>
                <td><span class="badge">{{ $order->status }}</span></td>
                <td>{{ $order->payment_method }} / {{ $order->payment_status }}</td>
            </tr>
        @empty
            <tr><td colspan="8">No orders yet.</td></tr>
        @endforelse
        </tbody>
    </table>

    <div style="margin-top: 16px;">
        {{ $orders->links('pagination::simple-default') }}
    </div>

    <p style="margin-top: 12px; font-size: 12px; color: #666;">
        Refreshes every 30 seconds while this tab is visible.
    </p>

    <script>
        window.setInterval(function () {
            if (document.visibilityState === 'visible') {
                window.location.reload();
            }
        }, 30000);
    </script>
@endsection
