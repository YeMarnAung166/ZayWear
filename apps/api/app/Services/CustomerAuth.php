<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerOtp;
use App\Models\CustomerToken;
use App\Models\TelegramLoginSession;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * Customer sessions, Telegram login handshakes and phone OTPs.
 *
 * Tokens are opaque bearer strings; only their SHA-256 hash is stored. OTPs are
 * bcrypt-hashed because six digits are cheap to brute-force offline.
 */
class CustomerAuth
{
    public function __construct(private readonly TelegramClient $telegram) {}

    public function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '959')) {
            $digits = '09'.substr($digits, 3);
        }

        return preg_match('/^09[0-9]{7,9}$/', $digits) === 1 ? $digits : null;
    }

    public function issueToken(Customer $customer): string
    {
        $plain = bin2hex(random_bytes(32));

        $customer->tokens()->create([
            'token_hash' => hash('sha256', $plain),
            'expires_at' => Carbon::now()->addDays((int) config('shop.customer_token_ttl_days', 30)),
        ]);

        $customer->forceFill(['last_login_at' => Carbon::now()])->save();

        return $plain;
    }

    public function authenticate(?string $plain): ?Customer
    {
        if ($plain === null || $plain === '') {
            return null;
        }

        $token = CustomerToken::query()
            ->with('customer')
            ->where('token_hash', hash('sha256', $plain))
            ->first();

        if (! $token || $token->isExpired() || ! $token->customer) {
            return null;
        }

        $token->forceFill(['last_used_at' => Carbon::now()])->save();

        return $token->customer;
    }

    public function revoke(?string $plain): void
    {
        if ($plain === null || $plain === '') {
            return;
        }

        CustomerToken::query()->where('token_hash', hash('sha256', $plain))->delete();
    }

    /**
     * @return array{nonce: string, deep_link: string, expires_at: string}
     */
    public function startTelegramLogin(): array
    {
        $nonce = bin2hex(random_bytes(16));
        $expires = Carbon::now()->addMinutes((int) config('shop.telegram_login_ttl_minutes', 15));

        TelegramLoginSession::query()->create([
            'nonce_hash' => hash('sha256', $nonce),
            'expires_at' => $expires,
        ]);

        return [
            'nonce' => $nonce,
            'deep_link' => 'https://t.me/'.config('shop.telegram_bot').'?start=login_'.$nonce,
            'expires_at' => $expires->toIso8601String(),
        ];
    }

    public function findLoginSession(string $nonce): ?TelegramLoginSession
    {
        return TelegramLoginSession::query()
            ->with('customer')
            ->where('nonce_hash', hash('sha256', $nonce))
            ->first();
    }

    public function markAwaitingOtp(TelegramLoginSession $session, Customer $customer): void
    {
        $session->forceFill([
            'status' => 'otp_sent',
            'customer_id' => $customer->id,
        ])->save();
    }

    public function maskPhone(string $phone): string
    {
        return strlen($phone) > 4
            ? substr($phone, 0, 4).str_repeat('*', max(0, strlen($phone) - 6)).substr($phone, -2)
            : $phone;
    }

    public function attachLoginToChat(string $nonce, int $chatId): ?TelegramLoginSession
    {
        $session = $this->findLoginSession($nonce);

        if (! $session || $session->isExpired() || $session->isConfirmed()) {
            return null;
        }

        $session->forceFill(['chat_id' => $chatId])->save();

        return $session;
    }

    public function pendingLoginForChat(int $chatId): ?TelegramLoginSession
    {
        return TelegramLoginSession::query()
            ->where('chat_id', $chatId)
            ->where('status', 'pending')
            ->where('expires_at', '>', Carbon::now())
            ->latest('id')
            ->first();
    }

    public function confirmLogin(TelegramLoginSession $session, Customer $customer): void
    {
        $session->forceFill([
            'status' => 'confirmed',
            'customer_id' => $customer->id,
            'confirmed_at' => Carbon::now(),
        ])->save();
    }

    public function linkChat(int $chatId, string $phone, ?string $name = null): ?Customer
    {
        $normalized = $this->normalizePhone($phone);

        if ($normalized === null) {
            return null;
        }

        $customer = Customer::query()->firstOrCreate(
            ['phone' => $normalized],
            ['name' => $name !== null && trim($name) !== '' ? trim($name) : 'ZayWear Customer'],
        );

        Customer::query()
            ->where('telegram_chat_id', (string) $chatId)
            ->where('id', '!=', $customer->id)
            ->update(['telegram_chat_id' => null]);

        $customer->forceFill([
            'telegram_chat_id' => (string) $chatId,
            'phone_verified_at' => Carbon::now(),
        ])->save();

        return $customer;
    }

    public function requestOtp(Customer $customer, ?string $ip = null): void
    {
        if (! $customer->telegram_chat_id) {
            return;
        }

        CustomerOtp::query()
            ->where('phone', $customer->phone)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => Carbon::now()]);

        $code = (string) random_int(100000, 999999);
        $ttl = (int) config('shop.otp_ttl_minutes', 10);

        $customer->otps()->create([
            'phone' => $customer->phone,
            'code_hash' => Hash::make($code),
            'expires_at' => Carbon::now()->addMinutes($ttl),
            'ip' => $ip,
        ]);

        $this->telegram->sendMessage(
            $customer->telegram_chat_id,
            "ZayWear အကောင့်ဝင်ရန် ကုဒ် — {$code}\n\n"
            ."ကုဒ်သည် မိနစ် {$ttl} အတွင်း သက်တမ်းကုန်ပါမည်။\n\n"
            ."ZayWear login code — expires in {$ttl} minutes.",
        );
    }

    public function verifyOtp(string $phone, string $code): ?Customer
    {
        $otp = CustomerOtp::query()
            ->with('customer')
            ->where('phone', $phone)
            ->whereNull('consumed_at')
            ->latest('id')
            ->first();

        $maxAttempts = (int) config('shop.otp_max_attempts', 5);

        if (! $otp || $otp->isExpired() || $otp->attempts >= $maxAttempts) {
            return null;
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            return null;
        }

        $otp->forceFill(['consumed_at' => Carbon::now()])->save();

        return $otp->customer;
    }
}
