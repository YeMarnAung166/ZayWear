<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerToken extends Model
{
    protected $fillable = ['customer_id', 'token_hash', 'expires_at', 'last_used_at'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_used_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
