<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = [
        'category_id', 'slug', 'name_mm', 'name_en', 'description_mm', 'description_en',
        'fabric_care_mm', 'fabric_care_en', 'base_price_mmk', 'compare_at_price_mmk',
        'is_featured', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'base_price_mmk' => 'integer',
            'compare_at_price_mmk' => 'integer',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function inStockVariants(): HasMany
    {
        return $this->variants()->where('is_active', true)->where('stock_qty', '>', 0);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
