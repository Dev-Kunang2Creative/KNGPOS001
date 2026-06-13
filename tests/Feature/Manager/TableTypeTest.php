<?php

namespace Tests\Feature\Manager;

use App\Models\Restaurant;
use App\Models\Table;
use App\Models\TableType;
use App\Models\Zone;
use App\Services\RestaurantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class TableTypeTest extends TestCase
{
    use InteractsWithRestaurant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_manager_can_create_table_type(): void
    {
        $restaurant = $this->activeRestaurant();
        $user = $this->managerFor($restaurant, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post('/table-types', ['name' => 'VIP', 'color_hex' => '#E11D48', 'sort_order' => 0])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('table_types', [
            'name' => 'VIP',
            'color_hex' => '#E11D48',
            'restaurant_id' => $restaurant->id,
        ]);
    }

    public function test_table_can_be_assigned_a_type(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Lantai 1', 'color_hex' => '#2563EB']);
        $type = TableType::query()->create(['name' => 'VIP', 'color_hex' => '#E11D48']);
        $user = $this->managerFor($restaurant, ['settings.view', 'settings.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post('/settings/tables', [
                'name' => 'A1',
                'capacity' => 4,
                'zone_id' => $zone->id,
                'table_type_id' => $type->id,
                'position_x' => 0,
                'position_y' => 0,
                'shape' => 'square',
                'width' => 96,
                'height' => 64,
                'status' => 'available',
                'self_order_enabled' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('tables', ['name' => 'A1', 'table_type_id' => $type->id]);
    }

    public function test_deleting_a_type_nullifies_its_tables(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Lantai 1', 'color_hex' => '#2563EB']);
        $type = TableType::query()->create(['name' => 'VIP', 'color_hex' => '#E11D48']);
        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id, 'table_type_id' => $type->id]);
        $user = $this->managerFor($restaurant, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->delete("/table-types/{$type->id}")
            ->assertRedirect();

        $this->assertDatabaseMissing('table_types', ['id' => $type->id]);
        $this->assertNull($table->fresh()->table_type_id);
    }

    public function test_table_types_are_restaurant_scoped_in_index(): void
    {
        $restaurantA = $this->activeRestaurant('resto-a');
        TableType::query()->create(['name' => 'VIP A', 'color_hex' => '#E11D48']);

        $restaurantB = Restaurant::query()->create(['name' => 'Resto B', 'slug' => 'resto-b', 'status' => 'active']);
        app(RestaurantContext::class)->set($restaurantB->id);
        TableType::query()->create(['name' => 'VIP B', 'color_hex' => '#10B981']);

        app(RestaurantContext::class)->set($restaurantA->id);
        $user = $this->managerFor($restaurantA, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurantA->id])
            ->get('/zones')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Zones/Index')
                ->has('tableTypes', 1)
                ->where('tableTypes.0.name', 'VIP A')
            );
    }

    public function test_two_restaurants_can_have_the_same_zone_name(): void
    {
        // Restaurant A already has "Lantai 1".
        $restaurantA = $this->activeRestaurant('resto-a');
        Zone::query()->create(['name' => 'Lantai 1', 'color_hex' => '#2563EB']);

        // Restaurant B (active, acting) creates a zone with the same name — should be allowed.
        $restaurantB = Restaurant::query()->create(['name' => 'Resto B', 'slug' => 'resto-b', 'status' => 'active']);
        app(RestaurantContext::class)->set($restaurantB->id);
        $user = $this->managerFor($restaurantB, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurantB->id])
            ->post('/zones', ['name' => 'Lantai 1', 'color_hex' => '#10B981', 'sort_order' => 0, 'is_active' => true])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $this->assertSame(2, Zone::query()->allRestaurants()->where('name', 'Lantai 1')->count());
    }
}
