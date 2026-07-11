<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SplitPaymentAccount extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'percent_amount' => 'decimal:2',
            'is_active'      => 'boolean',
        ];
    }

    /** Only active accounts. */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * Accounts ready to receive a Xendit Payout —
     * must be active AND have both bank_code and account_number filled.
     */
    public function scopeBankReady(Builder $query): void
    {
        $query->where('is_active', true)
              ->whereNotNull('bank_code')
              ->where('bank_code', '!=', '')
              ->whereNotNull('account_number')
              ->where('account_number', '!=', '');
    }

    public function disbursements(): HasMany
    {
        return $this->hasMany(SplitPaymentDisbursement::class, 'split_account_id');
    }
}
