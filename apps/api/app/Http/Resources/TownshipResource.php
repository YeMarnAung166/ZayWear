<?php

namespace App\Http\Resources;

use App\Models\Township;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Township */
class TownshipResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'region' => $this->region,
            'name_mm' => $this->name_mm,
            'name_en' => $this->name_en,
            'delivery_fee_mmk' => $this->delivery_fee_mmk,
        ];
    }
}
