<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 16)->nullable()->unique();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->string('payment_status', 20)->default('unpaid');
            $table->string('payment_method', 20)->default('cod');
            $table->unsignedInteger('subtotal_mmk');
            $table->unsignedInteger('delivery_fee_mmk');
            $table->unsignedInteger('discount_mmk')->default(0);
            $table->unsignedInteger('total_mmk');
            $table->foreignId('township_id')->constrained()->restrictOnDelete();
            $table->text('address_line');
            $table->string('landmark', 255);
            $table->text('note')->nullable();
            $table->string('idempotency_key', 64)->nullable()->unique();
            $table->string('placed_via', 20)->default('web');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('packed_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('refused_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('refusal_reason', 30)->nullable();
            $table->string('cancel_reason', 255)->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('customer_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
