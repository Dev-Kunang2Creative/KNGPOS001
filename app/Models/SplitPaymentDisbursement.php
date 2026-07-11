<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SplitPaymentDisbursement extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'amount'              => 'decimal:2',
            'percent_amount'      => 'decimal:2',
            'xendit_raw_response' => 'array',
            'disbursed_at'        => 'datetime',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function splitAccount(): BelongsTo
    {
        return $this->belongsTo(SplitPaymentAccount::class, 'split_account_id');
    }
}
