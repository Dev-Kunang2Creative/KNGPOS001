<?php

namespace Tests\Feature\Payment;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\SystemSettings;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\User;
use App\Models\XenditPayment;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_payment_calculates_total_server_side_and_creates_transaction(): void
    {
        $cashier = User::factory()->create(['role' => 'kasir']);
        $order = $this->orderWithItemTotal($cashier, 25000);

        $transaction = app(PaymentService::class)->createCashPayment($order, $cashier, 30000);

        $this->assertSame('paid', $transaction->status);
        $this->assertEquals(30000, (float) $transaction->amount_paid);
        $this->assertEquals(5000, (float) $transaction->change_amount);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
    }

    public function test_xendit_callback_validates_token_logs_and_is_idempotent(): void
    {
        SystemSettings::setEncrypted('xendit_webhook_token', 'verify-token');
        $cashier = User::factory()->create(['role' => 'kasir']);
        $order = $this->orderWithItemTotal($cashier, 20000);
        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => $cashier->id,
            'payment_method' => 'qris',
            'amount_paid' => 20000,
            'change_amount' => 0,
            'status' => 'pending',
        ]);
        XenditPayment::query()->create([
            'transaction_id' => $transaction->id,
            'external_id' => 'karcisqu-test-1',
            'amount' => 20000,
            'status' => 'pending',
        ]);

        $payload = ['reference_id' => 'karcisqu-test-1', 'status' => 'SUCCEEDED'];

        $this->postJson('/api/xendit/callback', $payload, ['x-callback-token' => 'wrong'])
            ->assertUnauthorized();

        $this->postJson('/api/xendit/callback', $payload, ['x-callback-token' => 'verify-token'])
            ->assertOk();
        $this->postJson('/api/xendit/callback', $payload, ['x-callback-token' => 'verify-token'])
            ->assertOk()
            ->assertJson(['message' => 'Duplicate callback ignored.']);

        $this->assertDatabaseHas('xendit_payments', ['external_id' => 'karcisqu-test-1', 'status' => 'paid']);
        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'status' => 'paid']);
        $this->assertDatabaseCount('xendit_webhook_logs', 2);
    }

    public function test_xendit_payment_uses_system_settings_secret_key(): void
    {
        Http::fake([
            'api.xendit.co/qr_codes' => Http::response([
                'id' => 'qr_test',
                'status' => 'ACTIVE',
                'qr_string' => '000201010212...',
            ]),
        ]);
        SystemSettings::setEncrypted('xendit_secret_key', 'xnd_development_test');
        SystemSettings::set('xendit_enabled', '1');
        $cashier = User::factory()->create(['role' => 'kasir']);
        $order = $this->orderWithItemTotal($cashier, 15000);

        $result = app(PaymentService::class)->createQrisPayment($order, $cashier);

        $this->assertSame('qr_test', $result['payment']->xendit_invoice_id);
        $this->assertDatabaseHas('transactions', [
            'order_id' => $order->id,
            'payment_method' => 'qris',
            'status' => 'pending',
        ]);
        Http::assertSent(fn ($request) => $request->hasHeader('Authorization')
            && $request['amount'] === 15000
            && $request['currency'] === 'IDR');
    }

    private function orderWithItemTotal(User $cashier, int $total): Order
    {
        Permission::query()->firstOrCreate(['name' => 'pos.checkout', 'guard_name' => 'web']);
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'T1', 'zone_id' => $zone->id]);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);
        ZoneStationAssignment::query()->create([
            'zone_id' => $zone->id,
            'kitchen_station_id' => $kitchen->id,
            'bar_station_id' => $bar->id,
        ]);
        $category = MenuCategory::query()->create(['name' => 'Main']);
        $menuItem = MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Nasi',
            'price' => $total,
            'print_to' => 'kitchen',
        ]);
        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => $cashier->id,
            'status' => 'submitted',
            'subtotal' => $total,
            'total_amount' => $total,
        ]);
        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'unit_price' => $total,
            'subtotal' => $total,
            'status' => 'sent',
        ]);

        return $order;
    }
}
