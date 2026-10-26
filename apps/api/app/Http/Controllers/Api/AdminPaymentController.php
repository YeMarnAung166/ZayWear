<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PaymentProof;
use App\Services\PaymentProofStorage;
use App\Services\PaymentVerification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminPaymentController extends Controller
{
    public function verify(
        Request $request,
        int $id,
        PaymentVerification $verification,
    ): JsonResponse {
        $validated = $request->validate([
            'reference' => ['nullable', 'string', 'max:128'],
            'note' => ['nullable', 'string', 'max:500'],
            'proof_id' => ['nullable', 'integer'],
        ]);

        $order = Order::query()->findOrFail($id);

        $order = $verification->markPaid(
            $order,
            $validated['reference'] ?? null,
            $validated['note'] ?? null,
            $validated['proof_id'] ?? null,
            'admin',
        );

        $payment = $order->payments()->where('status', 'paid')->latest('id')->first();

        return response()->json([
            'data' => [
                'id' => $order->id,
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'paid_at' => $payment?->paid_at?->toIso8601String(),
            ],
        ]);
    }

    public function reject(
        Request $request,
        int $id,
        PaymentVerification $verification,
    ): JsonResponse {
        $validated = $request->validate([
            'proof_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $order = Order::query()->findOrFail($id);

        $proof = $verification->rejectProof(
            $order,
            (int) $validated['proof_id'],
            (string) $validated['reason'],
            'admin',
        );

        return response()->json([
            'data' => [
                'id' => $proof->id,
                'status' => $proof->status,
                'review_note' => $proof->review_note,
            ],
        ]);
    }

    public function proofUrl(PaymentProof $proof, PaymentProofStorage $storage): JsonResponse
    {
        $url = $storage->temporaryUrl($proof);

        if ($url === null) {
            return response()->json(['message' => 'This receipt is not available.'], 404);
        }

        return response()->json([
            'url' => $url,
            'expires_at' => Carbon::now()->addMinutes(10)->toIso8601String(),
        ]);
    }
}
