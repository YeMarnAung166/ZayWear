<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderEvent;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Order lifecycle. See ARCHITECTURE.md §3.1.
 * Any transition outside the matrix is rejected with a 422.
 */
class OrderStateMachine
{
    /** @var array<string, array<int, string>> */
    private const TRANSITIONS = [
        Order::STATUS_PENDING => [Order::STATUS_CONFIRMED, Order::STATUS_CANCELLED],
        Order::STATUS_CONFIRMED => [Order::STATUS_PACKED, Order::STATUS_CANCELLED],
        Order::STATUS_PACKED => [Order::STATUS_SHIPPED, Order::STATUS_CANCELLED],
        Order::STATUS_SHIPPED => [Order::STATUS_DELIVERED, Order::STATUS_REFUSED],
        Order::STATUS_DELIVERED => [Order::STATUS_RETURNED],
        Order::STATUS_REFUSED => [Order::STATUS_RETURNED],
        Order::STATUS_CANCELLED => [],
        Order::STATUS_RETURNED => [],
    ];

    /** @var array<string, string> */
    private const TIMESTAMPS = [
        Order::STATUS_CONFIRMED => 'confirmed_at',
        Order::STATUS_PACKED => 'packed_at',
        Order::STATUS_SHIPPED => 'shipped_at',
        Order::STATUS_DELIVERED => 'delivered_at',
        Order::STATUS_REFUSED => 'refused_at',
        Order::STATUS_RETURNED => 'returned_at',
        Order::STATUS_CANCELLED => 'cancelled_at',
    ];

    public function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    public function transition(
        Order $order,
        string $to,
        string $actor = 'system',
        ?string $reason = null,
        ?string $refusalReason = null,
    ): Order {
        $from = $order->status;

        if (! $this->canTransition($from, $to)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot move order from {$from} to {$to}."],
            ]);
        }

        $order->status = $to;

        if (isset(self::TIMESTAMPS[$to])) {
            $order->{self::TIMESTAMPS[$to]} = Carbon::now();
        }

        if ($to === Order::STATUS_REFUSED && $refusalReason !== null) {
            $order->refusal_reason = $refusalReason;
        }

        if ($to === Order::STATUS_CANCELLED && $reason !== null) {
            $order->cancel_reason = $reason;
        }

        // COD is collected at the door: delivery settles payment in the same transaction.
        if ($to === Order::STATUS_DELIVERED && $order->payment_method === 'cod') {
            $order->payment_status = Order::PAYMENT_PAID;
        }

        if ($to === Order::STATUS_RETURNED && $order->payment_method !== 'cod') {
            $order->payment_status = Order::PAYMENT_REFUNDED;
        }

        $order->save();

        OrderEvent::query()->create([
            'order_id' => $order->id,
            'from_status' => $from,
            'to_status' => $to,
            'actor' => $actor,
            'reason' => $refusalReason ?? $reason,
            'created_at' => Carbon::now(),
        ]);

        return $order;
    }
}
