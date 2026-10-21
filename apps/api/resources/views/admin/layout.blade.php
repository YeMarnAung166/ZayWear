<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ZayWear Admin</title>
    <style>
        body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #f7f7f7; color: #111; }
        header { background: #1a1a1a; color: #fff; padding: 12px 24px; display: flex; gap: 24px; align-items: center; }
        header a { color: #fff; text-decoration: none; font-size: 14px; }
        main { padding: 24px; max-width: 1100px; margin: 0 auto; }
        table { width: 100%; border-collapse: collapse; background: #fff; }
        th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
        th { background: #fafafa; font-weight: 600; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #eee; }
        .flash { background: #e8f5e9; border: 1px solid #2e7d32; padding: 10px 12px; margin-bottom: 16px; font-size: 14px; }
        .errors { background: #fdecea; border: 1px solid #d32f2f; padding: 10px 12px; margin-bottom: 16px; font-size: 14px; }
        .card { background: #fff; border: 1px solid #e5e5e5; padding: 16px; margin-bottom: 16px; }
        label { display: block; font-size: 13px; margin-bottom: 4px; color: #444; }
        select, input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
        button { padding: 8px 14px; background: #1a1a1a; color: #fff; border: 0; border-radius: 4px; font-size: 14px; cursor: pointer; }
        dl { display: grid; grid-template-columns: 160px 1fr; gap: 6px 12px; font-size: 14px; }
        dt { color: #666; }
    </style>
</head>
<body>
<header>
    <strong>ZayWear Admin</strong>
    <a href="{{ route('admin.orders.index') }}">Orders</a>
    <a href="{{ route('admin.metrics') }}">Metrics</a>
</header>
<main>
    @if (session('status_message'))
        <div class="flash">{{ session('status_message') }}</div>
    @endif

    @if ($errors->any())
        <div class="errors">
            @foreach ($errors->all() as $error)
                <div>{{ $error }}</div>
            @endforeach
        </div>
    @endif

    @yield('content')
</main>
</body>
</html>
