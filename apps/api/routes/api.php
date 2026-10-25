<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\TelegramController;
use App\Http\Controllers\Api\TownshipController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Middleware\EnsureAdminToken;
use App\Http\Middleware\EnsureCustomerToken;
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

Route::prefix('auth')->group(function () {
    Route::post('/telegram/start', [AuthController::class, 'telegramStart'])->middleware('throttle:login');
    Route::get('/telegram/poll/{nonce}', [AuthController::class, 'telegramPoll'])->middleware('throttle:login');
    Route::post('/otp/request', [AuthController::class, 'otpRequest'])->middleware('throttle:otp');
    Route::post('/otp/verify', [AuthController::class, 'otpVerify'])->middleware('throttle:otp-verify');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware([EnsureCustomerToken::class, 'throttle:login']);
});

Route::post('/orders/lookup', [AccountController::class, 'lookup'])->middleware('throttle:lookup');

Route::middleware([EnsureCustomerToken::class, 'throttle:api'])->prefix('me')->group(function () {
    Route::get('/', [AuthController::class, 'me']);
    Route::get('/orders', [AccountController::class, 'orders']);
    Route::get('/orders/{orderNumber}', [AccountController::class, 'order']);
    Route::post('/orders/{orderNumber}/reorder', [AccountController::class, 'reorder']);
    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::get('/wishlist/ids', [WishlistController::class, 'ids']);
    Route::post('/wishlist', [WishlistController::class, 'store']);
    Route::delete('/wishlist/{product}', [WishlistController::class, 'destroy']);
    Route::get('/addresses', [AccountController::class, 'addresses']);
    Route::post('/addresses', [AccountController::class, 'storeAddress']);
    Route::patch('/addresses/{address}', [AccountController::class, 'updateAddress']);
    Route::delete('/addresses/{address}', [AccountController::class, 'deleteAddress']);
});

Route::middleware([EnsureAdminToken::class, 'throttle:admin'])->prefix('admin')->group(function () {
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::get('/orders/{id}', [AdminOrderController::class, 'show']);
    Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
    Route::post('/orders/{id}/shipment', [AdminOrderController::class, 'shipment']);
    Route::get('/metrics', [AdminOrderController::class, 'metrics']);
});
