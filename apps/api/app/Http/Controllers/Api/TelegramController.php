<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TelegramBot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramController extends Controller
{
    public function webhook(Request $request, TelegramBot $bot): JsonResponse
    {
        $secret = (string) config('shop.telegram_webhook_secret');

        if ($secret !== '' && ! hash_equals($secret, (string) $request->header('X-Telegram-Bot-Api-Secret-Token'))) {
            return response()->json(['ok' => false], 401);
        }

        $bot->handle($request->all());

        return response()->json(['ok' => true]);
    }
}
