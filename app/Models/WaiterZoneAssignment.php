<?php

namespace App\Models;

use App\Models\Traits\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;

class WaiterZoneAssignment extends Model
{
    use BelongsToRestaurant;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
        ];
    }
}
