<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'currency' => 'MMK',
            'free_delivery_threshold_mmk' => 80000,
            'cod_enabled' => true,
            'kbzpay_enabled' => false,
            'wave_enabled' => false,
            'return_window_days' => 7,
            // Empty until the founder creates a support account; the site hides the link when blank.
            'support_telegram' => '',
            'order_prefix' => 'ZW',
        ];

        foreach ($settings as $key => $value) {
            Setting::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
