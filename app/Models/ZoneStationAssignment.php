<?php

namespace App\Models;

use App\Models\Traits\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZoneStationAssignment extends Model
{
    use BelongsToRestaurant;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
        ];
    }

    public function kitchenStation(): BelongsTo
    {
        return $this->belongsTo(KitchenStation::class);
    }

    public function barStation(): BelongsTo
    {
        return $this->belongsTo(BarStation::class);
    }
}
