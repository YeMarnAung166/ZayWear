<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SizeChart extends Model
{
    protected $fillable = ['category_id', 'title_mm', 'title_en', 'rows'];

    protected function casts(): array
    {
        return ['rows' => 'array'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
