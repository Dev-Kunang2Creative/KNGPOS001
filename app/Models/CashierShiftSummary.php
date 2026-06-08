<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CashierShiftSummary extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'total_cash' => 'decimal:2',
            'total_qris' => 'decimal:2',
            'total_ewallet' => 'decimal:2',
            'total_bank_transfer' => 'decimal:2',
            'total_va' => 'decimal:2',
            'total_discount' => 'decimal:2',
            'total_tax' => 'decimal:2',
            'total_service_charge' => 'decimal:2',
            'total_revenue' => 'decimal:2',
            'cash_difference' => 'decimal:2',
        ];
    }
}
