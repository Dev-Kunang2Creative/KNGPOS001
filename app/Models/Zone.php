<?php

namespace App\Models;

use App\Models\Traits\BelongsToRestaurant;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Model;

class Zone extends Model
{
    use BelongsToRestaurant;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function assignment(): HasOne
    {
        return $this->hasOne(ZoneStationAssignment::class);
    }

    public function tables(): HasMany
    {
        return $this->hasMany(Table::class);
    }

    public function waiters(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'waiter_zone_assignments')
            ->withPivot('assigned_at')
            ->withTimestamps();
    }
}
