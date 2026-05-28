<?php

namespace Tests\Feature\Manager;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\User;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ZoneStationManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    private function manager(): User
    {
        Permission::query()->firstOrCreate(['name' => 'zones.manage', 'guard_name' => 'web']);

        $user = User::factory()->create(['role' => 'manager']);
        $user->givePermissionTo('zones.manage');

        return $user;
    }

    public function test_manager_can_view_zone_station_management(): void
    {
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);

        ZoneStationAssignment::query()->create([
            'zone_id' => $zone->id,
            'kitchen_station_id' => $kitchen->id,
            'bar_station_id' => $bar->id,
        ]);

        $this->actingAs($this->manager())
            ->get('/zones')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Zones/Index')
                ->where('allZonesAssigned', true)
            );
    }

    public function test_assignment_update_creates_audit_log(): void
    {
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);

        $this->actingAs($this->manager())
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
        Zone::query()->create(['name' => 'Rooftop', 'color_hex' => '#0F766E']);

        $this->actingAs($this->manager())
            ->get('/zones')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('allZonesAssigned', false));
    }
}
