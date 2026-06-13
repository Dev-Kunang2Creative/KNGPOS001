<?php

namespace Tests\Feature\Restaurant;

use App\Models\Restaurant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class RestaurantCreationTest extends TestCase
{
    use InteractsWithRestaurant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_manager_can_create_a_new_restaurant(): void
    {
        $restaurant = $this->activeRestaurant();
        $user = $this->managerFor($restaurant, []);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post('/restaurants', [
                'name' => 'Cabang Baru',
                'phone' => '08123456789',
                'receipt_header' => "Jl. Merdeka No. 1\nTelp 0274-123",
                'receipt_footer' => "Terima kasih\nWiFi: kopikita123",
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('restaurants', [
            'name' => 'Cabang Baru',
            'slug' => 'cabang-baru',
            'owner_id' => $user->id,
        ]);

        $created = Restaurant::query()->where('name', 'Cabang Baru')->firstOrFail();
        $this->assertDatabaseHas('restaurant_users', [
            'restaurant_id' => $created->id,
            'user_id' => $user->id,
            'role' => 'manager',
        ]);
    }
}
