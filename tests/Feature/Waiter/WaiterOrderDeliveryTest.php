<?php

namespace Tests\Feature\Waiter;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Restaurant;
use App\Models\RestaurantUser;
use App\Models\Table;
use App\Models\User;
use App\Models\WaiterZoneAssignment;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use App\Services\OrderRoutingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class WaiterOrderDeliveryTest extends TestCase
{
    use InteractsWithRestaurant;
    use RefreshDatabase;

    public function test_waiter_screen_groups_kitchen_and_bar_into_one_order_card(): void
    {
        [$waiter, $order] = $this->scenario();

        $this->actingAs($waiter)
            ->get(route('waiter.orders.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Waiter/Orders')
                ->has('orders', 1)
                ->where('orders.0.order.id', $order->id)
                ->has('orders.0.items', 2));
    }

    public function test_deliver_completes_kitchen_and_bar_orders_at_once(): void
    {
        [$waiter, $order] = $this->scenario();

        $this->actingAs($waiter)
            ->post(route('waiter.orders.deliver', $order))
            ->assertRedirect();

        $kitchenOrder = $order->kitchenOrders()->first();
        $barOrder = $order->barOrders()->first();

        $this->assertSame('done', $kitchenOrder->status);
        $this->assertNotNull($kitchenOrder->completed_at);
        $this->assertSame('done', $barOrder->status);
        $this->assertNotNull($barOrder->completed_at);

        // Delivered order no longer appears on the waiter screen.
        $this->actingAs($waiter)
            ->get(route('waiter.orders.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('orders', 0));
    }

    public function test_waiter_can_change_table_status_to_each_allowed_status(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id, 'status' => 'occupied']);
        $waiter = $this->waiterFor($restaurant, $zone);

        foreach (['available', 'occupied', 'open_bill', 'reserved'] as $status) {
            $this->actingAs($waiter)
                ->patch(route('waiter.tables.status', $table), ['status' => $status])
                ->assertRedirect();

            $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => $status]);
        }
    }

    public function test_waiter_cannot_set_invalid_table_status(): void
    {
        $restaurant = $this->activeRestaurant();
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id, 'status' => 'occupied']);
        $waiter = $this->waiterFor($restaurant, $zone);

        $this->actingAs($waiter)
            ->patch(route('waiter.tables.status', $table), ['status' => 'blocked'])
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => 'occupied']);
    }

    /**
     * Build a routed dine-in order in the waiter's zone.
     *
     * @return array{0: User, 1: Order}
     */
    private function scenario(): array
    {
        $restaurant = $this->activeRestaurant();

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
        $menuItem = MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Nasi Goreng',
            'price' => 25000,
            'print_to' => 'kitchen_bar',
        ]);

        $order = Order::query()->create([
            'table_id' => $table->id,
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'unit_price' => 25000,
            'subtotal' => 25000,
            'status' => 'pending',
        ]);

        app(OrderRoutingService::class)->routeOrder($order);

        $waiter = $this->waiterFor($restaurant, $zone);

        return [$waiter, $order->fresh()];
    }

    private function waiterFor(Restaurant $restaurant, Zone $zone): User
    {
        foreach (['waiter.view', 'waiter.update'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $waiter = User::factory()->create();
        $waiter->givePermissionTo(['waiter.view', 'waiter.update']);

        RestaurantUser::query()->create([
            'restaurant_id' => $restaurant->id,
            'user_id' => $waiter->id,
            'role' => 'waiter',
            'is_primary' => true,
        ]);

        WaiterZoneAssignment::query()->create([
            'user_id' => $waiter->id,
            'zone_id' => $zone->id,
        ]);

        return $waiter;
    }
}
