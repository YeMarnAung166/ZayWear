<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class PublicOrderResource extends JsonResource
{
    /**
     * The shareable tracking link only answers "where is my parcel?". Address,
     * items, and payment stay out of the payload so a forwarded link cannot
     * leak them.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'order_number' => $this->order_number,
            'status' => $this->status,
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event) => [
                'to' => $event->to_status,
                'at' => $event->created_at?->toIso8601String(),
            ])->values()),
            'shipment' => $this->whenLoaded('shipment', fn () => $this->shipment ? [
                'carrier' => $this->shipment->carrier,
                'tracking_number' => $this->shipment->tracking_number,
            ] : null),
            'refusal_reason' => $this->refusal_reason,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
