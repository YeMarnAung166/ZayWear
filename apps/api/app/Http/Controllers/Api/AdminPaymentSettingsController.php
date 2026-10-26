<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminPaymentSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->settings()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cod_enabled' => ['required', 'boolean'],
            'kbzpay_enabled' => ['required', 'boolean'],
            'wave_enabled' => ['required', 'boolean'],
            'kbzpay_account_name' => ['nullable', 'string', 'max:120'],
            'kbzpay_phone' => ['nullable', 'string', 'max:30'],
            'wave_account_name' => ['nullable', 'string', 'max:120'],
            'wave_phone' => ['nullable', 'string', 'max:30'],
        ]);

        $values = [
            'cod_enabled' => (bool) $validated['cod_enabled'],
            'kbzpay_enabled' => (bool) $validated['kbzpay_enabled'],
            'wave_enabled' => (bool) $validated['wave_enabled'],
            'kbzpay_account_name' => trim((string) ($validated['kbzpay_account_name'] ?? '')),
            'kbzpay_phone' => $this->normalizePhone((string) ($validated['kbzpay_phone'] ?? '')),
            'wave_account_name' => trim((string) ($validated['wave_account_name'] ?? '')),
            'wave_phone' => $this->normalizePhone((string) ($validated['wave_phone'] ?? '')),
        ];

        $errors = [];
        $usable = $values['cod_enabled'] ? 1 : 0;

        foreach (['kbzpay', 'wave'] as $method) {
            if (! $values["{$method}_enabled"]) {
                continue;
            }

            if ($values["{$method}_account_name"] === '') {
                $errors["{$method}_account_name"] = ['Account name is required when this method is enabled.'];
            }

            if (! $this->validPhone($values["{$method}_phone"])) {
                $errors["{$method}_phone"] = ['Enter a valid 09 phone number.'];
            }

            if ($values["{$method}_account_name"] !== '' && $this->validPhone($values["{$method}_phone"])) {
                $usable++;
            }
        }

        if ($usable === 0) {
            $errors['cod_enabled'] = ['Enable at least one payment method.'];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        DB::transaction(function () use ($values): void {
            foreach ($values as $key => $value) {
                Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
            }
        });

        // Invalidate every public cached response, including /api/config.
        Cache::forever('api-response:version', (int) Cache::get('api-response:version', 1) + 1);

        return response()->json(['data' => $this->settings()]);
    }

    /**
     * @return array<string, mixed>
     */
    private function settings(): array
    {
        return [
            'cod_enabled' => (bool) Setting::get('cod_enabled', true),
            'kbzpay_enabled' => (bool) Setting::get('kbzpay_enabled', false),
            'wave_enabled' => (bool) Setting::get('wave_enabled', false),
            'kbzpay_account_name' => (string) Setting::get('kbzpay_account_name', ''),
            'kbzpay_phone' => (string) Setting::get('kbzpay_phone', ''),
            'wave_account_name' => (string) Setting::get('wave_account_name', ''),
            'wave_phone' => (string) Setting::get('wave_phone', ''),
        ];
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '959')) {
            $digits = '09'.substr($digits, 3);
        }

        return $digits;
    }

    private function validPhone(string $phone): bool
    {
        return preg_match('/^09[0-9]{7,9}$/', $phone) === 1;
    }
}
