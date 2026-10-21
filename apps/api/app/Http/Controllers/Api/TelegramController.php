<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Minimal bot webhook. The full 12-step order flow lands in M3 (see TELEGRAM.md).
 * Implemented here: /start, product deep link, /status, /help.
 */
class TelegramController extends Controller
{
    public function webhook(Request $request): JsonResponse
    {
        $secret = (string) env('TELEGRAM_WEBHOOK_SECRET', '');

        if ($secret !== '' && ! hash_equals($secret, (string) $request->header('X-Telegram-Bot-Api-Secret-Token'))) {
            return response()->json(['ok' => false], 401);
        }

        $chatId = $request->input('message.chat.id') ?? $request->input('callback_query.message.chat.id');
        $text = trim((string) ($request->input('message.text') ?? ''));

        if ($chatId === null) {
            return response()->json(['ok' => true]);
        }

        Log::info('telegram.webhook', ['chat_id' => $chatId, 'text' => $text]);

        $this->reply((int) $chatId, $this->handleText($text));

        return response()->json(['ok' => true]);
    }

    private function handleText(string $text): string
    {
        if (str_starts_with($text, '/start product_')) {
            $id = (int) substr($text, strlen('/start product_'));
            $product = Product::query()->active()->find($id);

            if (! $product) {
                return 'ဒီပစ္စည်း မရှိတော့ပါ။ /help ကို နှိပ်ပါ။';
            }

            return "{$product->name_mm} — ".number_format($product->base_price_mmk)." MMK\n"
                .'အရွယ်အစား ရွေးချယ်ရန် အောက်တွင် နှိပ်ပါ။ (M3 တွင် ဖွင့်မည်)';
        }

        if (str_starts_with($text, '/status')) {
            $number = trim(substr($text, strlen('/status')));
            $order = Order::query()->where('order_number', $number)->first();

            if (! $order) {
                return 'အော်ဒါနံပါတ် မတွေ့ပါ။ ဥပမာ — /status ZW-000123';
            }

            return "{$order->order_number}: {$order->status}\n".
                number_format((int) $order->total_mmk).' MMK · '.strtoupper($order->payment_method);
        }

        if (str_starts_with($text, '/start')) {
            return "ZayWear မှ ကြိုဆိုပါတယ်။\n"
                ."ပစ္စည်းကြည့်ရန် ဝဘ်ဆိုက်တွင် ရွေးချယ်ပြီး Telegram ခလုတ်ကို နှိပ်ပါ။\n"
                ."/status ZW-000123 — အော်ဒါ အခြေအနေ\n/help — အကူအညီ";
        }

        return 'အကူအညီလိုပါက /help ကို နှိပ်ပါ။';
    }

    private function reply(int $chatId, string $message): void
    {
        $token = (string) env('TELEGRAM_BOT_TOKEN', '');

        if ($token === '') {
            Log::info('telegram.reply.skipped', ['chat_id' => $chatId, 'message' => $message]);

            return;
        }

        Http::post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $message,
        ]);
    }
}
