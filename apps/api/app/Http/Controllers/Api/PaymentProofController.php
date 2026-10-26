<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Services\PaymentMethods;
use App\Services\PaymentProofStorage;
use App\Services\TrackingToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PaymentProofController extends Controller
{
    private const UPLOADABLE_STATUSES = [
        Order::STATUS_PENDING,
        Order::STATUS_CONFIRMED,
        Order::STATUS_PACKED,
    ];

    public function show(
        string $orderNumber,
        string $token,
        TrackingToken $tokens,
        PaymentMethods $methods,
    ): JsonResponse {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with(['payments', 'paymentProofs'])
            ->firstOrFail();

        if (! $tokens->verify($order, $token)) {
            return $this->invalidToken();
        }

        $prepaid = $methods->isPrepaid($order->payment_method);
        $account = $prepaid ? $methods->accountForOrder($order) : null;
        $latestRejected = $order->paymentProofs
            ->where('status', PaymentProof::STATUS_REJECTED)
            ->sortByDesc('id')
            ->first();

        return response()
            ->json([
                'data' => [
                    'method' => $order->payment_method,
                    'status' => $order->payment_status,
                    'total_mmk' => $order->total_mmk,
                    'is_prepaid' => $prepaid,
                    'instructions' => $account === null ? null : [
                        'account_name' => $account['account_name'],
                        'phone' => $account['phone'],
                        'reference' => $order->order_number,
                    ],
                    'telegram_url' => $this->telegramUrl($order),
                    'proofs' => $order->paymentProofs
                        ->sortByDesc('id')
                        ->values()
                        ->map(fn (PaymentProof $proof): array => [
                            'id' => $proof->id,
                            'status' => $proof->status,
                            'source' => $proof->source,
                            'created_at' => $proof->created_at?->toIso8601String(),
                        ]),
                    'rejection_reason' => $latestRejected?->review_note,
                    'can_upload' => $this->canUpload($order, $prepaid),
                ],
            ])
            ->header('Referrer-Policy', 'no-referrer');
    }

    public function store(
        Request $request,
        string $orderNumber,
        string $token,
        TrackingToken $tokens,
        PaymentMethods $methods,
        PaymentProofStorage $storage,
    ): JsonResponse {
        $order = Order::query()->where('order_number', $orderNumber)->firstOrFail();

        if (! $tokens->verify($order, $token)) {
            return $this->invalidToken();
        }

        if (! $methods->isPrepaid($order->payment_method)) {
            return $this->reject('This order does not need a prepayment receipt.');
        }

        if ($order->payment_status !== Order::PAYMENT_UNPAID) {
            return $this->reject('This order is already marked as paid.');
        }

        if (! in_array($order->status, self::UPLOADABLE_STATUSES, true)) {
            return $this->reject('This order can no longer accept a receipt.');
        }

        if ($order->paymentProofs()->count() >= 5) {
            return $this->reject('This order already has the maximum number of receipts. Please contact us.');
        }

        $validated = $request->validate([
            'receipt' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,pdf',
                'mimetypes:image/jpeg,image/png,application/pdf',
                'max:5120',
            ],
        ]);

        $file = $validated['receipt'];
        $mime = (string) $file->getMimeType();
        $extension = match ($mime) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'application/pdf' => 'pdf',
            default => 'bin',
        };

        try {
            $stored = $storage->store(
                (string) file_get_contents($file->getRealPath()),
                $mime,
                $extension,
                $order,
            );
        } catch (RuntimeException $exception) {
            Log::error('payment-proof.web.failed', [
                'order' => $order->order_number,
                'message' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Receipt upload is temporarily unavailable. Please send it to us on Telegram.',
            ], 503);
        }

        $proof = $order->paymentProofs()->create([
            'payment_id' => $order->payments()->latest('id')->first()?->id,
            'source' => PaymentProof::SOURCE_WEB,
            'disk' => $stored['disk'],
            'path' => $stored['path'],
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $mime,
            'size_bytes' => (int) $file->getSize(),
            'status' => PaymentProof::STATUS_PENDING,
        ]);

        return response()
            ->json([
                'data' => [
                    'id' => $proof->id,
                    'status' => $proof->status,
                    'created_at' => $proof->created_at?->toIso8601String(),
                ],
            ], 201)
            ->header('Referrer-Policy', 'no-referrer');
    }

    public function localFile(PaymentProof $proof): BinaryFileResponse
    {
        abort_unless(app()->environment('local', 'testing'), 404);
        abort_unless($proof->disk === PaymentProofStorage::DISK_LOCAL, 404);

        $path = Storage::disk('local')->path($proof->path);

        abort_unless(is_file($path), 404);

        $name = basename((string) ($proof->original_name ?: 'receipt'));

        return response()->file($path, [
            'Content-Type' => $proof->mime_type,
            'Content-Disposition' => 'inline; filename="'.addslashes($name).'"',
        ]);
    }

    private function canUpload(Order $order, bool $prepaid): bool
    {
        return $prepaid
            && $order->payment_status === Order::PAYMENT_UNPAID
            && in_array($order->status, self::UPLOADABLE_STATUSES, true);
    }

    private function telegramUrl(Order $order): ?string
    {
        $bot = trim((string) config('shop.telegram_bot'));

        return $bot === '' ? null : "https://t.me/{$bot}?start=pay_{$order->order_number}";
    }

    private function invalidToken(): JsonResponse
    {
        return response()->json([
            'message' => 'This tracking link is invalid or has expired.',
        ], 403);
    }

    private function reject(string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'errors' => ['receipt' => [$message]],
        ], 422);
    }
}
