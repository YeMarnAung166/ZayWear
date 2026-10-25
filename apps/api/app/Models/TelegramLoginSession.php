<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramLoginSession extends Model
{
    protected $fillable = [
        'nonce_hash', 'chat_id', 'status', 'customer_id', 'expires_at', 'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'chat_id' => 'integer',
            'expires_at' => 'datetime',
            'confirmed_at' => 'datetime',
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

    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed' && $this->customer_id !== null;
    }
}
