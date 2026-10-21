<?php

use App\Http\Controllers\AdminController;
use App\Http\Middleware\EnsureAdminPassword;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/admin/orders');

Route::middleware(EnsureAdminPassword::class)->prefix('admin')->group(function () {
    Route::get('/orders', [AdminController::class, 'index'])->name('admin.orders.index');
    Route::get('/orders/{order}', [AdminController::class, 'show'])->name('admin.orders.show');
    Route::post('/orders/{order}/status', [AdminController::class, 'updateStatus'])->name('admin.orders.status');
    Route::post('/orders/{order}/shipment', [AdminController::class, 'updateShipment'])->name('admin.orders.shipment');
    Route::get('/metrics', [AdminController::class, 'metrics'])->name('admin.metrics');
});
