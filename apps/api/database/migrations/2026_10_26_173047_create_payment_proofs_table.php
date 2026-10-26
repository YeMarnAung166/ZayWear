<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source', 20);
            $table->string('disk', 20);
            $table->string('path', 500);
            $table->string('original_name', 255)->nullable();
            $table->string('mime_type', 100);
            $table->unsignedInteger('size_bytes');
            $table->string('status', 20)->default('pending');
            $table->text('review_note')->nullable();
            $table->string('reviewed_by', 40)->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('telegram_file_id', 255)->nullable();
            $table->bigInteger('telegram_chat_id')->nullable();
            $table->bigInteger('telegram_message_id')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'status']);
            $table->unique(['order_id', 'telegram_file_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_proofs');
    }
};
