@extends('admin.layout')

@section('content')
    <p><a href="{{ route('admin.orders.index') }}">&larr; All orders</a></p>
    <h1 style="font-size: 20px;">{{ $order->order_number }}</h1>
    <p>
        <span class="badge">{{ $order->status }}</span>
        <span class="badge">{{ $order->payment_method }} / {{ $order->payment_status }}</span>
        <span class="badge">{{ $order->placed_via }}</span>
    </p>

    <div class="card">
        <dl>
            <dt>Customer</dt><dd>{{ $order->customer?->name }} — {{ $order->customer?->phone }}</dd>
            <dt>Township</dt><dd>{{ $order->township?->name_mm }} / {{ $order->township?->name_en }} ({{ $order->township?->region }})</dd>
            <dt>Address</dt><dd>{{ $order->address_line }}</dd>
            <dt>Landmark</dt><dd>{{ $order->landmark }}</dd>
            @if ($order->note)
                <dt>Note</dt><dd>{{ $order->note }}</dd>
            @endif
            <dt>Subtotal</dt><dd>{{ number_format($order->subtotal_mmk) }} MMK</dd>
            <dt>Delivery</dt><dd>{{ number_format($order->delivery_fee_mmk) }} MMK</dd>
            <dt>Total (COD)</dt><dd><strong>{{ number_format($order->total_mmk) }} MMK</strong></dd>
            @if ($order->refusal_reason)
                <dt>Refusal</dt><dd>{{ $order->refusal_reason }}</dd>
            @endif
        </dl>
    </div>

    <div class="card">
        <h2 style="font-size: 16px; margin-top: 0;">Items</h2>
        <table>
            <thead><tr><th>Product</th><th>Size</th><th>Color</th><th>Qty</th><th>Unit</th><th>Line</th></tr></thead>
            <tbody>
            @foreach ($order->items as $item)
                <tr>
                    <td>{{ $item->product_name_mm }}<br><small>{{ $item->product_name_en }}</small></td>
                    <td>{{ $item->size }}</td>
                    <td>{{ $item->color }}</td>
                    <td>{{ $item->qty }}</td>
                    <td>{{ number_format($item->unit_price_mmk) }}</td>
                    <td>{{ number_format($item->line_total_mmk) }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
    </div>

    @if (count($transitions))
        <div class="card">
            <h2 style="font-size: 16px; margin-top: 0;">Move order</h2>
            <form method="POST" action="{{ route('admin.orders.status', $order) }}" style="display: flex; gap: 8px; align-items: end;">
                @csrf
                <div>
                    <label for="status">Next status</label>
                    <select name="status" id="status">
                        @foreach ($transitions as $transition)
                            <option value="{{ $transition }}">{{ $transition }}</option>
                        @endforeach
                    </select>
                </div>
                <div>
                    <label for="refusal_reason">Refusal reason (if refused)</label>
                    <select name="refusal_reason" id="refusal_reason">
                        <option value="">—</option>
                        @foreach (['wrong_size','too_expensive','did_not_order','unreachable','changed_mind','other'] as $reason)
                            <option value="{{ $reason }}">{{ $reason }}</option>
                        @endforeach
                    </select>
                </div>
                <button type="submit">Save</button>
            </form>
        </div>
    @endif

    <div class="card">
        <h2 style="font-size: 16px; margin-top: 0;">Shipment</h2>
        <form method="POST" action="{{ route('admin.orders.shipment', $order) }}" style="display: flex; gap: 8px; align-items: end;">
            @csrf
            <div>
                <label for="carrier">Carrier</label>
                <input id="carrier" name="carrier" value="{{ $order->shipment?->carrier }}" required>
            </div>
            <div>
                <label for="tracking_number">Tracking number</label>
                <input id="tracking_number" name="tracking_number" value="{{ $order->shipment?->tracking_number }}">
            </div>
            <button type="submit">Save</button>
        </form>
    </div>

    <div class="card">
        <h2 style="font-size: 16px; margin-top: 0;">Timeline</h2>
        <table>
            <thead><tr><th>When</th><th>From</th><th>To</th><th>Actor</th><th>Reason</th></tr></thead>
            <tbody>
            @foreach ($order->events as $event)
                <tr>
                    <td>{{ $event->created_at?->format('d M H:i') }}</td>
                    <td>{{ $event->from_status ?? '—' }}</td>
                    <td>{{ $event->to_status }}</td>
                    <td>{{ $event->actor }}</td>
                    <td>{{ $event->reason }}</td>
                </tr>
            @endforeach
            </tbody>
        </table>
    </div>
@endsection
