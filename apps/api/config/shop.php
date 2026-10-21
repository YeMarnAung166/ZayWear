<?php

return [
    'order_token_secret' => env('ORDER_TOKEN_SECRET', 'local-mock-secret-change-me'),
    'order_token_ttl_days' => (int) env('ORDER_TOKEN_TTL_DAYS', 90),

    'admin_token' => env('ADMIN_TOKEN', 'local-admin-token'),
    'admin_password' => env('ADMIN_PASSWORD', 'local-admin'),

    'telegram_bot' => env('TELEGRAM_BOT_USERNAME', 'zaywear_mock_bot'),
    'telegram_bot_token' => env('TELEGRAM_BOT_TOKEN', ''),
    'telegram_webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET', ''),
    'telegram_admin_chat_id' => env('TELEGRAM_ADMIN_CHAT_ID', ''),
    'telegram_ca_bundle' => env('TELEGRAM_CA_BUNDLE', ''),

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'image_base' => env('IMAGE_BASE', ''),
];
