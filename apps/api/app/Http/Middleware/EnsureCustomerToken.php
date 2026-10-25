<?php

namespace App\Http\Middleware;

use App\Services\CustomerAuth;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCustomerToken
{
    public function __construct(private readonly CustomerAuth $auth) {}

    public function handle(Request $request, Closure $next): Response
    {
        $customer = $this->auth->authenticate($request->bearerToken());

        if (! $customer) {
            return response()->json(['message' => 'Unauthorized.'], 401);
        }

        $request->setUserResolver(fn () => $customer);
        $request->attributes->set('customer', $customer);

        return $next($request);
    }
}
