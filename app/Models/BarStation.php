<?php

namespace App\Models;

use App\Models\Traits\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BarStation extends Model
{
    use BelongsToRestaurant;

    protected $guarded = [];

    public function activeOrders(): HasMany
    {
        return $this->hasMany(BarOrder::class)->whereIn('status', ['queued', 'in_progress']);
    }
}
