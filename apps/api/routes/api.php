<?php

use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\TelegramController;
use App\Http\Controllers\Api\TownshipController;
use App\Http\Middleware\EnsureAdminToken;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:api')->group(function () {
    Route::middleware('cache.api:120')->group(function () {
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/products', [CatalogController::class, 'index']);
        Route::get('/products/{slug}', [CatalogController::class, 'show']);
        Route::get('/products/{slug}/size-chart', [CatalogController::class, 'sizeChart']);
        Route::get('/townships', [TownshipController::class, 'index']);
        Route::get('/config', [ConfigController::class, 'show']);
    });

    Route::get('/orders/{orderNumber}/{token}', [OrderController::class, 'show'])
        ->middleware('throttle:tracking');
    Route::post('/telegram/webhook', [TelegramController::class, 'webhook']);
});

Route::post('/orders', [OrderController::class, 'store'])->middleware('throttle:orders');

Route::middleware([EnsureAdminToken::class, 'throttle:admin'])->prefix('admin')->group(function () {
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    Route::post('/orders/{id}/shipment', [AdminOrderController::class, 'shipment']);
    Route::get('/metrics', [AdminOrderController::class, 'metrics']);
});
