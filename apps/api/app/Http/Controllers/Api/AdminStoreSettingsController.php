<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AdminStoreSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->settings()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'free_delivery_threshold_mmk' => ['required', 'integer', 'min:0', 'max:10000000'],
            'return_window_days' => ['required', 'integer', 'min:1', 'max:30'],
            'support_telegram' => ['nullable', 'string', 'max:64'],
        ]);

        $supportTelegram = $this->normalizeTelegram((string) ($validated['support_telegram'] ?? ''));

        if ($supportTelegram !== '' && preg_match('/^[A-Za-z0-9_]{5,32}$/', $supportTelegram) !== 1) {
            throw ValidationException::withMessages([
                'support_telegram' => ['Enter a Telegram username (5-32 letters, numbers, or underscores).'],
            ]);
        }

        $values = [
            'free_delivery_threshold_mmk' => (int) $validated['free_delivery_threshold_mmk'],
            'return_window_days' => (int) $validated['return_window_days'],
            'support_telegram' => $supportTelegram,
        ];

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
     * @return array{free_delivery_threshold_mmk: int, return_window_days: int, support_telegram: string}
     */
    private function settings(): array
    {
        return [
            'free_delivery_threshold_mmk' => (int) Setting::get('free_delivery_threshold_mmk', 80000),
            'return_window_days' => (int) Setting::get('return_window_days', 7),
            'support_telegram' => (string) Setting::get('support_telegram', ''),
        ];
    }

    private function normalizeTelegram(string $handle): string
    {
        $handle = trim($handle);

        if ($handle === '') {
            return '';
        }

        $handle = preg_replace('#^(https?://)?t\.me/#i', '', $handle) ?? $handle;

        return ltrim(trim($handle), '@');
    }
}
