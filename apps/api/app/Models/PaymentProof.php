<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentProof extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const SOURCE_WEB = 'web';

    public const SOURCE_TELEGRAM = 'telegram';

    protected $fillable = [
        'order_id', 'payment_id', 'source', 'disk', 'path', 'original_name',
        'mime_type', 'size_bytes', 'status', 'review_note', 'reviewed_by',
        'reviewed_at', 'telegram_file_id', 'telegram_chat_id', 'telegram_message_id',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'reviewed_at' => 'datetime',
            'telegram_chat_id' => 'integer',
            'telegram_message_id' => 'integer',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
