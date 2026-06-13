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

class TableQrManagementTest extends TestCase
{
    use InteractsWithRestaurant, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_table_creation_generates_active_qr_token(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);
        ZoneStationAssignment::query()->create(['zone_id' => $zone->id, 'kitchen_station_id' => $kitchen->id, 'bar_station_id' => $bar->id]);
        $user = $this->managerFor($restaurant, ['settings.view', 'settings.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post('/settings/tables', [
                'name' => 'A1',
                'capacity' => 4,
                'zone_id' => $zone->id,
                'position_x' => 10,
                'position_y' => 20,
                'shape' => 'square',
                'width' => 96,
                'height' => 64,
                'status' => 'available',
                'self_order_enabled' => true,
            ])
            ->assertRedirect();

        $table = Table::query()->where('name', 'A1')->firstOrFail();

        $this->assertDatabaseHas('table_qrcodes', [
            'table_id' => $table->id,
            'is_active' => true,
        ]);
    }

    public function test_regenerate_qr_deactivates_old_token(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id]);
        $old = $table->activeQrCode()->create(['qr_token' => str_repeat('a', 48), 'is_active' => true]);
        $user = $this->managerFor($restaurant, ['settings.view', 'settings.manage']);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->post("/settings/tables/{$table->id}/qr")
            ->assertRedirect();

        $this->assertDatabaseHas('table_qrcodes', ['id' => $old->id, 'is_active' => false]);
        $this->assertSame(1, $table->activeQrCode()->count());
    }
}
