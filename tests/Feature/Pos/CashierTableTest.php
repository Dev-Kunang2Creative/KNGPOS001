<?php

namespace Tests\Feature\Pos;

use App\Models\Order;
use App\Models\SelfOrder;
use App\Models\Table;
use App\Models\TableQrcode;
use App\Models\Transaction;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class CashierTableTest extends TestCase
{
    use InteractsWithRestaurant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_cashier_can_change_table_status(): void
    {
        $restaurant = $this->activeRestaurant();
        $cashier = $this->managerFor($restaurant, ['tables.view']);
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id, 'status' => 'available']);

        $this->actingAs($cashier)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->patch("/pos/tables/{$table->id}/status", ['status' => 'reserved'])
            ->assertRedirect();

        $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => 'reserved']);
    }

    public function test_cashier_table_status_rejects_invalid_status(): void
    {
        $restaurant = $this->activeRestaurant();
        $cashier = $this->managerFor($restaurant, ['tables.view']);
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id, 'status' => 'available']);

        $this->actingAs($cashier)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->patch("/pos/tables/{$table->id}/status", ['status' => 'blocked'])
            ->assertSessionHasErrors('status');

        $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => 'available']);
    }

    public function test_receipt_never_prints_station_tickets_at_cashier(): void
    {
        $restaurant = $this->activeRestaurant();
        $user = $this->managerFor($restaurant, ['pos.view', 'pos.create', 'pos.checkout']);

        $zone = Zone::query()->create(['name' => 'Indoor', 'color_hex' => '#2563EB']);
        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id]);
        $qr = TableQrcode::query()->create(['table_id' => $table->id, 'qr_token' => str_repeat('d', 48), 'is_active' => true]);

        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => null,
            'order_type' => 'self_order',
            'status' => 'paid',
            'subtotal' => 35000,
            'total_amount' => 35000,
        ]);
        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => null,
            'payment_method' => 'qris',
            'amount_paid' => 35000,
            'change_amount' => 0,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        SelfOrder::query()->create([
            'table_id' => $table->id,
            'table_qrcode_id' => $qr->id,
            'order_id' => $order->id,
            'customer_name' => 'Budi',
            'payment_preference' => 'qris',
            'status' => 'converted_to_order',
            'subtotal' => 35000,
            'total_amount' => 35000,
        ]);

        $this->actingAs($user)
            ->withSession(['active_restaurant_id' => $restaurant->id])
            ->get("/pos/transactions/{$transaction->id}/receipt")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('stationTicketUrls', []));
    }
}
