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
        ];

        foreach ($settings as $key => $value) {
            SystemSettings::query()->updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }
}
