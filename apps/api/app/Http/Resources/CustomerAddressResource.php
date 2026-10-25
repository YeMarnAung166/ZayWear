<?php

namespace App\Http\Resources;

use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CustomerAddress */
class CustomerAddressResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'township' => $this->whenLoaded('township', fn () => [
                'id' => $this->township->id,
                'name_mm' => $this->township->name_mm,
                'name_en' => $this->township->name_en,
                'region' => $this->township->region,
                'delivery_fee_mmk' => $this->township->delivery_fee_mmk,
            ]),
            'address_line' => $this->address_line,
            'landmark' => $this->landmark,
            'is_default' => $this->is_default,
        ];
    }
}
