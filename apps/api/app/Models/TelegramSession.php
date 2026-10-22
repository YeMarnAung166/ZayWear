<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;

class TelegramSession extends Model
{
    use Prunable;

    protected $fillable = ['chat_id', 'state', 'expires_at'];

    protected function casts(): array
    {
        return [
            'state' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    public function prunable(): Builder
    {
        return static::query()->where('expires_at', '<', now()->subDay());
    }
}
