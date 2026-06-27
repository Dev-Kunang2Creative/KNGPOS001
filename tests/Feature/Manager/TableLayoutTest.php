<?php

namespace Tests\Feature\Manager;

use App\Models\Restaurant;
use App\Models\Table;
use App\Models\Zone;
use App\Services\RestaurantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class TableLayoutTest extends TestCase
{
    use InteractsWithRestaurant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_table_has_default_shape_and_size(): void
    {
        $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);

        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id]);

        $this->assertSame('square', $table->fresh()->shape);
        $this->assertSame(96, $table->fresh()->width);
        $this->assertSame(64, $table->fresh()->height);
    }

    public function test_table_creation_accepts_shape_and_size(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $user = $this->managerFor($restaurant, ['settings.view', 'settings.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post('/settings/tables', [
                'name' => 'A1',
                'capacity' => 4,
                'zone_id' => $zone->id,
                'position_x' => 10,
                'position_y' => 20,
                'shape' => 'round',
                'width' => 120,
                'height' => 120,
                'status' => 'available',
                'self_order_enabled' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('tables', [
            'name' => 'A1',
            'shape' => 'round',
            'width' => 120,
            'height' => 120,
        ]);
    }

    public function test_table_creation_rejects_invalid_shape_and_size(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $user = $this->managerFor($restaurant, ['settings.view', 'settings.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post('/settings/tables', [
                'name' => 'A1',
                'capacity' => 4,
                'zone_id' => $zone->id,
                'position_x' => 10,
                'position_y' => 20,
                'shape' => 'triangle',
                'width' => 10,
                'height' => 9999,
                'status' => 'available',
                'self_order_enabled' => true,
            ])
            ->assertSessionHasErrors(['shape', 'width', 'height']);
    }

    public function test_save_layout_persists_positions_and_sizes(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id]);
        $user = $this->managerFor($restaurant, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->patch('/zones/layout', [
                'tables' => [
                    ['id' => $table->id, 'position_x' => 200, 'position_y' => 120, 'width' => 140, 'height' => 80, 'shape' => 'round'],
                ],
            ])
            ->assertOk();

        $this->assertDatabaseHas('tables', [
            'id' => $table->id,
            'position_x' => 200,
            'position_y' => 120,
            'width' => 140,
            'height' => 80,
            'shape' => 'round',
        ]);
    }

    public function test_save_layout_validates_payload(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id]);
        $user = $this->managerFor($restaurant, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->patchJson('/zones/layout', [
                'tables' => [
                    ['id' => $table->id, 'position_x' => -5, 'position_y' => 10, 'width' => 9999, 'height' => 80, 'shape' => 'hexagon'],
                ],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['tables.0.position_x', 'tables.0.width', 'tables.0.shape']);
    }

    public function test_save_layout_ignores_tables_of_other_restaurant(): void
    {
        // Restaurant A — active context.
        $restaurantA = $this->activeRestaurant('resto-a');
        $zoneA = Zone::query()->create(['name' => 'A-Indoor', 'color_hex' => '#2563EB']);
        $tableA = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zoneA->id]);

        // Restaurant B — a foreign table created out of scope.
        $restaurantB = Restaurant::query()->create(['name' => 'Resto B', 'slug' => 'resto-b', 'status' => 'active']);
        app(RestaurantContext::class)->set($restaurantB->id);
        $zoneB = Zone::query()->create(['name' => 'B-Indoor', 'color_hex' => '#10B981']);
        $tableB = Table::query()->create(['name' => 'B1', 'capacity' => 2, 'zone_id' => $zoneB->id, 'position_x' => 5, 'position_y' => 5]);

        // Back to restaurant A as the acting manager.
        app(RestaurantContext::class)->set($restaurantA->id);
        $user = $this->managerFor($restaurantA, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurantA->id])
            ->patch('/zones/layout', [
                'tables' => [
                    ['id' => $tableA->id, 'position_x' => 300, 'position_y' => 300, 'width' => 100, 'height' => 100, 'shape' => 'square'],
                    ['id' => $tableB->id, 'position_x' => 999, 'position_y' => 999, 'width' => 100, 'height' => 100, 'shape' => 'square'],
                ],
            ])
            ->assertOk();

        // A updated, B untouched.
        $this->assertSame(300, $tableA->fresh()->position_x);

        $foreign = Table::query()->allRestaurants()->find($tableB->id);
        $this->assertSame(5, $foreign->position_x);
        $this->assertSame(5, $foreign->position_y);
    }

    public function test_save_layout_requires_zones_manage_permission(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id]);
        $user = $this->managerFor($restaurant, ['settings.view']); // no zones.manage

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->patch('/zones/layout', [
                'tables' => [
                    ['id' => $table->id, 'position_x' => 1, 'position_y' => 1, 'width' => 100, 'height' => 100, 'shape' => 'square'],
                ],
            ])
            ->assertForbidden();
    }
}
