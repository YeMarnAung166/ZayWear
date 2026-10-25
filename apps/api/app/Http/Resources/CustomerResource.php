<?php

namespace App\Http\Resources;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Customer */
class CustomerResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'telegram_linked' => $this->telegram_chat_id !== null,
            'phone_verified_at' => $this->phone_verified_at?->toIso8601String(),
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'addresses' => CustomerAddressResource::collection($this->whenLoaded('addresses')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
