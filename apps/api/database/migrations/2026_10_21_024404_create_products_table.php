<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('slug', 140)->unique();
            $table->string('name_mm', 200);
            $table->string('name_en', 200);
            $table->text('description_mm')->nullable();
            $table->text('description_en')->nullable();
            $table->text('fabric_care_mm')->nullable();
            $table->text('fabric_care_en')->nullable();
            $table->unsignedInteger('base_price_mmk');
            $table->unsignedInteger('compare_at_price_mmk')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'is_featured']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
