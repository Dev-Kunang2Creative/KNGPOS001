<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KitchenOrderReassignment extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'reassigned_at' => 'datetime',
        ];
    }
}
