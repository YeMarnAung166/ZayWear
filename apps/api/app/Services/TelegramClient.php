<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin Telegram Bot API client. Failures are logged, never thrown: a broken
 * reply must not make the webhook retry and duplicate an order.
 */
class TelegramClient
{
    public function __construct(
        private readonly string $token,
        private readonly string $caBundle = '',
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            (string) config('shop.telegram_bot_token'),
            (string) config('shop.telegram_ca_bundle'),
        );
    }

    /**
     * @param  array<string, mixed>|null  $keyboard
     */
    public function sendMessage(int|string $chatId, string $text, ?array $keyboard = null): void
    {
        $payload = ['chat_id' => $chatId, 'text' => $text];

        if ($keyboard !== null) {
            $payload['reply_markup'] = $keyboard;
        }

        $this->call('sendMessage', $payload);
    }

    /**
     * @param  array<string, mixed>|null  $keyboard
     */
    public function editMessageText(int|string $chatId, int $messageId, string $text, ?array $keyboard = null): void
    {
        $payload = ['chat_id' => $chatId, 'message_id' => $messageId, 'text' => $text];

        if ($keyboard !== null) {
            $payload['reply_markup'] = $keyboard;
        }

        $this->call('editMessageText', $payload);
    }

    public function clearKeyboard(int|string $chatId, int $messageId): void
    {
        $this->call('editMessageReplyMarkup', [
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'reply_markup' => ['inline_keyboard' => []],
        ]);
    }

    public function answerCallbackQuery(string $callbackId, ?string $text = null): void
    {
        $payload = ['callback_query_id' => $callbackId];

        if ($text !== null) {
            $payload['text'] = $text;
        }

        $this->call('answerCallbackQuery', $payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function call(string $method, array $payload): void
    {
        if ($this->token === '') {
            Log::info("telegram.{$method}.skipped", ['chat_id' => $payload['chat_id'] ?? null]);

            return;
        }

        $request = Http::timeout(10);

        if ($this->caBundle !== '') {
            // Local dev behind a TLS-inspecting proxy: PHP's bundled CA store
            // does not include the proxy root, so an explicit bundle is needed.
            $request = $request->withOptions(['verify' => $this->caBundle]);
        }

        $response = $request->post("https://api.telegram.org/bot{$this->token}/{$method}", $payload);

        if ($response->failed()) {
            Log::warning("telegram.{$method}.failed", [
                'chat_id' => $payload['chat_id'] ?? null,
                'status' => $response->status(),
                'description' => $response->json('description'),
            ]);
        }
    }
}
