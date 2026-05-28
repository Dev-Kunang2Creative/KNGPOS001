<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class XenditWebhookLog extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'processed' => 'boolean',
            'received_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
