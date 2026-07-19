<?php

namespace Tests\Feature\Pos;

use App\Models\Order;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class PosOrderHistoryTest extends TestCase
{
    use InteractsWithRestaurant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_pos_index_lists_paid_orders_in_history_instead_of_station_tickets(): void
    {
        $restaurant = $this->activeRestaurant();
        $cashier = $this->managerFor($restaurant, ['pos.view']);
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id]);

        $paidOrder = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => $cashier->id,
            'order_type' => 'dine_in',
            'status' => 'paid',
            'subtotal' => 25000,
            'total_amount' => 25000,
            'created_at' => now()->subMinute(),
        ]);
        $transaction = Transaction::query()->create([
            'order_id' => $paidOrder->id,
            'kasir_id' => $cashier->id,
            'payment_method' => 'cash',
            'amount_paid' => 25000,
            'change_amount' => 0,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $selfOrder = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => null,
            'order_type' => 'self_order',
            'status' => 'paid',
            'subtotal' => 15000,
            'total_amount' => 15000,
        ]);

        // Orders that are still open never show up in the history.
        Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => $cashier->id,
            'order_type' => 'dine_in',
            'status' => 'open',
            'subtotal' => 10000,
            'total_amount' => 10000,
        ]);

        // Paid orders belonging to another cashier are excluded too.
        $otherCashier = User::factory()->create();
        Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => $otherCashier->id,
            'order_type' => 'dine_in',
            'status' => 'paid',
            'subtotal' => 5000,
            'total_amount' => 5000,
        ]);

        $this->actingAs($cashier)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->get('/pos')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/Index')
                ->has('orderHistory', 2)
                ->where('orderHistory.0.id', $selfOrder->id)
                ->where('orderHistory.0.order_type', 'self_order')
                ->where('orderHistory.1.id', $paidOrder->id)
                ->where('orderHistory.1.transaction.id', $transaction->id)
                ->missing('pendingStationTickets')
                ->missing('stationTicketHistory'));
    }

    public function test_pos_station_ticket_route_is_removed(): void
    {
        $restaurant = $this->activeRestaurant();
        $cashier = $this->managerFor($restaurant, ['pos.create']);
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id]);
        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => $cashier->id,
            'order_type' => 'dine_in',
            'status' => 'paid',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);

        $this->actingAs($cashier)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->get("/pos/orders/{$order->id}/station-ticket")
            ->assertNotFound();
    }
}
