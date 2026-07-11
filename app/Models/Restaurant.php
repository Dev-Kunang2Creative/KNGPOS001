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
            'has_kitchen' => 'boolean',
            'has_bar' => 'boolean',
            'has_waiter' => 'boolean',
            'self_order_enabled' => 'boolean',
        ];
    }

    // ─── Charge calculation ──────────────────────────────────

    /**
     * Service charge for a given subtotal. Respects the active flag and the
     * charge type ('percentage' of subtotal, or flat 'nominal' Rp amount).
     */
    public function serviceChargeAmount(float $subtotal): float
    {
        if (! $this->service_charge_is_active) {
            return 0.0;
        }

        $value = (float) $this->service_charge_percentage;

        return $this->service_charge_type === 'nominal'
            ? round($value, 2)
            : round($subtotal * ($value / 100), 2);
    }

    /**
     * Tax for a given subtotal. Percentage tax is applied on top of the
     * subtotal + service charge; nominal tax is a flat Rp amount.
     */
    public function taxAmount(float $subtotal, float $serviceCharge = 0.0): float
    {
        if (! $this->tax_is_active) {
            return 0.0;
        }

        $value = (float) $this->tax_percentage;

        return $this->tax_type === 'nominal'
            ? round($value, 2)
            : round(($subtotal + $serviceCharge) * ($value / 100), 2);
    }

    /**
     * Full charge breakdown for a subtotal.
     *
     * @return array{service_charge: float, tax: float, total: float}
     */
    public function chargesFor(float $subtotal): array
    {
        $serviceCharge = $this->serviceChargeAmount($subtotal);
        $tax = $this->taxAmount($subtotal, $serviceCharge);

        return [
            'service_charge' => $serviceCharge,
            'tax' => $tax,
            'total' => round($subtotal + $serviceCharge + $tax, 2),
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
