<?php

namespace Tests\Concerns;

use App\Models\Restaurant;
use App\Models\RestaurantUser;
use App\Models\User;
use App\Services\RestaurantContext;
use Spatie\Permission\Models\Permission;

/**
 * Helpers for feature tests that need an active restaurant context
 * (required since the multi-restaurant migration made restaurant_id NOT NULL).
 */
trait InteractsWithRestaurant
{
    protected ?Restaurant $restaurant = null;

    /**
     * Create a restaurant and set it as the active context for the test process.
     */
    protected function activeRestaurant(string $slug = 'test-resto'): Restaurant
    {
        $restaurant = Restaurant::query()->create([
            'name' => 'Test Resto',
            'slug' => $slug,
            'status' => 'active',
        ]);

        app(RestaurantContext::class)->set($restaurant->id);

        $this->restaurant = $restaurant;

        return $restaurant;
    }

    /**
     * Create a manager user with the given permissions, linked to the restaurant.
     *
     * @param  array<int, string>  $permissions
     */
    protected function managerFor(Restaurant $restaurant, array $permissions): User
    {
        foreach ($permissions as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        RestaurantUser::query()->create([
            'restaurant_id' => $restaurant->id,
            'user_id' => $user->id,
            'role' => 'manager',
            'is_primary' => true,
        ]);

        return $user;
    }
}
