<?php

namespace App\Providers;

use App\Services\TelegramClient;
use App\Services\TrackingToken;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(TrackingToken::class, fn () => TrackingToken::fromConfig());
        $this->app->bind(TelegramClient::class, fn () => TelegramClient::fromConfig());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Named limiters get isolated counters. Inline `throttle:60,1` rules all
        // share one key (IP + domain), so a burst of storefront reads could block
        // checkout — the storefront renders server-side, which multiplies calls.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(300)->by($request->ip()));

        RateLimiter::for('orders', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('tracking', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));

        // Basic-auth brute force protection for the Blade admin and admin JSON.
        RateLimiter::for('admin', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));
    }
}
