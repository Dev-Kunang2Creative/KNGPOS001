<?php

namespace Tests\Feature;

use App\Jobs\SendSelfOrderReceiptEmail;
use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\SelfOrder;
use App\Models\Shift;
use App\Models\SystemSettings;
use App\Models\Table;
use App\Models\TableQrcode;
use App\Models\Transaction;
use App\Models\User;
use App\Models\XenditPayment;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class SelfOrderFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_qr_submit_creates_pending_self_order_and_notifies_open_cashier(): void
    {
        [$table, $qrCode, $menuItem] = $this->selfOrderFixture();
        $cashier = $this->cashier();
        Shift::query()->create(['kasir_id' => $cashier->id, 'opening_cash' => 100000, 'status' => 'open']);

        $this->post(route('self-order.checkout', $qrCode->qr_token), [
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'cashier',
            'notes' => 'Tidak pedas',
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 2],
            ],
        ])->assertRedirect();

        $this->assertDatabaseHas('self_orders', [
            'table_id' => $table->id,
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'cashier',
            'status' => 'pending',
            'total_amount' => 50000,
        ]);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_cashier_approve_converts_pending_self_order_and_routes_to_station(): void
    {
        [$table, $qrCode, $menuItem, $kitchen, $bar] = $this->selfOrderFixture();
        $cashier = $this->cashier();
        Shift::query()->create(['kasir_id' => $cashier->id, 'opening_cash' => 100000, 'status' => 'open']);

        $selfOrder = SelfOrder::query()->create([
            'table_id' => $table->id,
            'table_qrcode_id' => $qrCode->id,
            'status' => 'pending',
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'cashier',
            'subtotal' => 50000,
            'total_amount' => 50000,
        ]);
        $selfOrder->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => 2,
            'unit_price' => 25000,
            'subtotal' => 50000,
        ]);

        $response = $this->actingAs($cashier)
            ->post(route('pos.self-orders.approve', $selfOrder));

        $order = $selfOrder->fresh()->order;

        $this->assertNotNull($order);
        $response->assertRedirect(route('pos.index', ['order' => $order->id]));
        $this->assertDatabaseHas('self_orders', [
            'id' => $selfOrder->id,
            'status' => 'converted_to_order',
            'approved_by' => $cashier->id,
        ]);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'table_id' => $table->id,
            'kasir_id' => $cashier->id,
            'status' => 'submitted',
        ]);
        $this->assertDatabaseHas('kitchen_orders', [
            'order_id' => $order->id,
            'kitchen_station_id' => $kitchen->id,
        ]);
        $this->assertDatabaseHas('bar_orders', [
            'order_id' => $order->id,
            'bar_station_id' => $bar->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $cashier->id,
            'action' => 'self_order.approve',
            'resource_id' => $selfOrder->id,
        ]);
    }

    public function test_qris_self_order_creates_payment_without_cashier_and_routes_after_paid_callback(): void
    {
        Http::fake([
            'api.xendit.co/qr_codes' => Http::response([
                'id' => 'qr_self_order',
                'status' => 'ACTIVE',
                'qr_string' => '000201010212-self-order',
            ]),
        ]);
        SystemSettings::set('xendit_secret_key', 'xnd_development_test');
        SystemSettings::set('xendit_enabled', '1');
        SystemSettings::set('xendit_webhook_token', 'verify-token');

        [$table, $qrCode, $menuItem, $kitchen, $bar] = $this->selfOrderFixture();

        $this->post(route('self-order.checkout', $qrCode->qr_token), [
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'qris',
            'items' => [
                ['menu_item_id' => $menuItem->id, 'quantity' => 2],
            ],
        ])->assertRedirect();

        $selfOrder = SelfOrder::query()->firstOrFail();
        $order = Order::query()->firstOrFail();
        $transaction = Transaction::query()->where('order_id', $order->id)->firstOrFail();
        $payment = XenditPayment::query()->where('transaction_id', $transaction->id)->firstOrFail();

        $this->assertDatabaseHas('self_orders', [
            'id' => $selfOrder->id,
            'order_id' => $order->id,
            'payment_preference' => 'qris',
            'status' => 'converted_to_order',
        ]);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'table_id' => $table->id,
            'kasir_id' => null,
            'order_type' => 'self_order',
            'status' => 'open',
        ]);
        $this->assertDatabaseHas('transactions', [
            'id' => $transaction->id,
            'kasir_id' => null,
            'payment_method' => 'qris',
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('xendit_payments', [
            'id' => $payment->id,
            'xendit_invoice_id' => 'qr_self_order',
        ]);
        $this->assertDatabaseCount('kitchen_orders', 0);
        $this->assertDatabaseCount('bar_orders', 0);

        $this->postJson('/api/xendit/callback', [
            'reference_id' => $payment->external_id,
            'status' => 'SUCCEEDED',
        ], ['x-callback-token' => 'verify-token'])->assertOk();

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'status' => 'paid']);
        $this->assertDatabaseHas('kitchen_orders', [
            'order_id' => $order->id,
            'kitchen_station_id' => $kitchen->id,
        ]);
        $this->assertDatabaseHas('bar_orders', [
            'order_id' => $order->id,
            'bar_station_id' => $bar->id,
        ]);
    }

    public function test_cashier_can_print_paid_qris_self_order_receipt(): void
    {
        foreach (['pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        [$table, $qrCode, $menuItem] = $this->selfOrderFixture();
        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.checkout', 'shift.view']);
        Shift::query()->create(['kasir_id' => $cashier->id, 'opening_cash' => 100000, 'status' => 'open']);

        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => null,
            'order_type' => 'self_order',
            'status' => 'paid',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'unit_price' => 25000,
            'subtotal' => 25000,
            'status' => 'sent',
        ]);
        SelfOrder::query()->create([
            'table_id' => $table->id,
            'table_qrcode_id' => $qrCode->id,
            'order_id' => $order->id,
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'qris',
            'status' => 'converted_to_order',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => null,
            'payment_method' => 'qris',
            'amount_paid' => 25000,
            'change_amount' => 0,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->actingAs($cashier)
            ->get(route('pos.transactions.receipt', $transaction))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/Receipt')
                ->where('transaction.id', $transaction->id));
    }

    public function test_paid_qris_self_order_appears_on_pos_for_receipt_printing(): void
    {
        [$table, $qrCode, $menuItem] = $this->selfOrderFixture();
        $cashier = $this->cashier();
        Shift::query()->create(['kasir_id' => $cashier->id, 'opening_cash' => 100000, 'status' => 'open']);

        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => null,
            'order_type' => 'self_order',
            'status' => 'paid',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'unit_price' => 25000,
            'subtotal' => 25000,
            'status' => 'sent',
        ]);
        $selfOrder = SelfOrder::query()->create([
            'table_id' => $table->id,
            'table_qrcode_id' => $qrCode->id,
            'order_id' => $order->id,
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'qris',
            'status' => 'converted_to_order',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => null,
            'payment_method' => 'qris',
            'amount_paid' => 25000,
            'change_amount' => 0,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $this->actingAs($cashier)
            ->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/Index')
                ->has('paidSelfOrderReceipts', 1)
                ->where('paidSelfOrderReceipts.0.id', $selfOrder->id)
                ->where('paidSelfOrderReceipts.0.order.transaction.id', $transaction->id));
    }

    public function test_self_order_station_ticket_disappears_after_print_and_moves_to_history(): void
    {
        [$table, $qrCode, $menuItem, $kitchen, $bar] = $this->selfOrderFixture();
        $cashier = $this->cashier();
        Shift::query()->create(['kasir_id' => $cashier->id, 'opening_cash' => 100000, 'status' => 'open']);

        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => null,
            'order_type' => 'self_order',
            'status' => 'paid',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        $orderItem = $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'unit_price' => 25000,
            'subtotal' => 25000,
            'status' => 'sent',
        ]);
        SelfOrder::query()->create([
            'table_id' => $table->id,
            'table_qrcode_id' => $qrCode->id,
            'order_id' => $order->id,
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'qris',
            'status' => 'converted_to_order',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => null,
            'payment_method' => 'qris',
            'amount_paid' => 25000,
            'change_amount' => 0,
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        $kitchenOrder = \App\Models\KitchenOrder::query()->create([
            'order_id' => $order->id,
            'kitchen_station_id' => $kitchen->id,
            'status' => 'queued',
            'sent_at' => now(),
        ]);
        $kitchenOrder->items()->create([
            'order_item_id' => $orderItem->id,
            'quantity' => 1,
        ]);
        $barOrder = \App\Models\BarOrder::query()->create([
            'order_id' => $order->id,
            'bar_station_id' => $bar->id,
            'status' => 'queued',
            'sent_at' => now(),
        ]);
        $barOrder->items()->create([
            'order_item_id' => $orderItem->id,
            'quantity' => 1,
        ]);

        $this->actingAs($cashier)
            ->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('pendingStationTickets', 2)
                ->has('stationTicketHistory', 0));

        $this->actingAs($cashier)
            ->get(route('pos.orders.station-ticket', [
                'order' => $order->id,
                'kitchen_order' => $kitchenOrder->id,
            ]))
            ->assertOk();

        $this->assertNotNull($kitchenOrder->fresh()->printed_at);
        $this->assertNull($barOrder->fresh()->printed_at);

        $this->actingAs($cashier)
            ->get(route('pos.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('pendingStationTickets', 1)
                ->where('pendingStationTickets.0.type', 'bar')
                ->has('stationTicketHistory', 1)
                ->where('stationTicketHistory.0.type', 'kitchen'));
    }

    public function test_self_order_qris_payment_can_be_simulated_in_xendit_test_mode(): void
    {
        Http::fake([
            'api.xendit.co/qr_codes/qr_self_order/payments/simulate' => Http::response([
                'id' => 'qrpy_self_order',
                'status' => 'SUCCEEDED',
                'reference_id' => 'karcisqu-self-order',
            ]),
        ]);
        SystemSettings::set('xendit_secret_key', 'xnd_development_test');
        SystemSettings::set('xendit_enabled', '1');

        [$table, $qrCode, $menuItem, $kitchen, $bar] = $this->selfOrderFixture();
        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => null,
            'order_type' => 'self_order',
            'status' => 'open',
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
        $selfOrder = SelfOrder::query()->create([
            'table_id' => $table->id,
            'table_qrcode_id' => $qrCode->id,
            'order_id' => $order->id,
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'qris',
            'status' => 'converted_to_order',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => null,
            'payment_method' => 'qris',
            'amount_paid' => 25000,
            'change_amount' => 0,
            'status' => 'pending',
        ]);
        $payment = XenditPayment::query()->create([
            'transaction_id' => $transaction->id,
            'external_id' => 'karcisqu-self-order',
            'xendit_invoice_id' => 'qr_self_order',
            'payment_method' => 'qris',
            'amount' => 25000,
            'status' => 'ACTIVE',
        ]);

        $this->post(route('self-order.payment.simulate', [$qrCode->qr_token, $selfOrder, $payment]))
            ->assertRedirect(route('self-order.status', [$qrCode->qr_token, $selfOrder]))
            ->assertSessionHas('success', 'Simulasi pembayaran QRIS berhasil.');

        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'status' => 'paid']);
        $this->assertDatabaseHas('xendit_payments', ['id' => $payment->id, 'status' => 'paid']);
        $this->assertDatabaseHas('kitchen_orders', [
            'order_id' => $order->id,
            'kitchen_station_id' => $kitchen->id,
        ]);
        $this->assertDatabaseHas('bar_orders', [
            'order_id' => $order->id,
            'bar_station_id' => $bar->id,
        ]);
        Http::assertSent(fn ($request) => $request->url() === 'https://api.xendit.co/qr_codes/qr_self_order/payments/simulate'
            && $request['amount'] === 25000);
    }

    public function test_qr_submit_rejects_table_zone_without_station_assignment(): void
    {
        $zone = Zone::query()->create(['name' => 'Outdoor']);
        $table = Table::query()->create(['name' => 'B1', 'zone_id' => $zone->id]);
        $qrCode = TableQrcode::query()->create(['table_id' => $table->id, 'qr_token' => str_repeat('b', 48)]);
        $category = MenuCategory::query()->create(['name' => 'Main']);
        $menuItem = MenuItem::query()->create(['category_id' => $category->id, 'name' => 'Sate', 'price' => 25000, 'print_to' => 'kitchen']);

        $this->from(route('self-order.show', $qrCode->qr_token))
            ->post(route('self-order.checkout', $qrCode->qr_token), [
                'customer_name' => 'Budi',
                'customer_email' => 'budi@example.com',
                'payment_preference' => 'cashier',
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ])
            ->assertRedirect(route('self-order.show', $qrCode->qr_token))
            ->assertSessionHas('error', 'Zona meja belum dikonfigurasi.');

        $this->assertDatabaseCount('self_orders', 0);
    }

    public function test_paid_self_order_queues_receipt_email(): void
    {
        Queue::fake();
        [$table, $qrCode, $menuItem] = $this->selfOrderFixture();
        $cashier = $this->cashier();

        $order = \App\Models\Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => $cashier->id,
            'order_type' => 'self_order',
            'status' => 'submitted',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);
        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'unit_price' => 25000,
            'subtotal' => 25000,
            'status' => 'sent',
        ]);
        SelfOrder::query()->create([
            'table_id' => $table->id,
            'table_qrcode_id' => $qrCode->id,
            'order_id' => $order->id,
            'customer_name' => 'Budi',
            'customer_email' => 'budi@example.com',
            'payment_preference' => 'cashier',
            'status' => 'converted_to_order',
            'subtotal' => 25000,
            'total_amount' => 25000,
        ]);

        app(\App\Services\PaymentService::class)->createCashPayment($order, $cashier, 25000, 'Test');

        Queue::assertPushed(SendSelfOrderReceiptEmail::class);
    }

    private function cashier(): User
    {
        foreach (['pos.view', 'pos.create', 'pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.view', 'pos.create', 'pos.checkout', 'shift.view']);

        return $cashier;
    }

    private function selfOrderFixture(): array
    {
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $kitchen = KitchenStation::query()->create(['name' => 'Kitchen 1']);
        $bar = BarStation::query()->create(['name' => 'Bar 1']);
        ZoneStationAssignment::query()->create([
            'zone_id' => $zone->id,
            'kitchen_station_id' => $kitchen->id,
            'bar_station_id' => $bar->id,
        ]);

        $table = Table::query()->create(['name' => 'A1', 'zone_id' => $zone->id]);
        $qrCode = TableQrcode::query()->create(['table_id' => $table->id, 'qr_token' => str_repeat('a', 48)]);
        $category = MenuCategory::query()->create(['name' => 'Main']);
        $menuItem = MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Nasi Goreng',
            'price' => 25000,
            'print_to' => 'kitchen_bar',
        ]);

        return [$table, $qrCode, $menuItem, $kitchen, $bar];
    }
}
