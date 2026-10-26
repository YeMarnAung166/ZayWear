<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Exchanges the shared admin password for a short-lived browser session.
 *
 * The Next.js server owns the session cookie; this endpoint only validates the
 * password so the rate limiter and the secret stay in one place.
 */
class AdminSessionController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $expected = (string) config('shop.admin_password');

        if ($expected === '' || ! hash_equals($expected, $validated['password'])) {
            throw ValidationException::withMessages([
                'password' => ['The password is incorrect.'],
            ]);
        }

        return response()->json(['ok' => true]);
    }
}
