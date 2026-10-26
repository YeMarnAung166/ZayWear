<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentProof;
use App\Models\ProductVariant;
use App\Models\Setting;
use App\Models\Township;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        Cache::flush();
        Storage::fake('local');

        config([
            'shop.admin_token' => 'test-admin-token',
            'shop.admin_password' => 'test-admin-password',
            'shop.order_token_secret' => 'test-order-token-secret',
            'shop.order_token_ttl_days' => 90,
            'shop.free_delivery_threshold_mmk' => 80000,
            'shop.telegram_admin_chat_id' => '',
            'shop.telegram_bot' => 'zaywear_mock_bot',
            'shop.frontend_url' => 'http://localhost:3000',
        ]);
    }

    public function test_a_prepaid_method_is_hidden_until_its_receiving_account_is_complete(): void
    {
        Setting::query()->updateOrCreate(['key' => 'kbzpay_enabled'], ['value' => true]);

        $this->getJson('/api/config')
            ->assertOk()
            ->assertJsonPath('kbzpay_enabled', false);

        $this->postJson('/api/orders', $this->payload('kbzpay'))
            ->assertStatus(422)
            ->assertJsonValidationErrors('payment_method');

        $this->assertSame(0, Order::query()->count());

        $this->enablePrepaid('kbzpay');

        $this->getJson('/api/config')
            ->assertOk()
            ->assertJsonPath('kbzpay_enabled', true)
            ->assertJsonPath('kbzpay_account_name', 'ZayWear Store')
            ->assertJsonPath('kbzpay_phone', '09771234567');

        $this->postJson('/api/orders', $this->payload('kbzpay'))
            ->assertCreated()
            ->assertJsonPath('data.payment_method', 'kbzpay')
            ->assertJsonPath('data.payment_status', Order::PAYMENT_UNPAID);
    }

    public function test_a_prepaid_order_snapshots_the_receiving_account_at_checkout(): void
    {
        $this->enablePrepaid('kbzpay');

        $response = $this->postJson('/api/orders', $this->payload('kbzpay'))->assertCreated();
        $order = Order::query()->where('order_number', $response->json('data.order_number'))->firstOrFail();
        $payment = $order->payments()->latest('id')->firstOrFail();

        $this->assertSame('pending', $payment->status);
        $this->assertSame('ZayWear Store', $payment->raw_payload['instructions']['account_name']);
        $this->assertSame('09771234567', $payment->raw_payload['instructions']['phone']);
        $this->assertSame($order->order_number, $payment->raw_payload['reference']);

        // A later settings change must not rewrite the instructions the
        // customer already saw.
        Setting::query()->updateOrCreate(['key' => 'kbzpay_account_name'], ['value' => 'Another Shop']);
        Setting::query()->updateOrCreate(['key' => 'kbzpay_phone'], ['value' => '09999999999']);

        $this->getJson("/api/orders/{$order->order_number}/{$response->json('tracking.token')}/payment")
            ->assertOk()
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertJsonPath('data.method', 'kbzpay')
            ->assertJsonPath('data.is_prepaid', true)
            ->assertJsonPath('data.can_upload', true)
            ->assertJsonPath('data.instructions.account_name', 'ZayWear Store')
            ->assertJsonPath('data.instructions.phone', '09771234567')
            ->assertJsonPath('data.instructions.reference', $order->order_number)
            ->assertJsonPath('data.telegram_url', 'https://t.me/zaywear_mock_bot?start=pay_'.$order->order_number);
    }

    public function test_a_receipt_can_be_uploaded_and_verified_with_auto_confirmation(): void
    {
        $this->enablePrepaid('wave');

        $response = $this->postJson('/api/orders', $this->payload('wave'))->assertCreated();
        $order = Order::query()->where('order_number', $response->json('data.order_number'))->firstOrFail();
        $token = $response->json('tracking.token');

        $upload = $this->post("/api/orders/{$order->order_number}/{$token}/payment-proof", [
            'receipt' => UploadedFile::fake()->create('receipt.pdf', 100, 'application/pdf'),
        ]);

        $upload->assertCreated()
            ->assertJsonPath('data.status', PaymentProof::STATUS_PENDING);

        $proof = $order->paymentProofs()->sole();

        $this->assertSame(PaymentProof::SOURCE_WEB, $proof->source);
        $this->assertSame('application/pdf', $proof->mime_type);
        $this->assertSame(PaymentProof::STATUS_PENDING, $proof->status);
        Storage::disk('local')->assertExists($proof->path);

        $this->postJson(
            "/api/admin/orders/{$order->id}/payment/verify",
            ['reference' => 'WAVE-TXN-1001', 'note' => 'Seen in the Wave app'],
            $this->adminHeaders(),
        )
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_CONFIRMED)
            ->assertJsonPath('data.payment_status', Order::PAYMENT_PAID);

        $order->refresh();
        $proof->refresh();
        $payment = $order->payments()->latest('id')->firstOrFail();

        $this->assertSame(Order::STATUS_CONFIRMED, $order->status);
        $this->assertSame(Order::PAYMENT_PAID, $order->payment_status);
        $this->assertSame('paid', $payment->status);
        $this->assertSame('WAVE-TXN-1001', $payment->provider_ref);
        $this->assertNotNull($payment->paid_at);
        $this->assertSame(PaymentProof::STATUS_APPROVED, $proof->status);
        $this->assertSame('admin', $proof->reviewed_by);

        $this->getJson("/api/orders/{$order->order_number}/{$token}/payment")
            ->assertOk()
            ->assertJsonPath('data.status', Order::PAYMENT_PAID)
            ->assertJsonPath('data.can_upload', false)
            ->assertJsonPath('data.proofs.0.status', PaymentProof::STATUS_APPROVED);

        $this->getJson("/api/admin/orders/{$order->id}", $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.can_mark_paid', false)
            ->assertJsonPath('data.payment_required_before_shipping', false)
            ->assertJsonPath('data.payments.0.status', 'paid')
            ->assertJsonPath('data.payments.0.provider_ref', 'WAVE-TXN-1001');
    }

    public function test_a_prepaid_order_cannot_ship_until_the_payment_is_verified(): void
    {
        $this->enablePrepaid('kbzpay');

        $response = $this->postJson('/api/orders', $this->payload('kbzpay'))->assertCreated();
        $order = Order::query()->where('order_number', $response->json('data.order_number'))->firstOrFail();

        foreach ([Order::STATUS_CONFIRMED, Order::STATUS_PACKED] as $status) {
            $this->patchJson(
                "/api/admin/orders/{$order->id}/status",
                ['status' => $status],
                $this->adminHeaders(),
            )->assertOk();
        }

        $this->patchJson(
            "/api/admin/orders/{$order->id}/status",
            ['status' => Order::STATUS_SHIPPED],
            $this->adminHeaders(),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->assertSame(Order::STATUS_PACKED, $order->fresh()->status);

        $this->postJson(
            "/api/admin/orders/{$order->id}/payment/verify",
            ['reference' => 'KBZ-TXN-2002'],
            $this->adminHeaders(),
        )->assertOk();

        $this->patchJson(
            "/api/admin/orders/{$order->id}/status",
            ['status' => Order::STATUS_SHIPPED],
            $this->adminHeaders(),
        )
            ->assertOk()
            ->assertJsonPath('data.status', Order::STATUS_SHIPPED);

        $this->assertNotNull($order->fresh()->shipped_at);
    }

    public function test_a_rejected_receipt_keeps_the_order_unpaid(): void
    {
        $this->enablePrepaid('wave');

        $response = $this->postJson('/api/orders', $this->payload('wave'))->assertCreated();
        $order = Order::query()->where('order_number', $response->json('data.order_number'))->firstOrFail();
        $token = $response->json('tracking.token');

        $this->post("/api/orders/{$order->order_number}/{$token}/payment-proof", [
            'receipt' => UploadedFile::fake()->create('receipt.pdf', 100, 'application/pdf'),
        ])->assertCreated();

        $proof = $order->paymentProofs()->sole();

        $this->postJson(
            "/api/admin/orders/{$order->id}/payment/reject",
            ['proof_id' => $proof->id, 'reason' => 'The amount does not match.'],
            $this->adminHeaders(),
        )
            ->assertOk()
            ->assertJsonPath('data.status', PaymentProof::STATUS_REJECTED)
            ->assertJsonPath('data.review_note', 'The amount does not match.');

        $this->assertSame(Order::PAYMENT_UNPAID, $order->fresh()->payment_status);
        $this->assertSame(PaymentProof::STATUS_REJECTED, $proof->fresh()->status);

        $this->getJson("/api/orders/{$order->order_number}/{$token}/payment")
            ->assertOk()
            ->assertJsonPath('data.rejection_reason', 'The amount does not match.');

        // A rejected receipt does not block the admin from confirming the
        // money arrived another way.
        $this->postJson(
            "/api/admin/orders/{$order->id}/payment/verify",
            ['reference' => 'WAVE-TXN-3003'],
            $this->adminHeaders(),
        )->assertOk();

        $this->assertSame(Order::PAYMENT_PAID, $order->fresh()->payment_status);
        $this->assertSame(PaymentProof::STATUS_REJECTED, $proof->fresh()->status);
    }

    public function test_receipts_are_limited_to_prepaid_orders_and_allowed_file_types(): void
    {
        $cod = $this->placeOrder('cod');

        $this->post("/api/orders/{$cod['order']->order_number}/{$cod['token']}/payment-proof", [
            'receipt' => UploadedFile::fake()->create('receipt.pdf', 100, 'application/pdf'),
        ])->assertStatus(422);

        $this->enablePrepaid('kbzpay');
        $prepaid = $this->placeOrder('kbzpay');

        $this->post("/api/orders/{$prepaid['order']->order_number}/not-a-real-token/payment-proof", [
            'receipt' => UploadedFile::fake()->create('receipt.pdf', 100, 'application/pdf'),
        ])->assertForbidden();

        $this->post("/api/orders/{$prepaid['order']->order_number}/{$prepaid['token']}/payment-proof", [
            'receipt' => UploadedFile::fake()->create('receipt.txt', 10, 'text/plain'),
        ])->assertStatus(422)->assertJsonValidationErrors('receipt');

        $this->assertSame(0, $prepaid['order']->paymentProofs()->count());
    }

    public function test_a_closed_order_cannot_be_marked_paid(): void
    {
        $this->enablePrepaid('kbzpay');
        $order = $this->placeOrder('kbzpay')['order'];

        $this->patchJson(
            "/api/admin/orders/{$order->id}/status",
            ['status' => Order::STATUS_CANCELLED],
            $this->adminHeaders(),
        )->assertOk();

        $this->postJson(
            "/api/admin/orders/{$order->id}/payment/verify",
            ['reference' => 'KBZ-TXN-4004'],
            $this->adminHeaders(),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors('payment');

        $this->assertSame(Order::PAYMENT_UNPAID, $order->fresh()->payment_status);
    }

    public function test_a_transaction_reference_cannot_be_reused_across_orders(): void
    {
        $this->enablePrepaid('kbzpay');

        $first = $this->placeOrder('kbzpay')['order'];
        $second = $this->placeOrder('kbzpay')['order'];

        $this->postJson(
            "/api/admin/orders/{$first->id}/payment/verify",
            ['reference' => 'KBZ-TXN-5005'],
            $this->adminHeaders(),
        )->assertOk();

        $this->postJson(
            "/api/admin/orders/{$second->id}/payment/verify",
            ['reference' => 'KBZ-TXN-5005'],
            $this->adminHeaders(),
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors('reference');

        $this->assertSame(Order::PAYMENT_UNPAID, $second->fresh()->payment_status);
    }

    public function test_an_admin_can_open_a_receipt_through_a_signed_url(): void
    {
        $this->enablePrepaid('wave');
        $placed = $this->placeOrder('wave');

        $this->post("/api/orders/{$placed['order']->order_number}/{$placed['token']}/payment-proof", [
            'receipt' => UploadedFile::fake()->create('receipt.pdf', 100, 'application/pdf'),
        ])->assertCreated();

        $proof = $placed['order']->paymentProofs()->sole();

        $response = $this->getJson("/api/admin/payment-proofs/{$proof->id}/url", $this->adminHeaders())
            ->assertOk()
            ->assertJsonStructure(['url', 'expires_at']);

        $this->assertStringContainsString('/api/payment-proofs/'.$proof->id.'/file', $response->json('url'));
        $this->assertStringContainsString('signature=', $response->json('url'));
    }

    /**
     * @return array{order: Order, token: string}
     */
    private function placeOrder(string $method): array
    {
        $response = $this->postJson('/api/orders', $this->payload($method))->assertCreated();
        $order = Order::query()->where('order_number', $response->json('data.order_number'))->firstOrFail();

        return ['order' => $order, 'token' => (string) $response->json('tracking.token')];
    }

    private function enablePrepaid(string $method): void
    {
        $prefix = $method === 'wave' ? 'wave' : 'kbzpay';

        foreach ([
            "{$prefix}_enabled" => true,
            "{$prefix}_account_name" => $method === 'wave' ? 'ZayWear Wave' : 'ZayWear Store',
            "{$prefix}_phone" => $method === 'wave' ? '09772345678' : '09771234567',
        ] as $key => $value) {
            Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }

        // The public config is cached; a direct DB change (as opposed to the
        // admin PUT endpoint) must clear it for the next assertion.
        Cache::flush();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(string $method): array
    {
        $variant = ProductVariant::query()
            ->where('is_active', true)
            ->where('stock_qty', '>', 0)
            ->orderBy('id')
            ->firstOrFail();

        $township = Township::query()->where('name_en', 'Bahan')->firstOrFail();

        return [
            'customer' => [
                'name' => 'Thiri Aung',
                'phone' => '09771234567',
            ],
            'township_id' => $township->id,
            'address_line' => 'No 45, Inya Road',
            'landmark' => 'Near Bahan market',
            'payment_method' => $method,
            'items' => [
                ['variant_id' => $variant->id, 'qty' => 1],
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function adminHeaders(): array
    {
        return ['Authorization' => 'Bearer test-admin-token'];
    }
}
