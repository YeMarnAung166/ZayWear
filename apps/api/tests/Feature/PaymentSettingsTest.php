<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class PaymentSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();

        Cache::flush();

        config(['shop.admin_token' => 'test-admin-token']);
    }

    public function test_payment_settings_require_the_admin_token(): void
    {
        $this->getJson('/api/admin/settings/payments')->assertUnauthorized();
        $this->putJson('/api/admin/settings/payments', [])->assertUnauthorized();
    }

    public function test_it_returns_the_default_payment_settings(): void
    {
        $this->getJson('/api/admin/settings/payments', $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.cod_enabled', true)
            ->assertJsonPath('data.kbzpay_enabled', false)
            ->assertJsonPath('data.wave_enabled', false)
            ->assertJsonPath('data.kbzpay_account_name', '')
            ->assertJsonPath('data.kbzpay_phone', '');
    }

    public function test_it_rejects_enabling_a_method_without_receiving_account_details(): void
    {
        $this->putJson('/api/admin/settings/payments', [
            'cod_enabled' => true,
            'kbzpay_enabled' => true,
            'wave_enabled' => false,
            'kbzpay_account_name' => '',
            'kbzpay_phone' => '',
            'wave_account_name' => '',
            'wave_phone' => '',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['kbzpay_account_name', 'kbzpay_phone']);
    }

    public function test_it_rejects_disabling_every_payment_method(): void
    {
        $this->putJson('/api/admin/settings/payments', [
            'cod_enabled' => false,
            'kbzpay_enabled' => false,
            'wave_enabled' => false,
            'kbzpay_account_name' => '',
            'kbzpay_phone' => '',
            'wave_account_name' => '',
            'wave_phone' => '',
        ], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonValidationErrors('cod_enabled');
    }

    public function test_it_saves_settings_normalizes_phones_and_refreshes_the_public_config(): void
    {
        $this->getJson('/api/config')
            ->assertOk()
            ->assertJsonPath('kbzpay_enabled', false);

        $this->putJson('/api/admin/settings/payments', [
            'cod_enabled' => true,
            'kbzpay_enabled' => true,
            'wave_enabled' => true,
            'kbzpay_account_name' => 'ZayWear Store',
            'kbzpay_phone' => '+95 9 771 234 567',
            'wave_account_name' => 'ZayWear Wave',
            'wave_phone' => '09-772-345-678',
        ], $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.kbzpay_enabled', true)
            ->assertJsonPath('data.kbzpay_phone', '09771234567')
            ->assertJsonPath('data.wave_phone', '09772345678');

        $this->assertSame(true, Setting::get('kbzpay_enabled'));
        $this->assertSame('ZayWear Store', Setting::get('kbzpay_account_name'));

        // The first /api/config response is cached; saving settings must
        // invalidate it so the storefront sees the new methods immediately.
        $this->getJson('/api/config')
            ->assertOk()
            ->assertJsonPath('kbzpay_enabled', true)
            ->assertJsonPath('wave_enabled', true)
            ->assertJsonPath('kbzpay_account_name', 'ZayWear Store')
            ->assertJsonPath('kbzpay_phone', '09771234567')
            ->assertJsonPath('wave_phone', '09772345678');
    }

    public function test_an_enabled_method_without_account_details_is_not_exposed_to_the_storefront(): void
    {
        Setting::query()->updateOrCreate(['key' => 'kbzpay_enabled'], ['value' => true]);
        Setting::query()->updateOrCreate(['key' => 'kbzpay_account_name'], ['value' => 'ZayWear Store']);

        $this->getJson('/api/config')
            ->assertOk()
            ->assertJsonPath('kbzpay_enabled', false)
            ->assertJsonPath('kbzpay_account_name', '')
            ->assertJsonPath('kbzpay_phone', '');
    }

    /**
     * @return array<string, string>
     */
    private function adminHeaders(): array
    {
        return ['Authorization' => 'Bearer test-admin-token'];
    }
}
