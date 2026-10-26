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
        // Values are env-tunable so local verification can raise the order limit.
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute($this->limit('api', 300))->by($request->ip()));

        RateLimiter::for('orders', fn (Request $request) => Limit::perMinute($this->limit('orders', 10))->by($request->ip()));

        RateLimiter::for('tracking', fn (Request $request) => Limit::perMinute($this->limit('tracking', 60))->by($request->ip()));

        // Basic-auth brute force protection for the Blade admin and admin JSON.
        RateLimiter::for('admin', fn (Request $request) => Limit::perMinute($this->limit('admin', 30))->by($request->ip()));

        // The Next.js admin login is password-only, so keep guessing expensive.
        RateLimiter::for('admin-login', fn (Request $request) => [
            Limit::perMinute($this->limit('admin_login', 5))->by('admin-login:'.$request->ip()),
            Limit::perHour(20)->by('admin-login-hour:'.$request->ip()),
        ]);

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute($this->limit('login', 60))->by($request->ip()));

        // Phone OTPs are the expensive path: limit both the phone and the IP.
        RateLimiter::for('otp', fn (Request $request) => [
            Limit::perMinute($this->limit('otp', 3))->by('otp-phone:'.$request->input('phone')),
            Limit::perHour(10)->by('otp-ip:'.$request->ip()),
        ]);

        RateLimiter::for('otp-verify', fn (Request $request) => Limit::perMinute($this->limit('otp_verify', 10))->by($request->ip()));

        // Guest order lookup: order numbers are sequential, so keep guessing slow.
        RateLimiter::for('lookup', fn (Request $request) => Limit::perMinute($this->limit('lookup', 5))->by($request->ip()));
    }

    private function limit(string $name, int $default): int
    {
        return max(1, (int) config("shop.rate_limits.{$name}", $default));
    }
}
