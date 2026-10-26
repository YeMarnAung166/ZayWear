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

    'customer_token_ttl_days' => (int) env('CUSTOMER_TOKEN_TTL_DAYS', 30),
    'otp_ttl_minutes' => (int) env('OTP_TTL_MINUTES', 10),
    'otp_max_attempts' => (int) env('OTP_MAX_ATTEMPTS', 5),
    'telegram_login_ttl_minutes' => (int) env('TELEGRAM_LOGIN_TTL_MINUTES', 15),

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),
    'image_base' => env('IMAGE_BASE', ''),

    /*
    | Requests per minute per IP. Raise the order limit locally so a checkout
    | verification session does not trip the production spam guard.
    */
    'rate_limits' => [
        'api' => (int) env('API_RATE_LIMIT_PER_MINUTE', 300),
        'orders' => (int) env('ORDER_RATE_LIMIT_PER_MINUTE', 10),
        'tracking' => (int) env('TRACKING_RATE_LIMIT_PER_MINUTE', 60),
        'payment_proofs' => (int) env('PAYMENT_PROOF_RATE_LIMIT_PER_MINUTE', 5),
        'admin' => (int) env('ADMIN_RATE_LIMIT_PER_MINUTE', 30),
        'admin_login' => (int) env('ADMIN_LOGIN_RATE_LIMIT_PER_MINUTE', 5),
        'login' => (int) env('LOGIN_RATE_LIMIT_PER_MINUTE', 60),
        'otp' => (int) env('OTP_RATE_LIMIT_PER_MINUTE', 3),
        'otp_verify' => (int) env('OTP_VERIFY_RATE_LIMIT_PER_MINUTE', 10),
        'lookup' => (int) env('LOOKUP_RATE_LIMIT_PER_MINUTE', 5),
    ],
];
