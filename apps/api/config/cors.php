<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | The storefront posts orders straight from the browser, so the allowed
    | origins must list the deployed web origin. Set CORS_ALLOWED_ORIGINS to a
    | comma-separated list in production (for example the Vercel domain).
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PATCH', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'CORS_ALLOWED_ORIGINS',
            'http://localhost:3000,http://127.0.0.1:3000',
        )),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Accept',
        'Authorization',
        'Content-Type',
        'Idempotency-Key',
        'X-Requested-With',
    ],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
