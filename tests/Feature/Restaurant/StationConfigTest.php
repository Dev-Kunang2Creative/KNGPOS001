<?php

namespace Tests\Feature\Restaurant;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\TableQrcode;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use App\Services\OrderRoutingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class StationConfigTest extends TestCase
{
    use InteractsWithRestaurant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_kasir_only_restaurant_routes_without_zone_assignment(): void
    {
        $restaurant = $this->activeRestaurant();
        $restaurant->update(['has_kitchen' => false, 'has_bar' => false]);

        $order = $this->orderWithItem('kitchen');

        // No ZoneStationAssignment exists, but routing must not require one.
        $result = app(OrderRoutingService::class)->routeOrder($order);

        $this->assertNull($result['kitchen_order']);
        $this->assertNull($result['bar_order']);
        $this->assertSame(0, $order->kitchenOrders()->count());
        $this->assertSame('submitted', $order->fresh()->status);
    }

    public function test_disabled_station_items_become_cashier_prep_items(): void
    {
        $restaurant = $this->activeRestaurant();
        $restaurant->update(['has_kitchen' => false, 'has_bar' => true]);

        $zone = Zone::query()->create(['name' => 'Indoor']);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);
        ZoneStationAssignment::query()->create([
            'zone_id' => $zone->id,
            'kitchen_station_id' => $kitchen->id,
            'bar_station_id' => $bar->id,
        ]);

        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id]);
        $category = MenuCategory::query()->create(['name' => 'Main']);
        $food = MenuItem::query()->create(['category_id' => $category->id, 'name' => 'Nasi', 'price' => 20000, 'print_to' => 'kitchen']);
        $drink = MenuItem::query()->create(['category_id' => $category->id, 'name' => 'Kopi', 'price' => 10000, 'print_to' => 'bar']);

        $order = Order::query()->create(['table_id' => $table->id, 'subtotal' => 30000, 'total_amount' => 30000]);
        $order->items()->create(['menu_item_id' => $food->id, 'quantity' => 1, 'unit_price' => 20000, 'subtotal' => 20000, 'status' => 'pending']);
        $order->items()->create(['menu_item_id' => $drink->id, 'quantity' => 1, 'unit_price' => 10000, 'subtotal' => 10000, 'status' => 'pending']);

        $routing = app(OrderRoutingService::class);
        $result = $routing->routeOrder($order);

        // Bar is enabled → drink routed; kitchen disabled → food not routed.
        $this->assertNull($result['kitchen_order']);
        $this->assertNotNull($result['bar_order']);

        // Only the disabled-station (kitchen) item is a cashier prep item.
        $prep = $routing->cashierPrepItems($order->fresh('items.menuItem'));
        $this->assertCount(1, $prep);
        $this->assertSame($food->id, $prep->first()->menu_item_id);
    }

    public function test_manager_can_toggle_station_config(): void
    {
        $restaurant = $this->activeRestaurant();
        $manager = $this->managerFor($restaurant, ['restaurant.manage']);

        session(['active_restaurant_id' => $restaurant->id]);

        $this->actingAs($manager)
            ->put('/restaurant', [
                'name' => 'Warung Kasir',
                'tax_is_active' => false,
                'service_charge_is_active' => false,
                'has_kitchen' => false,
                'has_bar' => false,
                'has_waiter' => false,
                'self_order_enabled' => false,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('restaurants', [
            'id' => $restaurant->id,
            'has_kitchen' => false,
            'has_bar' => false,
            'has_waiter' => false,
            'self_order_enabled' => false,
        ]);
    }

    public function test_self_order_page_blocked_when_disabled(): void
    {
        $restaurant = $this->activeRestaurant();
        $restaurant->update(['self_order_enabled' => false]);

        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id]);
        $qr = TableQrcode::query()->create(['table_id' => $table->id, 'qr_token' => str_repeat('b', 48), 'is_active' => true]);

        $this->get("/s/{$qr->qr_token}")->assertForbidden();
    }

    public function test_self_order_page_reachable_when_enabled(): void
    {
        $restaurant = $this->activeRestaurant();
        $restaurant->update(['self_order_enabled' => true]);

        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id]);
        $qr = TableQrcode::query()->create(['table_id' => $table->id, 'qr_token' => str_repeat('c', 48), 'is_active' => true]);

        $this->get("/s/{$qr->qr_token}")->assertOk();
    }

    private function orderWithItem(string $printTo): Order
    {
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id]);
        $category = MenuCategory::query()->create(['name' => 'Main']);
        $item = MenuItem::query()->create(['category_id' => $category->id, 'name' => 'Nasi', 'price' => 20000, 'print_to' => $printTo]);

        $order = Order::query()->create(['table_id' => $table->id, 'subtotal' => 20000, 'total_amount' => 20000]);
        $order->items()->create(['menu_item_id' => $item->id, 'quantity' => 1, 'unit_price' => 20000, 'subtotal' => 20000, 'status' => 'pending']);

        return $order;
    }
}
