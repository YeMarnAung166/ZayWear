<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * HTTP Basic auth for the Blade admin, per ARCHITECTURE.md §11.
 * There is no user table in v1 — one shared password from the environment.
 */
class EnsureAdminPassword
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('shop.admin_password');
        $given = (string) $request->getPassword();

        if ($expected !== '' && $given !== '' && hash_equals($expected, $given)) {
            return $next($request);
        }

        return response('Admin authentication required.', 401, [
            'WWW-Authenticate' => 'Basic realm="ZayWear Admin"',
        ]);
    }
}
