<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Services\CustomerAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function telegramStart(CustomerAuth $auth): JsonResponse
    {
        return response()->json(['data' => $auth->startTelegramLogin()], 201);
    }

    public function telegramPoll(string $nonce, CustomerAuth $auth): JsonResponse
    {
        $session = $auth->findLoginSession($nonce);

        if (! $session || $session->isExpired()) {
            return response()->json(['message' => 'This login link has expired.'], 410);
        }

        if ($session->isConfirmed() && $session->customer) {
            return response()->json([
                'data' => [
                    'token' => $auth->issueToken($session->customer),
                    'customer' => new CustomerResource($session->customer),
                ],
            ]);
        }

        if ($session->status === 'otp_sent') {
            return response()->json([
                'status' => 'otp_required',
                'phone_masked' => $auth->maskPhone((string) $session->customer?->phone),
            ]);
        }

        return response()->json(['status' => 'pending'], 202);
    }

    public function otpRequest(Request $request, CustomerAuth $auth): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
        ]);

        $phone = $auth->normalizePhone($validated['phone']);

        if ($phone !== null) {
            $customer = Customer::query()->where('phone', $phone)->first();

            if ($customer) {
                $auth->requestOtp($customer, $request->ip());
            }
        }

        return response()->json([
            'message' => 'If this phone is linked to Telegram, a code has been sent.',
        ]);
    }

    public function otpVerify(Request $request, CustomerAuth $auth): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['required_without:nonce', 'string', 'max:20'],
            'nonce' => ['required_without:phone', 'string', 'max:64'],
            'code' => ['required', 'digits:6'],
        ]);

        $session = isset($validated['nonce']) ? $auth->findLoginSession($validated['nonce']) : null;

        if ($session && ($session->isExpired() || $session->status !== 'otp_sent')) {
            $session = null;
        }

        $phone = $session
            ? $session->customer?->phone
            : $auth->normalizePhone($validated['phone'] ?? '');

        $customer = $phone !== null ? $auth->verifyOtp($phone, $validated['code']) : null;

        if (! $customer) {
            return response()->json(['message' => 'The code is invalid or has expired.'], 422);
        }

        if ($session) {
            $auth->confirmLogin($session, $customer);
        }

        return response()->json([
            'data' => [
                'token' => $auth->issueToken($customer),
                'customer' => new CustomerResource($customer),
            ],
        ]);
    }

    public function logout(Request $request, CustomerAuth $auth): JsonResponse
    {
        $auth->revoke($request->bearerToken());

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var Customer $customer */
        $customer = $request->attributes->get('customer');
        $customer->load('addresses.township');

        return response()->json(['data' => new CustomerResource($customer)]);
    }
}
