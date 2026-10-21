<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('sku', 64)->unique();
            $table->string('size', 16);
            $table->string('color', 40);
            $table->char('color_hex', 7);
            $table->integer('stock_qty')->default(0);
            $table->integer('price_delta_mmk')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['product_id', 'size', 'color']);
            $table->index(['product_id', 'stock_qty']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
