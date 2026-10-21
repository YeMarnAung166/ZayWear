<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Carbon;

/**
 * Stateless tracking tokens. See ARCHITECTURE.md §5.
 *
 * token = base64url("ORDER_NUMBER.EXPIRES_AT") . "." . hmac_sha256(payload, secret)
 */
class TrackingToken
{
    public function __construct(private readonly string $secret) {}

    public static function fromConfig(): self
    {
        return new self((string) config('shop.order_token_secret'));
    }

    public function issue(Order $order, ?int $expiresAt = null): string
    {
        $expires = $expiresAt ?? Carbon::now()
            ->addDays((int) config('shop.order_token_ttl_days'))
            ->timestamp;

        $payload = $this->base64UrlEncode($order->order_number.'.'.$expires);

        return $payload.'.'.$this->sign($payload);
    }

    public function verify(Order $order, string $token): bool
    {
        $parts = explode('.', $token);

        if (count($parts) !== 2) {
            return false;
        }

        [$payload, $signature] = $parts;

        if (! hash_equals($this->sign($payload), $signature)) {
            return false;
        }

        $decoded = $this->base64UrlDecode($payload);

        if ($decoded === null) {
            return false;
        }

        $segments = explode('.', $decoded);

        if (count($segments) !== 2) {
            return false;
        }

        [$orderNumber, $expires] = $segments;

        if ($orderNumber !== $order->order_number) {
            return false;
        }

        return (int) $expires >= Carbon::now()->timestamp;
    }

    private function sign(string $payload): string
    {
        return $this->base64UrlEncode(hash_hmac('sha256', $payload, $this->secret, true));
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $value): ?string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }
}
