<?php

namespace Tests\Feature\SelfOrder;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\SelfOrder;
use App\Models\Table;
use App\Models\TableQrcode;
use App\Models\XenditPayment;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class OnlinePaymentTest extends TestCase
{
    use InteractsWithRestaurant, RefreshDatabase;

    private string $token = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.xendit.enabled' => true, 'services.xendit.secret_key' => 'xnd_development_test']);
    }

    private function seedSelfOrderTable(): void
    {
        $zone = Zone::query()->create(['name' => 'Lantai 1', 'color_hex' => '#2563EB']);
        $table = Table::query()->create(['name' => 'A1', 'capacity' => 4, 'zone_id' => $zone->id, 'self_order_enabled' => true, 'status' => 'available']);
        TableQrcode::query()->create(['table_id' => $table->id, 'qr_token' => $this->token, 'is_active' => true]);

        $kitchen = KitchenStation::query()->create(['name' => 'K1']);
        $bar = BarStation::query()->create(['name' => 'B1']);
        ZoneStationAssignment::query()->create(['zone_id' => $zone->id, 'kitchen_station_id' => $kitchen->id, 'bar_station_id' => $bar->id]);

        $category = MenuCategory::query()->create(['name' => 'Makanan', 'sort_order' => 1, 'is_active' => true]);
        MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Nasi Goreng',
            'price' => 20000,
            'print_to' => 'kitchen',
            'is_available' => true,
            'sort_order' => 1,
        ]);
    }

    private function checkoutOnline(): TestResponse
    {
        $item = MenuItem::query()->firstOrFail();

        return $this->post("/s/{$this->token}/orders", [
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.test',
            'payment_preference' => 'online',
            'bill_type' => 'close',
            'items' => [['menu_item_id' => $item->id, 'quantity' => 2]],
        ]);
    }

    public function test_online_checkout_creates_a_xendit_invoice(): void
    {
        $this->activeRestaurant();
        $this->seedSelfOrderTable();

        Http::fake([
            'api.xendit.co/v2/invoices' => Http::response([
                'id' => 'inv_123',
                'status' => 'PENDING',
                'invoice_url' => 'https://checkout.xendit.co/web/inv_123',
            ], 200),
        ]);

        $this->checkoutOnline()->assertRedirect();

        $this->assertDatabaseHas('self_orders', ['payment_preference' => 'online', 'status' => 'converted_to_order']);
        $this->assertDatabaseHas('xendit_payments', ['payment_method' => 'invoice', 'xendit_invoice_id' => 'inv_123', 'status' => 'PENDING']);
        $this->assertDatabaseHas('transactions', ['payment_method' => 'xendit', 'status' => 'pending']);
    }

    public function test_refresh_marks_invoice_paid_when_settled(): void
    {
        $this->activeRestaurant();
        $this->seedSelfOrderTable();

        Http::fake(function ($request) {
            if ($request->method() === 'POST') {
                return Http::response([
                    'id' => 'inv_123',
                    'status' => 'PENDING',
                    'invoice_url' => 'https://checkout.xendit.co/web/inv_123',
                ], 200);
            }

            return Http::response(['id' => 'inv_123', 'status' => 'PAID'], 200);
        });

        $this->checkoutOnline()->assertRedirect();

        $selfOrder = SelfOrder::query()->where('payment_preference', 'online')->firstOrFail();

        $this->post("/s/{$this->token}/status/{$selfOrder->id}/refresh")->assertRedirect();

        $payment = XenditPayment::query()->firstOrFail();
        $this->assertSame('paid', strtolower($payment->fresh()->status));
        $this->assertDatabaseHas('transactions', ['id' => $payment->transaction_id, 'status' => 'paid']);
        $this->assertDatabaseHas('orders', ['id' => Order::query()->firstOrFail()->id, 'status' => 'paid']);
    }
}
