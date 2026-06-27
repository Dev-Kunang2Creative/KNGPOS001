<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Restaurant extends Model
{
    use SoftDeletes;

    protected $guarded = [];

    protected $appends = [
        'logo_url',
    ];

    protected function casts(): array
    {
        return [
            'tax_percentage' => 'decimal:2',
            'tax_is_active' => 'boolean',
            'service_charge_percentage' => 'decimal:2',
            'service_charge_is_active' => 'boolean',
        ];
    }

    // ─── Relationships ───────────────────────────────────────

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'restaurant_users')
            ->withPivot(['role', 'is_primary'])
            ->withTimestamps();
    }

    public function restaurantUsers(): HasMany
    {
        return $this->hasMany(RestaurantUser::class);
    }

    public function zones(): HasMany
    {
        return $this->hasMany(Zone::class);
    }

    public function kitchenStations(): HasMany
    {
        return $this->hasMany(KitchenStation::class);
    }

    public function barStations(): HasMany
    {
        return $this->hasMany(BarStation::class);
    }

    public function tables(): HasMany
    {
        return $this->hasMany(Table::class);
    }

    public function menuCategories(): HasMany
    {
        return $this->hasMany(MenuCategory::class);
    }

    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function printers(): HasMany
    {
        return $this->hasMany(Printer::class);
    }

    // ─── Accessors ───────────────────────────────────────────

    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo_path) {
            return null;
        }

        return Storage::disk('public')->url($this->logo_path);
    }

    // ─── Scopes ──────────────────────────────────────────────

    /**
     * Scope to restaurants accessible by a specific user.
     */
    public function scopeForUser($query, User $user)
    {
        // Super admin can access all restaurants
        if ($user->isSuperAdmin()) {
            return $query;
        }

        return $query->whereHas('restaurantUsers', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        });
    }

    /**
     * Scope to restaurants owned by a specific user.
     */
    public function scopeOwnedBy($query, User $user)
    {
        return $query->where('owner_id', $user->id);
    }
}
