<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\ProductVariant;
use App\Models\Township;
use App\Services\CustomerAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CustomerAuthTest extends TestCase
{
    use RefreshDatabase;

    private const CHAT_ID = 777000111;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        config([
            'shop.telegram_bot_token' => 'test-token',
            'shop.telegram_webhook_secret' => 'test-secret',
            'shop.telegram_bot' => 'zaywear_test_bot',
            'shop.telegram_admin_chat_id' => '',
            'shop.frontend_url' => 'http://localhost:3000',
            'shop.rate_limits.orders' => 100,
        ]);

        Http::fake();
    }

    public function test_telegram_start_returns_a_deep_link_with_a_nonce(): void
    {
        $response = $this->postJson('/api/auth/telegram/start')->assertCreated();

        $nonce = (string) $response->json('data.nonce');

        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', $nonce);
        $this->assertSame(
            'https://t.me/zaywear_test_bot?start=login_'.$nonce,
            $response->json('data.deep_link'),
        );
    }

    public function test_first_telegram_login_links_the_chat_and_issues_a_token(): void
    {
        $nonce = $this->startLogin();

        $this->telegramMessage('/start login_'.$nonce);

        $this->assertStringContainsString('ဖုန်းနံပါတ်', $this->lastTelegramText());

        $this->telegramContact();

        $customer = Customer::query()->where('phone', '09771234567')->firstOrFail();

        $this->assertSame((string) self::CHAT_ID, $customer->telegram_chat_id);
        $this->assertNotNull($customer->phone_verified_at);

        $token = (string) $this->getJson('/api/auth/telegram/poll/'.$nonce)
            ->assertOk()
            ->json('data.token');

        $this->assertSame(64, strlen($token));

        $this->getJson('/api/me', $this->bearer($token))
            ->assertOk()
            ->assertJsonPath('data.phone', '09771234567')
            ->assertJsonPath('data.telegram_linked', true);
    }

    public function test_returning_telegram_user_receives_an_otp_and_finishes_login_with_it(): void
    {
        $customer = $this->linkedCustomer();

        $nonce = $this->startLogin();
        $this->telegramMessage('/start login_'.$nonce);

        $code = $this->otpCode();

        $this->getJson('/api/auth/telegram/poll/'.$nonce)
            ->assertOk()
            ->assertJsonPath('status', 'otp_required')
            ->assertJsonPath('phone_masked', '0977*****67');

        $token = (string) $this->postJson('/api/auth/otp/verify', [
            'nonce' => $nonce,
            'code' => $code,
        ])->assertOk()->json('data.token');

        $this->getJson('/api/me', $this->bearer($token))
            ->assertOk()
            ->assertJsonPath('data.id', $customer->id);
    }

    public function test_a_forwarded_contact_card_cannot_claim_someone_elses_phone(): void
    {
        $nonce = $this->startLogin();
        $this->telegramMessage('/start login_'.$nonce);

        $this->telegram([
            'message' => [
                'chat' => ['id' => self::CHAT_ID],
                'from' => ['id' => self::CHAT_ID],
                'contact' => [
                    'phone_number' => '+959771234567',
                    'first_name' => 'Victim',
                    'user_id' => 999000111,
                ],
            ],
        ]);

        $this->assertNull(Customer::query()->where('phone', '09771234567')->first());
        $this->assertStringContainsString('သင့်ကိုယ်ပိုင်', $this->lastTelegramText());

        $this->getJson('/api/auth/telegram/poll/'.$nonce)->assertStatus(202);
    }

    public function test_otp_request_does_not_reveal_whether_a_phone_is_registered(): void
    {
        $this->postJson('/api/auth/otp/request', ['phone' => '09111111111'])
            ->assertOk()
            ->assertJsonPath('message', 'If this phone is linked to Telegram, a code has been sent.');

        Http::assertNothingSent();
    }

    public function test_otp_is_locked_after_too_many_wrong_attempts(): void
    {
        $this->linkedCustomer();

        $this->postJson('/api/auth/otp/request', ['phone' => '09771234567'])->assertOk();

        $code = $this->otpCode();
        $wrong = $code === '000000' ? '111111' : '000000';

        foreach (range(1, 5) as $attempt) {
            $this->postJson('/api/auth/otp/verify', ['phone' => '09771234567', 'code' => $wrong])
                ->assertStatus(422);
        }

        $this->postJson('/api/auth/otp/verify', ['phone' => '09771234567', 'code' => $code])
            ->assertStatus(422);
    }

    public function test_otp_expires_after_the_configured_ttl(): void
    {
        $this->linkedCustomer();

        $this->postJson('/api/auth/otp/request', ['phone' => '09771234567'])->assertOk();

        $code = $this->otpCode();

        $this->travel(11)->minutes();

        $this->postJson('/api/auth/otp/verify', ['phone' => '09771234567', 'code' => $code])
            ->assertStatus(422);
    }

    public function test_expired_tokens_are_rejected(): void
    {
        $customer = $this->linkedCustomer();
        $token = app(CustomerAuth::class)->issueToken($customer);

        $this->travel(31)->days();

        $this->getJson('/api/me', $this->bearer($token))->assertUnauthorized();
    }

    public function test_logout_revokes_the_token(): void
    {
        $customer = $this->linkedCustomer();
        $token = app(CustomerAuth::class)->issueToken($customer);

        $this->postJson('/api/auth/logout', [], $this->bearer($token))->assertOk();

        $this->getJson('/api/me', $this->bearer($token))->assertUnauthorized();
    }

    public function test_account_orders_are_isolated_per_customer(): void
    {
        [$firstOrder] = $this->placeOrder('09771234567');
        $this->placeOrder('09771234568');

        $first = Customer::query()->where('phone', '09771234567')->firstOrFail();
        $second = Customer::query()->where('phone', '09771234568')->firstOrFail();

        $this->getJson('/api/me/orders', $this->bearer($this->tokenFor($first)))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_number', $firstOrder);

        $this->getJson('/api/me/orders', $this->bearer($this->tokenFor($second)))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissing(['order_number' => $firstOrder]);
    }

    public function test_reorder_caps_quantity_to_stock_and_reports_unavailable_lines(): void
    {
        [$orderNumber, $variant] = $this->placeOrder('09771234567', 3, 5);

        $customer = Customer::query()->where('phone', '09771234567')->firstOrFail();
        $token = $this->tokenFor($customer);

        $this->postJson("/api/me/orders/{$orderNumber}/reorder", [], $this->bearer($token))
            ->assertOk()
            ->assertJsonPath('data.lines.0.variantId', $variant->id)
            ->assertJsonPath('data.lines.0.qty', 2)
            ->assertJsonCount(0, 'data.unavailable');

        $variant->update(['stock_qty' => 0]);

        $this->postJson("/api/me/orders/{$orderNumber}/reorder", [], $this->bearer($token))
            ->assertOk()
            ->assertJsonCount(0, 'data.lines')
            ->assertJsonCount(1, 'data.unavailable');
    }

    public function test_an_address_cannot_be_edited_by_another_customer(): void
    {
        $owner = Customer::query()->create(['phone' => '09771234567', 'name' => 'Owner']);
        $other = Customer::query()->create(['phone' => '09771234568', 'name' => 'Other']);
        $township = $this->township();

        $address = $owner->addresses()->create([
            'label' => 'Home',
            'township_id' => $township->id,
            'address_line' => 'No 45, Inya Road',
            'landmark' => 'Near Bahan market',
            'is_default' => true,
        ]);

        $this->patchJson("/api/me/addresses/{$address->id}", [
            'township_id' => $township->id,
            'address_line' => 'Hijacked',
            'landmark' => 'Hijacked',
        ], $this->bearer($this->tokenFor($other)))->assertNotFound();

        $this->assertSame('No 45, Inya Road', $address->fresh()->address_line);
    }

    public function test_the_first_saved_address_becomes_the_default(): void
    {
        $customer = Customer::query()->create(['phone' => '09771234567', 'name' => 'Thiri']);
        $token = $this->tokenFor($customer);
        $township = $this->township();

        $this->postJson('/api/me/addresses', [
            'township_id' => $township->id,
            'address_line' => 'No 45, Inya Road',
            'landmark' => 'Near Bahan market',
        ], $this->bearer($token))
            ->assertCreated()
            ->assertJsonPath('data.is_default', true);

        $second = $this->postJson('/api/me/addresses', [
            'township_id' => $township->id,
            'address_line' => 'No 12, Pyay Road',
            'landmark' => 'Near Hledan centre',
            'is_default' => true,
        ], $this->bearer($token))->assertCreated();

        $this->assertSame(1, CustomerAddress::query()->where('customer_id', $customer->id)->where('is_default', true)->count());
        $this->assertTrue($second->json('data.is_default'));
    }

    public function test_guest_can_look_up_an_order_with_the_order_number_and_phone(): void
    {
        [$orderNumber] = $this->placeOrder('09771234567');

        $this->postJson('/api/orders/lookup', [
            'order_number' => $orderNumber,
            'phone' => '09771234567',
        ])
            ->assertOk()
            ->assertJsonPath('data.order_number', $orderNumber)
            ->assertJsonStructure(['data', 'tracking' => ['path']]);

        $this->postJson('/api/orders/lookup', [
            'order_number' => $orderNumber,
            'phone' => '09779999999',
        ])->assertNotFound();
    }

    private function startLogin(): string
    {
        return (string) $this->postJson('/api/auth/telegram/start')->assertCreated()->json('data.nonce');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function telegram(array $payload): void
    {
        $this->postJson('/api/telegram/webhook', $payload, [
            'X-Telegram-Bot-Api-Secret-Token' => 'test-secret',
        ])->assertOk();
    }

    private function telegramMessage(string $text): void
    {
        $this->telegram([
            'message' => [
                'chat' => ['id' => self::CHAT_ID],
                'from' => ['id' => self::CHAT_ID],
                'text' => $text,
            ],
        ]);
    }

    private function telegramContact(string $phone = '+959771234567'): void
    {
        $this->telegram([
            'message' => [
                'chat' => ['id' => self::CHAT_ID],
                'from' => ['id' => self::CHAT_ID],
                'contact' => [
                    'phone_number' => $phone,
                    'first_name' => 'Thiri',
                    'user_id' => self::CHAT_ID,
                ],
            ],
        ]);
    }

    private function lastTelegramText(): string
    {
        $recorded = Http::recorded();

        $this->assertNotEmpty($recorded, 'No Telegram request was sent.');

        return (string) ($recorded->last()[0]->data()['text'] ?? '');
    }

    private function otpCode(): string
    {
        foreach (Http::recorded() as [$request]) {
            $text = (string) ($request->data()['text'] ?? '');

            if (preg_match('/ကုဒ် — (\d{6})/u', $text, $matches)) {
                return $matches[1];
            }
        }

        $this->fail('No OTP message was sent to Telegram.');
    }

    private function linkedCustomer(): Customer
    {
        return Customer::query()->create([
            'phone' => '09771234567',
            'name' => 'Thiri Aung',
            'telegram_chat_id' => (string) self::CHAT_ID,
            'phone_verified_at' => now(),
        ]);
    }

    private function tokenFor(Customer $customer): string
    {
        return app(CustomerAuth::class)->issueToken($customer);
    }

    /**
     * @return array<string, string>
     */
    private function bearer(string $token): array
    {
        return ['Authorization' => 'Bearer '.$token];
    }

    /**
     * @return array{0: string, 1: ProductVariant}
     */
    private function placeOrder(string $phone, int $quantity = 1, int $stock = 5): array
    {
        $variant = ProductVariant::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->firstOrFail();

        $variant->update(['stock_qty' => $stock]);

        $response = $this->postJson('/api/orders', [
            'customer' => ['name' => 'Thiri Aung', 'phone' => $phone],
            'township_id' => $this->township()->id,
            'address_line' => 'No 45, Inya Road',
            'landmark' => 'Near Bahan market',
            'payment_method' => 'cod',
            'items' => [['variant_id' => $variant->id, 'qty' => $quantity]],
        ])->assertCreated();

        return [(string) $response->json('data.order_number'), $variant->fresh()];
    }

    private function township(): Township
    {
        return Township::query()->where('name_en', 'Bahan')->firstOrFail();
    }
}
