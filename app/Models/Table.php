<?php

namespace App\Models;

use App\Models\Traits\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Table extends Model
{
    use BelongsToRestaurant, SoftDeletes;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'self_order_enabled' => 'boolean',
            'position_x' => 'integer',
            'position_y' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function tableType(): BelongsTo
    {
        return $this->belongsTo(TableType::class);
    }

    public function activeQrCode(): HasOne
    {
        return $this->hasOne(TableQrcode::class)->where('is_active', true);
    }
}
