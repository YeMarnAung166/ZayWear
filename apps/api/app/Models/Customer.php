<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'phone', 'name', 'township_id', 'telegram_chat_id', 'phone_verified_at', 'last_login_at',
    ];

    protected function casts(): array
    {
        return [
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function township(): BelongsTo
    {
        return $this->belongsTo(Township::class);
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(CustomerToken::class);
    }

    public function wishlistItems(): HasMany
    {
        return $this->hasMany(WishlistItem::class);
    }

    public function otps(): HasMany
    {
        return $this->hasMany(CustomerOtp::class);
    }
}
