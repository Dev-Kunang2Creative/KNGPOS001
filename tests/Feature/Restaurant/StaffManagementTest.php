<?php

namespace Tests\Feature\Restaurant;

use App\Models\RestaurantUser;
use App\Models\User;
use App\Models\WaiterZoneAssignment;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class StaffManagementTest extends TestCase
{
    use InteractsWithRestaurant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_index_lists_staff_with_waiter_zone_ids(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Lantai 1', 'color_hex' => '#2563EB']);

        // A waiter assigned to the zone.
        $waiter = User::query()->create(['name' => 'Wira', 'email' => 'wira@resto.test', 'password' => Hash::make('password12')]);
        RestaurantUser::query()->create(['restaurant_id' => $restaurant->id, 'user_id' => $waiter->id, 'role' => 'waiter']);
        WaiterZoneAssignment::query()->create(['user_id' => $waiter->id, 'zone_id' => $zone->id, 'assigned_at' => now()]);

        $manager = $this->managerFor($restaurant, ['users.view', 'users.manage']);

        $this->actingAs($manager)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->get('/users')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Users/Index')
                ->has('users', 2)
                ->where('users', fn ($users) => collect($users)->firstWhere('role', 'waiter')['zone_ids'] === [$zone->id])
            );
    }

    public function test_manager_can_create_staff(): void
    {
        $restaurant = $this->activeRestaurant();
        $manager = $this->managerFor($restaurant, ['users.view', 'users.manage']);

        $this->actingAs($manager)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post('/users', [
                'name' => 'Kasir Baru',
                'email' => 'kasirbaru@resto.test',
                'password' => 'password12',
                'role' => 'kasir',
                'is_active' => true,
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $user = User::query()->where('email', 'kasirbaru@resto.test')->firstOrFail();
        $this->assertDatabaseHas('restaurant_users', [
            'restaurant_id' => $restaurant->id,
            'user_id' => $user->id,
            'role' => 'kasir',
        ]);
        $this->assertTrue($user->hasRole('kasir'));
    }

    public function test_manager_can_reset_staff_password(): void
    {
        $restaurant = $this->activeRestaurant();
        $manager = $this->managerFor($restaurant, ['users.view', 'users.manage']);
        $staff = User::query()->create(['name' => 'Staf', 'email' => 'staf@resto.test', 'password' => Hash::make('oldpass12')]);
        RestaurantUser::query()->create(['restaurant_id' => $restaurant->id, 'user_id' => $staff->id, 'role' => 'kasir']);

        $this->actingAs($manager)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post("/users/{$staff->id}/reset-password", ['password' => 'newpass123'])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check('newpass123', $staff->fresh()->password));
    }
}
