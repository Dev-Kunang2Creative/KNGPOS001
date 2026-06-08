<?php

namespace App\Models;

use App\Models\Traits\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BarOrder extends Model
{
    use BelongsToRestaurant;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'printed_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function station(): BelongsTo
    {
        return $this->belongsTo(BarStation::class, 'bar_station_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(BarOrderItem::class);
    }
}
