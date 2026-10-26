<?php

namespace App\Services;

use App\Models\Order;
use App\Models\PaymentProof;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Stores receipts in a private Supabase Storage bucket.
 *
 * Railway's filesystem is ephemeral, so production refuses to fall back to it.
 * Local and test environments use the local disk and a short-lived signed route.
 */
class PaymentProofStorage
{
    public const DISK_SUPABASE = 'supabase';

    public const DISK_LOCAL = 'local';

    public function __construct(
        private readonly string $url,
        private readonly string $serviceKey,
        private readonly string $bucket,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            rtrim((string) config('services.supabase.url'), '/'),
            (string) config('services.supabase.service_role_key'),
            (string) config('services.supabase.storage_bucket', 'payment-proofs'),
        );
    }

    public function configured(): bool
    {
        return $this->url !== '' && $this->serviceKey !== '' && $this->bucket !== '';
    }

    /**
     * @return array{disk: string, path: string}
     */
    public function store(string $contents, string $mimeType, string $extension, Order $order): array
    {
        $path = 'orders/'.$order->order_number.'/'.Str::uuid().'.'.$extension;

        if ($this->configured()) {
            $response = Http::withToken($this->serviceKey)
                ->withHeaders(['x-upsert' => 'false'])
                ->withBody($contents, $mimeType)
                ->timeout(20)
                ->post("{$this->url}/storage/v1/object/{$this->bucket}/{$path}");

            if ($response->failed()) {
                Log::error('payment-proof.upload.failed', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);

                throw new RuntimeException('Could not store the payment receipt.');
            }

            return ['disk' => self::DISK_SUPABASE, 'path' => $path];
        }

        if (app()->environment('local', 'testing')) {
            Storage::disk('local')->put($path, $contents);

            return ['disk' => self::DISK_LOCAL, 'path' => $path];
        }

        throw new RuntimeException('Payment receipt storage is not configured.');
    }

    public function temporaryUrl(PaymentProof $proof): ?string
    {
        if ($proof->disk === self::DISK_SUPABASE) {
            if (! $this->configured()) {
                return null;
            }

            $response = Http::withToken($this->serviceKey)
                ->timeout(10)
                ->post("{$this->url}/storage/v1/object/sign/{$this->bucket}/{$proof->path}", [
                    'expiresIn' => 600,
                ]);

            if ($response->failed()) {
                Log::warning('payment-proof.sign.failed', [
                    'proof' => $proof->id,
                    'status' => $response->status(),
                ]);

                return null;
            }

            $signed = (string) $response->json('signedURL');

            return $signed === '' ? null : "{$this->url}/storage/v1{$signed}";
        }

        if ($proof->disk === self::DISK_LOCAL && app()->environment('local', 'testing')) {
            return URL::temporarySignedRoute(
                'payment-proofs.local',
                now()->addMinutes(10),
                ['proof' => $proof->id],
            );
        }

        return null;
    }

    public function delete(PaymentProof $proof): void
    {
        if ($proof->disk === self::DISK_SUPABASE && $this->configured()) {
            Http::withToken($this->serviceKey)
                ->timeout(10)
                ->delete("{$this->url}/storage/v1/object/{$this->bucket}/{$proof->path}");

            return;
        }

        if ($proof->disk === self::DISK_LOCAL) {
            Storage::disk('local')->delete($proof->path);
        }
    }
}
