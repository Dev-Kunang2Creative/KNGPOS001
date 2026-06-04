<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\SystemSettings;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('settings:xendit-setup', function () {
    $secretKey = $this->secret('Xendit secret key');
    $webhookToken = $this->secret('Xendit webhook verify token');

    if (! $secretKey || ! str_starts_with($secretKey, 'xnd_')) {
        $this->error('Secret key Xendit tidak valid.');

        return self::FAILURE;
    }

    if (! $webhookToken) {
        $this->error('Webhook verify token wajib diisi.');

        return self::FAILURE;
    }

    SystemSettings::set('xendit_enabled', '1');
    SystemSettings::setEncrypted('xendit_secret_key', $secretKey);
    SystemSettings::setEncrypted('xendit_webhook_token', $webhookToken);

    $this->info('Xendit aktif dan credential tersimpan.');

    return self::SUCCESS;
})->purpose('Configure Xendit settings from an interactive CLI prompt');
