<?php

namespace Tests\Feature\Manager;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\Table;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class ZoneStationManagementTest extends TestCase
{
    use InteractsWithRestaurant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_manager_can_view_zone_station_management(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);

        ZoneStationAssignment::query()->create([
            'zone_id' => $zone->id,
            'kitchen_station_id' => $kitchen->id,
            'bar_station_id' => $bar->id,
        ]);

        $user = $this->managerFor($restaurant, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->get('/zones')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Zones/Index')
                ->where('allZonesAssigned', true)
            );
    }

    public function test_assignment_update_creates_audit_log(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);
        $user = $this->managerFor($restaurant, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->put("/zones/{$zone->id}/assignment", [
                'kitchen_station_id' => $kitchen->id,
                'bar_station_id' => $bar->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('zone_station_assignments', [
            'zone_id' => $zone->id,
            'kitchen_station_id' => $kitchen->id,
            'bar_station_id' => $bar->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'zone.assignment.updated',
            'resource_type' => Zone::class,
            'resource_id' => $zone->id,
        ]);
    }

    public function test_unassigned_zone_is_reported_before_pos_phase(): void
    {
        $restaurant = $this->activeRestaurant();
        Zone::query()->create(['name' => 'Rooftop', 'color_hex' => '#0F766E']);
        $user = $this->managerFor($restaurant, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->get('/zones')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('allZonesAssigned', false));
    }

    public function test_index_payload_includes_table_shape_and_size(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id]);
        $user = $this->managerFor($restaurant, ['zones.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->get('/zones')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Zones/Index')
                ->has('tables.0', fn ($table) => $table
                    ->where('shape', 'square')
                    ->where('width', 96)
                    ->where('height', 64)
                    ->etc()
                )
            );
    }
}
