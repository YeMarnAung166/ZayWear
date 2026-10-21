<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class ConfigController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'currency' => Setting::get('currency', 'MMK'),
            'free_delivery_threshold_mmk' => (int) Setting::get('free_delivery_threshold_mmk', 80000),
            'cod_enabled' => (bool) Setting::get('cod_enabled', true),
            'kbzpay_enabled' => (bool) Setting::get('kbzpay_enabled', false),
            'wave_enabled' => (bool) Setting::get('wave_enabled', false),
            'return_window_days' => (int) Setting::get('return_window_days', 7),
            'support_telegram' => Setting::get('support_telegram', ''),
            'telegram_bot' => config('shop.telegram_bot'),
        ]);
    }
}
