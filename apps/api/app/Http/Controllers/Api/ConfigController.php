<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\PaymentMethods;
use Illuminate\Http\JsonResponse;

class ConfigController extends Controller
{
    public function show(PaymentMethods $methods): JsonResponse
    {
        $kbzpay = $methods->account(PaymentMethods::KBZPAY);
        $wave = $methods->account(PaymentMethods::WAVE);

        return response()->json([
            'currency' => Setting::get('currency', 'MMK'),
            'free_delivery_threshold_mmk' => (int) Setting::get('free_delivery_threshold_mmk', 80000),
            'cod_enabled' => $methods->codEnabled(),
            // Effective availability: a prepaid method also needs its account
            // details, otherwise the customer cannot complete the transfer.
            'kbzpay_enabled' => $methods->availableMethod(PaymentMethods::KBZPAY),
            'wave_enabled' => $methods->availableMethod(PaymentMethods::WAVE),
            'kbzpay_account_name' => $kbzpay['account_name'] ?? '',
            'kbzpay_phone' => $kbzpay['phone'] ?? '',
            'wave_account_name' => $wave['account_name'] ?? '',
            'wave_phone' => $wave['phone'] ?? '',
            'return_window_days' => (int) Setting::get('return_window_days', 7),
            'support_telegram' => Setting::get('support_telegram', ''),
            'telegram_bot' => config('shop.telegram_bot'),
        ]);
    }
}
