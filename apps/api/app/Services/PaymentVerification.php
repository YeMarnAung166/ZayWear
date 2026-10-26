<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentProof;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Manual prepaid-payment verification shared by the web admin and Telegram.
 *
 * Payment and order status stay separate, except that verifying a pending
 * order also confirms it: the customer has paid and the order is real.
 */
class PaymentVerification
{
    public function __construct(
        private readonly OrderStateMachine $stateMachine,
        private readonly PaymentMethods $methods,
    ) {}

    public function markPaid(
        Order $order,
        ?string $reference = null,
        ?string $note = null,
        ?int $proofId = null,
        string $actor = 'admin',
    ): Order {
        $this->assertPrepaid($order);
        $this->assertOpen($order);

        if ($order->payment_status === Order::PAYMENT_PAID) {
            throw ValidationException::withMessages([
                'payment' => ['This payment is already marked as received.'],
            ]);
        }

        return DB::transaction(function () use ($order, $reference, $note, $proofId, $actor): Order {
            /** @var Order $locked */
            $locked = Order::query()->lockForUpdate()->findOrFail($order->id);

            $payment = $locked->payments()
                ->where('status', 'pending')
                ->latest('id')
                ->first();

            if (! $payment) {
                $payment = $locked->payments()->create([
                    'provider' => $locked->payment_method,
                    'amount_mmk' => $locked->total_mmk,
                    'status' => 'pending',
                ]);
            }

            $reference = $reference !== null ? trim($reference) : null;
            $reference = $reference === '' ? null : $reference;

            if ($reference !== null) {
                $duplicate = Payment::query()
                    ->where('provider_ref', $reference)
                    ->whereKeyNot($payment->id)
                    ->exists();

                if ($duplicate) {
                    throw ValidationException::withMessages([
                        'reference' => ['This transaction reference is already used on another order.'],
                    ]);
                }
            }

            $payload = $payment->raw_payload ?? [];
            $payload['verification'] = [
                'verified_by' => $actor,
                'verified_at' => Carbon::now()->toIso8601String(),
                'note' => $note !== null && trim($note) !== '' ? trim($note) : null,
            ];

            $payment->update([
                'status' => 'paid',
                'paid_at' => Carbon::now(),
                'provider_ref' => $reference ?? $payment->provider_ref,
                'raw_payload' => $payload,
            ]);

            $locked->payment_status = Order::PAYMENT_PAID;
            $locked->save();

            $proofs = $locked->paymentProofs()->where('status', PaymentProof::STATUS_PENDING);

            if ($proofId !== null) {
                $proof = (clone $proofs)->whereKey($proofId)->first();

                if (! $proof) {
                    throw ValidationException::withMessages([
                        'proof_id' => ['That receipt does not belong to this order.'],
                    ]);
                }
            }

            $proofs->update([
                'status' => PaymentProof::STATUS_APPROVED,
                'reviewed_by' => $actor,
                'reviewed_at' => Carbon::now(),
            ]);

            if ($locked->status === Order::STATUS_PENDING) {
                $this->stateMachine->transition(
                    $locked,
                    Order::STATUS_CONFIRMED,
                    $actor,
                    'Payment verified',
                );
            }

            return $locked->fresh();
        });
    }

    public function rejectProof(
        Order $order,
        int $proofId,
        string $reason,
        string $actor = 'admin',
    ): PaymentProof {
        $this->assertPrepaid($order);
        $this->assertOpen($order);

        if ($order->payment_status === Order::PAYMENT_PAID) {
            throw ValidationException::withMessages([
                'payment' => ['This payment is already marked as received.'],
            ]);
        }

        $proof = $order->paymentProofs()->whereKey($proofId)->first();

        if (! $proof) {
            throw ValidationException::withMessages([
                'proof_id' => ['That receipt does not belong to this order.'],
            ]);
        }

        if (! $proof->isPending()) {
            throw ValidationException::withMessages([
                'proof_id' => ['Only a pending receipt can be rejected.'],
            ]);
        }

        $reason = trim($reason);

        if ($reason === '') {
            throw ValidationException::withMessages([
                'reason' => ['Tell the customer why the receipt was rejected.'],
            ]);
        }

        $proof->update([
            'status' => PaymentProof::STATUS_REJECTED,
            'review_note' => $reason,
            'reviewed_by' => $actor,
            'reviewed_at' => Carbon::now(),
        ]);

        return $proof->fresh();
    }

    private function assertPrepaid(Order $order): void
    {
        if (! $this->methods->isPrepaid($order->payment_method)) {
            throw ValidationException::withMessages([
                'payment' => ['Only prepaid orders can be verified manually.'],
            ]);
        }
    }

    private function assertOpen(Order $order): void
    {
        if (in_array($order->status, [
            Order::STATUS_CANCELLED,
            Order::STATUS_REFUSED,
            Order::STATUS_RETURNED,
        ], true)) {
            throw ValidationException::withMessages([
                'payment' => ['This order is closed and cannot be marked paid.'],
            ]);
        }
    }
}
