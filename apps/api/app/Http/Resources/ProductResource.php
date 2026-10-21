<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $variants = $this->whenLoaded('variants');
        $images = $this->whenLoaded('images');

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name_mm' => $this->name_mm,
            'name_en' => $this->name_en,
            'description_mm' => $this->description_mm,
            'description_en' => $this->description_en,
            'fabric_care_mm' => $this->fabric_care_mm,
            'fabric_care_en' => $this->fabric_care_en,
            'price_mmk' => $this->base_price_mmk,
            'compare_at_price_mmk' => $this->compare_at_price_mmk,
            'is_featured' => $this->is_featured,
            'category' => $this->whenLoaded('category', fn () => [
                'slug' => $this->category->slug,
                'name_mm' => $this->category->name_mm,
                'name_en' => $this->category->name_en,
            ]),
            'images' => $images ? $images->map(fn ($image) => [
                'path' => $image->path,
                'alt_mm' => $image->alt_mm,
                'alt_en' => $image->alt_en,
                'is_primary' => $image->is_primary,
            ])->values() : [],
            'variants' => $variants ? $variants->map(fn ($variant) => [
                'id' => $variant->id,
                'size' => $variant->size,
                'color' => $variant->color,
                'color_hex' => $variant->color_hex,
                'stock_qty' => $variant->stock_qty,
                'price_mmk' => $this->base_price_mmk + $variant->price_delta_mmk,
                'is_active' => $variant->is_active,
            ])->values() : [],
            'sizes' => $variants ? $variants->pluck('size')->unique()->values() : [],
            'colors' => $variants ? $variants
                ->unique('color')
                ->map(fn ($variant) => ['name' => $variant->color, 'hex' => $variant->color_hex])
                ->values() : [],
            'in_stock' => $variants ? $variants->contains(fn ($variant) => $variant->stock_qty > 0) : false,
        ];
    }
}
