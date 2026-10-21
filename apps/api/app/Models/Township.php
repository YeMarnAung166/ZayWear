<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Township extends Model
{
    protected $fillable = ['region', 'name_mm', 'name_en', 'delivery_fee_mmk', 'is_active'];

    protected function casts(): array
    {
        return [
            'delivery_fee_mmk' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
