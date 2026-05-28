<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KitchenStation extends Model
{
    protected $guarded = [];

    public function activeOrders(): HasMany
    {
        return $this->hasMany(KitchenOrder::class)->whereIn('status', ['queued', 'in_progress']);
    }
}
