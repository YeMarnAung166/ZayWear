<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AdminStoreSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        Cache::flush();

        config(['shop.admin_token' => 'test-admin-token']);
    }

    public function test_store_settings_require_the_admin_token(): void
    {
        $this->getJson('/api/admin/settings/store')->assertUnauthorized();
        $this->putJson('/api/admin/settings/store', [])->assertUnauthorized();
    }

    public function test_it_returns_the_default_store_settings(): void
    {
        $this->getJson('/api/admin/settings/store', $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.free_delivery_threshold_mmk', 80000)
            ->assertJsonPath('data.return_window_days', 7)
            ->assertJsonPath('data.support_telegram', '');
    }

    public function test_it_saves_settings_normalizes_the_handle_and_refreshes_the_public_config(): void
    {
        $this->getJson('/api/config')
            ->assertOk()
            ->assertJsonPath('free_delivery_threshold_mmk', 80000)
            ->assertJsonPath('return_window_days', 7)
            ->assertJsonPath('support_telegram', '');

        $this->putJson('/api/admin/settings/store', [
            'free_delivery_threshold_mmk' => 120000,
            'return_window_days' => 14,
            'support_telegram' => 'https://t.me/zaywear_support',
        ], $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.free_delivery_threshold_mmk', 120000)
            ->assertJsonPath('data.return_window_days', 14)
            ->assertJsonPath('data.support_telegram', 'zaywear_support');

        $this->assertSame(120000, Setting::get('free_delivery_threshold_mmk'));
        $this->assertSame(14, Setting::get('return_window_days'));
        $this->assertSame('zaywear_support', Setting::get('support_telegram'));

        // The first /api/config response is cached; saving settings must
        // invalidate it so the storefront sees the new values immediately.
        $this->getJson('/api/config')
            ->assertOk()
            ->assertJsonPath('free_delivery_threshold_mmk', 120000)
            ->assertJsonPath('return_window_days', 14)
            ->assertJsonPath('support_telegram', 'zaywear_support');
    }

    public function test_it_strips_a_leading_at_sign_and_allows_an_empty_handle(): void
    {
        $this->putJson('/api/admin/settings/store', [
            'free_delivery_threshold_mmk' => 0,
            'return_window_days' => 1,
            'support_telegram' => '@zaywear',
        ], $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.support_telegram', 'zaywear');

        $this->putJson('/api/admin/settings/store', [
            'free_delivery_threshold_mmk' => 0,
            'return_window_days' => 1,
            'support_telegram' => '',
        ], $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.support_telegram', '');

        $this->assertSame('', Setting::get('support_telegram'));
    }

    public function test_it_rejects_an_out_of_range_threshold(): void
    {
        $this->putJson('/api/admin/settings/store', [
            'free_delivery_threshold_mmk' => -1,
            'return_window_days' => 7,
            'support_telegram' => '',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('free_delivery_threshold_mmk');

        $this->putJson('/api/admin/settings/store', [
            'free_delivery_threshold_mmk' => 10000001,
            'return_window_days' => 7,
            'support_telegram' => '',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('free_delivery_threshold_mmk');
    }

    public function test_it_rejects_an_out_of_range_return_window(): void
    {
        $this->putJson('/api/admin/settings/store', [
            'free_delivery_threshold_mmk' => 80000,
            'return_window_days' => 0,
            'support_telegram' => '',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('return_window_days');

        $this->putJson('/api/admin/settings/store', [
            'free_delivery_threshold_mmk' => 80000,
            'return_window_days' => 31,
            'support_telegram' => '',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('return_window_days');
    }

    public function test_it_rejects_an_invalid_telegram_handle(): void
    {
        foreach (['abc', 'bad handle', 'zaywear-support', str_repeat('a', 33)] as $handle) {
            $this->putJson('/api/admin/settings/store', [
                'free_delivery_threshold_mmk' => 80000,
                'return_window_days' => 7,
                'support_telegram' => $handle,
            ], $this->adminHeaders())
                ->assertStatus(422)
                ->assertJsonValidationErrors('support_telegram');
        }
    }

    /**
     * @return array<string, string>
     */
    private function adminHeaders(): array
    {
        return ['Authorization' => 'Bearer test-admin-token'];
    }
}
