<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MenuPromotion extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'min_order_amount' => 'decimal:2',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'is_active' => 'boolean',
        ];
    }
}
