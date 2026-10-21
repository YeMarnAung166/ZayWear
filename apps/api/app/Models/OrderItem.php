<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'variant_id', 'product_name_mm', 'product_name_en',
        'size', 'color', 'unit_price_mmk', 'qty', 'line_total_mmk',
    ];

    protected function casts(): array
    {
        return [
            'unit_price_mmk' => 'integer',
            'qty' => 'integer',
            'line_total_mmk' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
