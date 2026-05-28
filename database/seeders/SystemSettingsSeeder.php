<?php

namespace Database\Seeders;

use App\Models\SystemSettings;
use Illuminate\Database\Seeder;

class SystemSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'restaurant_name' => 'Karcisqu POS',
            'restaurant_address' => 'Jl. Contoh No. 1',
            'restaurant_phone' => '081234567890',
            'receipt_header' => 'Terima kasih sudah berkunjung',
            'receipt_footer' => 'Simpan struk sebagai bukti pembayaran',
            'tax_percentage' => '11',
            'tax_is_active' => '1',
            'service_charge_percentage' => '5',
            'service_charge_is_active' => '1',
            'xendit_secret_key' => 'xnd_development_placeholder',
            'xendit_webhook_token' => 'webhook_placeholder',
            'xendit_enabled' => '0',
            'xendit_active_methods' => json_encode(['qris', 'ewallet', 'bank_transfer', 'va']),
        ];

        foreach ($settings as $key => $value) {
            SystemSettings::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
