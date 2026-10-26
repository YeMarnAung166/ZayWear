<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Serves successful public GET responses from the cache for a short TTL.
 *
 * The database lives in Tokyo and the app runs in Singapore, so every round
 * trip costs hundreds of milliseconds. Catalogue reads change rarely, so they
 * are cached and refreshed on a short interval instead of hitting Postgres on
 * every page view.
 */
class CacheApiResponse
{
    public function handle(Request $request, Closure $next, int $seconds = 120): Response
    {
        // A settings save bumps the version, invalidating every cached public
        // response without flushing unrelated cache entries.
        $version = (int) Cache::get('api-response:version', 1);
        $key = "api-response:{$version}:".sha1($request->fullUrl());

        $cached = Cache::get($key);

        if (is_array($cached)) {
            return response($cached['body'], $cached['status'], $cached['headers'])
                ->header('X-Api-Cache', 'HIT');
        }

        $response = $next($request);

        if ($response->getStatusCode() !== Response::HTTP_OK) {
            return $response;
        }

        Cache::put($key, [
            'body' => $response->getContent(),
            'status' => $response->getStatusCode(),
            'headers' => ['Content-Type' => $response->headers->get('Content-Type', 'application/json')],
        ], $seconds);

        return $response->header('X-Api-Cache', 'MISS');
    }
}
