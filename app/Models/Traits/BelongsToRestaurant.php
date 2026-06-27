<?php

namespace App\Models\Traits;

use App\Models\Restaurant;
use App\Services\RestaurantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Trait for models that belong to a restaurant.
 *
 * Automatically:
 * - Adds a global scope to filter by the active restaurant
 * - Sets restaurant_id on creating if not explicitly provided
 * - Provides a restaurant() relationship
 */
trait BelongsToRestaurant
{
    public static function bootBelongsToRestaurant(): void
    {
        // Auto-set restaurant_id when creating a new record
        static::creating(function (Model $model): void {
            if (! $model->restaurant_id) {
                $model->restaurant_id = app(RestaurantContext::class)->id();
            }
        });

        // Global scope: automatically filter queries by active restaurant
        static::addGlobalScope('restaurant', function (Builder $builder): void {
            $restaurantId = app(RestaurantContext::class)->id();

            if ($restaurantId) {
                $builder->where(
                    $builder->getModel()->getTable() . '.restaurant_id',
                    $restaurantId
                );
            }
        });
    }

    /**
     * Get the restaurant that owns this model.
     */
    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    /**
     * Scope to a specific restaurant, bypassing the global scope.
     */
    public function scopeForRestaurant(Builder $query, int $restaurantId): Builder
    {
        return $query->withoutGlobalScope('restaurant')
            ->where($this->getTable() . '.restaurant_id', $restaurantId);
    }

    /**
     * Query without restaurant scope (for admin/cross-restaurant queries).
     */
    public function scopeAllRestaurants(Builder $query): Builder
    {
        return $query->withoutGlobalScope('restaurant');
    }
}
