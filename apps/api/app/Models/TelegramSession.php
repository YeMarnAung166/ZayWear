<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TelegramSession extends Model
{
    protected $fillable = ['chat_id', 'state', 'expires_at'];

    protected function casts(): array
    {
        return [
            'state' => 'array',
            'expires_at' => 'datetime',
        ];
    }
}
