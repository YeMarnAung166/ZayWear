@extends('admin.layout')

@section('content')
    <h1 style="font-size: 20px;">Metrics</h1>

    <div class="card">
        <dl>
            <dt>Orders today</dt><dd>{{ $ordersToday }}</dd>
            <dt>Orders (7 days)</dt><dd>{{ $orders7d }}</dd>
            <dt>Orders (30 days)</dt><dd>{{ $orders30d }}</dd>
            <dt>Refusal rate (30d)</dt><dd>{{ $refusalRate === null ? '—' : $refusalRate.'%' }}</dd>
            <dt>Median delivery</dt><dd>{{ $medianDelivery === null ? '—' : $medianDelivery.' hours' }}</dd>
            <dt>Revenue (30d, delivered)</dt><dd>{{ number_format($revenue30d) }} MMK</dd>
        </dl>
    </div>

    <div class="card">
        <h2 style="font-size: 16px; margin-top: 0;">By status</h2>
        <table>
            <thead><tr><th>Status</th><th>Orders</th></tr></thead>
            <tbody>
            @foreach ($counts as $status => $count)
                <tr><td>{{ $status }}</td><td>{{ $count }}</td></tr>
            @endforeach
            </tbody>
        </table>
    </div>
@endsection
