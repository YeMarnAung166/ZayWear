<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Setting;
use Illuminate\Validation\ValidationException;

/**
 * Single source of truth for which payment methods are usable.
 *
 * A prepaid method needs both its flag and complete receiving-account details;
 * otherwise the storefront would offer a method the customer cannot pay.
 */
class PaymentMethods
{
    public const COD = 'cod';

    public const KBZPAY = 'kbzpay';

    public const WAVE = 'wave';

    /**
     * @return array<int, string>
     */
    public function available(): array
    {
        $methods = [];

        if ($this->codEnabled()) {
            $methods[] = self::COD;
        }

        foreach ([self::KBZPAY, self::WAVE] as $method) {
            if ($this->availableMethod($method)) {
                $methods[] = $method;
            }
        }

        return $methods;
    }

    public function codEnabled(): bool
    {
        return (bool) Setting::get('cod_enabled', true);
    }

    public function enabled(string $method): bool
    {
        return match ($method) {
            self::COD => $this->codEnabled(),
            self::KBZPAY => (bool) Setting::get('kbzpay_enabled', false),
            self::WAVE => (bool) Setting::get('wave_enabled', false),
            default => false,
        };
    }

    public function availableMethod(string $method): bool
    {
        if ($method === self::COD) {
            return $this->codEnabled();
        }

        if (! $this->isPrepaid($method) || ! $this->enabled($method)) {
            return false;
        }

        return $this->account($method) !== null;
    }

    /**
     * @return array{account_name: string, phone: string}|null
     */
    public function account(string $method): ?array
    {
        $prefix = match ($method) {
            self::KBZPAY => 'kbzpay',
            self::WAVE => 'wave',
            default => null,
        };

        if ($prefix === null) {
            return null;
        }

        $name = trim((string) Setting::get("{$prefix}_account_name", ''));
        $phone = trim((string) Setting::get("{$prefix}_phone", ''));

        if ($name === '' || $phone === '') {
            return null;
        }

        return ['account_name' => $name, 'phone' => $phone];
    }

    public function isPrepaid(string $method): bool
    {
        return in_array($method, [self::KBZPAY, self::WAVE], true);
    }

    /**
     * Use the account snapshot taken at order time so a later settings change
     * cannot rewrite the instructions the customer was given.
     *
     * @return array{account_name: string, phone: string}|null
     */
    public function accountForOrder(Order $order): ?array
    {
        $payment = $order->payments()->latest('id')->first();
        $snapshot = $payment?->raw_payload['instructions'] ?? null;

        if (is_array($snapshot)
            && (string) ($snapshot['account_name'] ?? '') !== ''
            && (string) ($snapshot['phone'] ?? '') !== '') {
            return [
                'account_name' => (string) $snapshot['account_name'],
                'phone' => (string) $snapshot['phone'],
            ];
        }

        return $this->account($order->payment_method);
    }

    /**
     * @return array{mm: string, en: string}
     */
    public function label(string $method): array
    {
        return match ($method) {
            self::KBZPAY => ['mm' => 'KBZPay', 'en' => 'KBZPay'],
            self::WAVE => ['mm' => 'Wave Money', 'en' => 'Wave Money'],
            default => ['mm' => 'ပစ္စည်းရောက်မှ ငွေချေ', 'en' => 'Cash on delivery'],
        };
    }

    public function assertAvailable(string $method): void
    {
        if (! $this->availableMethod($method)) {
            throw ValidationException::withMessages([
                'payment_method' => ['This payment method is not available right now.'],
            ]);
        }
    }
}
