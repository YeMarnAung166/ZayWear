<?php

namespace App\Http\Resources;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Order */
class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'order_number' => $this->order_number,
            'status' => $this->status,
            'payment_status' => $this->payment_status,
            'payment_method' => $this->payment_method,
            'placed_via' => $this->placed_via,
            'subtotal_mmk' => $this->subtotal_mmk,
            'delivery_fee_mmk' => $this->delivery_fee_mmk,
            'discount_mmk' => $this->discount_mmk,
            'total_mmk' => $this->total_mmk,
            'township' => $this->whenLoaded('township', fn () => [
                'name_mm' => $this->township->name_mm,
                'name_en' => $this->township->name_en,
                'region' => $this->township->region,
            ]),
            'address_line' => $this->address_line,
            'landmark' => $this->landmark,
            'note' => $this->note,
            'customer' => $this->whenLoaded('customer', fn () => [
                'name' => $this->customer->name,
                'phone' => $this->maskedPhone(),
            ]),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'product_name_mm' => $item->product_name_mm,
                'product_name_en' => $item->product_name_en,
                'size' => $item->size,
                'color' => $item->color,
                'unit_price_mmk' => $item->unit_price_mmk,
                'qty' => $item->qty,
                'line_total_mmk' => $item->line_total_mmk,
            ])->values()),
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event) => [
                'from' => $event->from_status,
                'to' => $event->to_status,
                'actor' => $event->actor,
                'reason' => $event->reason,
                'at' => $event->created_at?->toIso8601String(),
            ])->values()),
            'shipment' => $this->whenLoaded('shipment', fn () => $this->shipment ? [
                'carrier' => $this->shipment->carrier,
                'tracking_number' => $this->shipment->tracking_number,
            ] : null),
            'refusal_reason' => $this->refusal_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'delivered_at' => $this->delivered_at?->toIso8601String(),
        ];
    }

    private function maskedPhone(): string
    {
        $phone = $this->customer->phone;

        return strlen($phone) > 4
            ? substr($phone, 0, 4).str_repeat('*', strlen($phone) - 6).substr($phone, -2)
            : $phone;
    }
}
