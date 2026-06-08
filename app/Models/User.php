<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'kitchen_station_id',
        'bar_station_id',
        'is_active',
        'must_change_password',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'last_login_at' => 'datetime',
        ];
    }

    // ─── Restaurant Relationships ────────────────────────────

    /**
     * Restaurants this user has access to (via restaurant_users pivot).
     */
    public function restaurants(): BelongsToMany
    {
        return $this->belongsToMany(Restaurant::class, 'restaurant_users')
            ->withPivot(['role', 'is_primary'])
            ->withTimestamps();
    }

    /**
     * Restaurant-user pivot records.
     */
    public function restaurantUsers(): HasMany
    {
        return $this->hasMany(RestaurantUser::class);
    }

    /**
     * Restaurants owned by this user (as manager).
     */
    public function ownedRestaurants(): HasMany
    {
        return $this->hasMany(Restaurant::class, 'owner_id');
    }

    // ─── Existing Relationships ──────────────────────────────

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class, 'kasir_id');
    }

    // ─── Role Helpers ────────────────────────────────────────

    /**
     * Check if the user is a super admin (via Spatie role).
     */
    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    /**
     * Get the user's role in a specific restaurant.
     */
    public function roleInRestaurant(?int $restaurantId): ?string
    {
        if (! $restaurantId) {
            return null;
        }

        if ($this->isSuperAdmin()) {
            return 'super_admin';
        }

        return RestaurantUser::query()
            ->where('restaurant_id', $restaurantId)
            ->where('user_id', $this->id)
            ->value('role');
    }

    /**
     * Get the user's role in the currently active restaurant.
     */
    public function activeRole(): ?string
    {
        return $this->roleInRestaurant(session('active_restaurant_id'));
    }

    /**
     * Check if user has access to a specific restaurant.
     */
    public function hasRestaurantAccess(int $restaurantId): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return RestaurantUser::query()
            ->where('restaurant_id', $restaurantId)
            ->where('user_id', $this->id)
            ->exists();
    }

    /**
     * Get the user's primary restaurant ID.
     */
    public function primaryRestaurantId(): ?int
    {
        $primary = RestaurantUser::query()
            ->where('user_id', $this->id)
            ->where('is_primary', true)
            ->value('restaurant_id');

        if ($primary) {
            return $primary;
        }

        // Fallback: first restaurant
        return RestaurantUser::query()
            ->where('user_id', $this->id)
            ->value('restaurant_id');
    }
}
