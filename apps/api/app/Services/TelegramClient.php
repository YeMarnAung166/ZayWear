<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
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

    public function removeKeyboard(int|string $chatId, string $text): void
    {
        $this->sendMessage($chatId, $text, ['remove_keyboard' => true]);
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
     * @param  array<string, mixed>|null  $keyboard
     */
    public function sendPhoto(int|string $chatId, string $fileId, string $caption, ?array $keyboard = null): void
    {
        $payload = ['chat_id' => $chatId, 'photo' => $fileId, 'caption' => $caption];

        if ($keyboard !== null) {
            $payload['reply_markup'] = $keyboard;
        }

        $this->call('sendPhoto', $payload);
    }

    /**
     * @param  array<string, mixed>|null  $keyboard
     */
    public function sendDocument(int|string $chatId, string $fileId, string $caption, ?array $keyboard = null): void
    {
        $payload = ['chat_id' => $chatId, 'document' => $fileId, 'caption' => $caption];

        if ($keyboard !== null) {
            $payload['reply_markup'] = $keyboard;
        }

        $this->call('sendDocument', $payload);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getFile(string $fileId): ?array
    {
        if ($this->token === '') {
            Log::info('telegram.getFile.skipped', ['file_id' => $fileId]);

            return null;
        }

        $response = $this->http()->get(
            "https://api.telegram.org/bot{$this->token}/getFile",
            ['file_id' => $fileId],
        );

        if ($response->failed()) {
            Log::warning('telegram.getFile.failed', [
                'status' => $response->status(),
                'description' => $response->json('description'),
            ]);

            return null;
        }

        $result = $response->json('result');

        return is_array($result) ? $result : null;
    }

    public function downloadFile(string $filePath): ?string
    {
        if ($this->token === '') {
            return null;
        }

        $response = $this->http()
            ->timeout(20)
            ->get("https://api.telegram.org/file/bot{$this->token}/{$filePath}");

        if ($response->failed()) {
            Log::warning('telegram.downloadFile.failed', [
                'status' => $response->status(),
            ]);

            return null;
        }

        return $response->body();
    }

    private function http(): PendingRequest
    {
        $request = Http::timeout(10);

        if ($this->caBundle !== '') {
            // Local dev behind a TLS-inspecting proxy: PHP's bundled CA store
            // does not include the proxy root, so an explicit bundle is needed.
            $request = $request->withOptions(['verify' => $this->caBundle]);
        }

        return $request;
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

        $response = $this->http()->post("https://api.telegram.org/bot{$this->token}/{$method}", $payload);

        if ($response->failed()) {
            Log::warning("telegram.{$method}.failed", [
                'chat_id' => $payload['chat_id'] ?? null,
                'status' => $response->status(),
                'description' => $response->json('description'),
            ]);
        }
    }
}
