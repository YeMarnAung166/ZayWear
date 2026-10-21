<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\OrderCreator;
use App\Services\TrackingToken;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    /**
     * @var array<int, string>
     */
    private const RELATIONS = ['customer', 'township', 'items', 'events', 'shipment'];

    public function store(
        StoreOrderRequest $request,
        OrderCreator $creator,
        TrackingToken $tokens,
    ): JsonResponse {
        $data = $request->validated();
        $idempotencyKey = $request->header('Idempotency-Key');

        if ($idempotencyKey) {
            $existing = Order::query()->where('idempotency_key', $idempotencyKey)->first();

            if ($existing) {
                return $this->respond($existing->load(self::RELATIONS), $tokens, 200);
            }
        }

        try {
            $order = $creator->create($data, $idempotencyKey, 'web');
        } catch (QueryException $exception) {
            // Concurrent duplicate submission: return the order that won the race.
            if ($idempotencyKey) {
                $existing = Order::query()->where('idempotency_key', $idempotencyKey)->first();

                if ($existing) {
                    return $this->respond($existing->load(self::RELATIONS), $tokens, 200);
                }
            }

            throw $exception;
        }

        return $this->respond($order->load(self::RELATIONS), $tokens, 201);
    }

    public function show(Request $request, string $orderNumber, string $token, TrackingToken $tokens): JsonResponse
    {
        $order = Order::query()
            ->where('order_number', $orderNumber)
            ->with(self::RELATIONS)
            ->firstOrFail();

        if (! $tokens->verify($order, $token)) {
            return response()->json([
                'message' => 'This tracking link is invalid or has expired.',
            ], 403);
        }

        $request->attributes->set('referrer_policy', 'no-referrer');

        return response()
            ->json(['data' => new OrderResource($order)])
            ->header('Referrer-Policy', 'no-referrer');
    }

    private function respond(Order $order, TrackingToken $tokens, int $status): JsonResponse
    {
        $token = $tokens->issue($order);

        return response()
            ->json([
                'data' => new OrderResource($order),
                'tracking' => [
                    'token' => $token,
                    'path' => "/order/{$order->order_number}/{$token}",
                ],
            ], $status)
            ->header('Referrer-Policy', 'no-referrer');
    }
}
