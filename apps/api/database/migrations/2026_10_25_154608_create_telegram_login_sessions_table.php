<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('telegram_login_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('nonce_hash', 64)->unique();
            $table->bigInteger('chat_id')->nullable()->index();
            $table->string('status', 20)->default('pending');
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('expires_at');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_login_sessions');
    }
};
