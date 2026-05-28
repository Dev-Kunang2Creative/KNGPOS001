<?php

namespace Tests\Unit;

use App\Exceptions\ZoneStationAssignmentMissingException;
use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use App\Services\OrderRoutingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderRoutingServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_routes_order_for_configured_zone(): void
    {
        [$zone, $kitchen, $bar] = $this->configuredZone();
        $order = $this->orderForZone($zone, ['kitchen', 'bar', 'kitchen_bar', 'kasir']);

        $result = app(OrderRoutingService::class)->routeOrder($order);

        $this->assertNotNull($result['kitchen_order']);
        $this->assertNotNull($result['bar_order']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'submitted']);
        $this->assertDatabaseHas('kitchen_orders', [
            'order_id' => $order->id,
            'kitchen_station_id' => $kitchen->id,
            'status' => 'queued',
        ]);
        $this->assertDatabaseHas('bar_orders', [
            'order_id' => $order->id,
            'bar_station_id' => $bar->id,
            'status' => 'queued',
        ]);
        $this->assertDatabaseCount('kitchen_order_items', 2);
        $this->assertDatabaseCount('bar_order_items', 2);
    }

    public function test_rejects_order_when_zone_has_no_station_assignment(): void
    {
        $zone = Zone::query()->create(['name' => 'Rooftop']);
        $order = $this->orderForZone($zone, ['kitchen']);

        try {
            app(OrderRoutingService::class)->routeOrder($order);
            $this->fail('Expected missing zone station assignment exception.');
        } catch (ZoneStationAssignmentMissingException $exception) {
            $this->assertSame('Zona meja belum dikonfigurasi.', $exception->getMessage());
        }

        $this->assertDatabaseMissing('kitchen_orders', ['order_id' => $order->id]);
        $this->assertDatabaseMissing('bar_orders', ['order_id' => $order->id]);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'open']);
    }

    public function test_routes_to_the_station_assigned_to_the_table_zone(): void
    {
        $zoneA = Zone::query()->create(['name' => 'Indoor']);
        $zoneB = Zone::query()->create(['name' => 'Outdoor']);
        $kitchenA = KitchenStation::query()->create(['name' => 'Kitchen A']);
        $kitchenB = KitchenStation::query()->create(['name' => 'Kitchen B']);
        $barA = BarStation::query()->create(['name' => 'Bar A']);
        $barB = BarStation::query()->create(['name' => 'Bar B']);

        ZoneStationAssignment::query()->create([
            'zone_id' => $zoneA->id,
            'kitchen_station_id' => $kitchenA->id,
            'bar_station_id' => $barA->id,
        ]);
        ZoneStationAssignment::query()->create([
            'zone_id' => $zoneB->id,
            'kitchen_station_id' => $kitchenB->id,
            'bar_station_id' => $barB->id,
        ]);

        $order = $this->orderForZone($zoneB, ['kitchen_bar']);

        app(OrderRoutingService::class)->routeOrder($order);

        $this->assertDatabaseHas('kitchen_orders', [
            'order_id' => $order->id,
            'kitchen_station_id' => $kitchenB->id,
        ]);
        $this->assertDatabaseHas('bar_orders', [
            'order_id' => $order->id,
            'bar_station_id' => $barB->id,
        ]);
        $this->assertDatabaseMissing('kitchen_orders', [
            'order_id' => $order->id,
            'kitchen_station_id' => $kitchenA->id,
        ]);
        $this->assertDatabaseMissing('bar_orders', [
            'order_id' => $order->id,
            'bar_station_id' => $barA->id,
        ]);
    }

    private function configuredZone(): array
    {
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);

        ZoneStationAssignment::query()->create([
            'zone_id' => $zone->id,
            'kitchen_station_id' => $kitchen->id,
            'bar_station_id' => $bar->id,
        ]);

        return [$zone, $kitchen, $bar];
    }

    /**
     * @param  list<string>  $printTargets
     */
    private function orderForZone(Zone $zone, array $printTargets): Order
    {
        $table = Table::query()->create([
            'name' => 'T-'.uniqid(),
            'zone_id' => $zone->id,
        ]);
        $kasir = User::factory()->create(['role' => 'kasir']);
        $category = MenuCategory::query()->create(['name' => 'Main']);
        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => $kasir->id,
            'subtotal' => 0,
            'total_amount' => 0,
        ]);

        foreach ($printTargets as $index => $printTo) {
            $menuItem = MenuItem::query()->create([
                'category_id' => $category->id,
                'name' => "Item {$index}",
                'price' => 10000,
                'print_to' => $printTo,
            ]);

            $order->items()->create([
                'menu_item_id' => $menuItem->id,
                'quantity' => 1,
                'unit_price' => 10000,
                'subtotal' => 10000,
                'status' => 'pending',
            ]);
        }

        return $order;
    }
}
