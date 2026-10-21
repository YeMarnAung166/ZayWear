<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('townships', function (Blueprint $table) {
            $table->id();
            $table->string('region', 80);
            $table->string('name_mm', 120);
            $table->string('name_en', 120);
            $table->unsignedInteger('delivery_fee_mmk');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active');
            $table->index('region');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('townships');
    }
};
