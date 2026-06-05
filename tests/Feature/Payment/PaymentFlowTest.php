<?php

namespace Tests\Feature\Payment;

use App\Models\BarOrder;
use App\Models\BarStation;
use App\Models\KitchenOrder;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Shift;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\User;
use App\Models\XenditPayment;
use App\Models\Zone;
use App\Models\ZoneStationAssignment;
use App\Services\PaymentService;
use App\Services\OrderRoutingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PaymentFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_cash_payment_calculates_total_server_side_and_creates_transaction(): void
    {
        $cashier = User::factory()->create(['role' => 'kasir']);
        $order = $this->orderWithItemTotal($cashier, 25000);
        $order->table()->update(['status' => 'occupied']);

        $transaction = app(PaymentService::class)->createCashPayment($order, $cashier, 30000);

        $this->assertSame('paid', $transaction->status);
        $this->assertEquals(30000, (float) $transaction->amount_paid);
        $this->assertEquals(5000, (float) $transaction->change_amount);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('tables', ['id' => $order->table_id, 'status' => 'occupied']);
    }

    public function test_cash_payment_route_redirects_to_printable_receipt(): void
    {
        foreach (['pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $order = $this->orderWithItemTotal($cashier, 25000);

        $response = $this->actingAs($cashier)
            ->post("/pos/orders/{$order->id}/pay", ['amount_paid' => 30000]);

        $transaction = Transaction::query()->where('order_id', $order->id)->firstOrFail();

        $response->assertRedirect(route('pos.transactions.receipt', $transaction));
        $this->actingAs($cashier)
            ->get(route('pos.transactions.receipt', $transaction))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/Receipt')
                ->where('transaction.id', $transaction->id));
    }

    public function test_close_bill_creates_routes_pays_and_redirects_to_receipt(): void
    {
        foreach (['pos.create', 'pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.create', 'pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

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
            'price' => 25000,
            'print_to' => 'kitchen',
        ]);
        $barItem = MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Es Teh',
            'price' => 5000,
            'print_to' => 'bar',
        ]);

        $response = $this->actingAs($cashier)
            ->post('/pos/orders/close-bill', [
                'table_id' => $table->id,
                'bill_mode' => 'close_bill',
                'amount_paid' => 35000,
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                    ['menu_item_id' => $barItem->id, 'quantity' => 1],
                ],
            ]);

        $order = Order::query()->firstOrFail();
        $transaction = Transaction::query()->where('order_id', $order->id)->firstOrFail();

        $response->assertRedirect(route('pos.transactions.receipt', $transaction));
        $this->actingAs($cashier)
            ->get(route('pos.transactions.receipt', $transaction))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/Receipt')
                ->where('transaction.id', $transaction->id)
                ->has('stationTicketUrls', 2)
                ->where('stationTicketUrls.0.type', 'kitchen')
                ->where('stationTicketUrls.1.type', 'bar')
                ->where('stationTicketUrls.0.url', fn (string $url) => str_contains($url, 'kitchen_order=') && ! str_contains($url, 'bar_order='))
                ->where('stationTicketUrls.1.url', fn (string $url) => str_contains($url, 'bar_order=') && ! str_contains($url, 'kitchen_order=')));
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'status' => 'paid', 'change_amount' => 5000]);
        $this->assertDatabaseHas('kitchen_orders', ['order_id' => $order->id, 'kitchen_station_id' => $kitchen->id]);
        $this->assertDatabaseHas('bar_orders', ['order_id' => $order->id, 'bar_station_id' => $bar->id]);
        $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => 'occupied']);
    }

    public function test_close_bill_can_generate_xendit_qris_payment(): void
    {
        foreach (['pos.create', 'pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        Http::fake([
            'api.xendit.co/qr_codes' => Http::response([
                'id' => 'qr_close_bill',
                'status' => 'ACTIVE',
                'qr_string' => '000201010212-close-bill',
            ]),
        ]);
        config([
            'services.xendit.secret_key' => 'xnd_development_test',
            'services.xendit.enabled' => true,
        ]);

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.create', 'pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

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
            'price' => 25000,
            'print_to' => 'kitchen',
        ]);

        $response = $this->actingAs($cashier)
            ->post('/pos/orders/close-bill', [
                'table_id' => $table->id,
                'bill_mode' => 'close_bill',
                'payment_method' => 'qris',
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ]);

        $order = Order::query()->firstOrFail();
        $transaction = Transaction::query()->where('order_id', $order->id)->firstOrFail();
        $payment = XenditPayment::query()->where('transaction_id', $transaction->id)->firstOrFail();

        $response->assertRedirect(route('pos.xendit.show', $payment));
        $this->actingAs($cashier)
            ->get(route('pos.xendit.show', $payment))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/PaymentPending')
                ->where('payment.id', $payment->id)
                ->where('transaction.id', $transaction->id)
                ->where('order.id', $order->id));
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'open']);
        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'payment_method' => 'qris', 'status' => 'pending']);
        $this->assertDatabaseHas('xendit_payments', ['id' => $payment->id, 'xendit_invoice_id' => 'qr_close_bill']);
        $this->assertDatabaseMissing('kitchen_orders', ['order_id' => $order->id, 'kitchen_station_id' => $kitchen->id]);
        app(PaymentService::class)->markXenditPaymentPaid($payment->external_id, [
            'reference_id' => $payment->external_id,
            'status' => 'SUCCEEDED',
        ], app(OrderRoutingService::class));

        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'status' => 'paid']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('kitchen_orders', ['order_id' => $order->id, 'kitchen_station_id' => $kitchen->id]);
        Http::assertSent(fn ($request) => $request->url() === 'https://api.xendit.co/qr_codes'
            && $request['amount'] === 25000
            && $request['currency'] === 'IDR');
    }

    public function test_close_bill_allows_occupied_table_for_additional_order(): void
    {
        foreach (['pos.create', 'pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.create', 'pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'T1', 'zone_id' => $zone->id, 'status' => 'occupied']);
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
            'price' => 25000,
            'print_to' => 'kitchen',
        ]);

        $response = $this->actingAs($cashier)
            ->post('/pos/orders/close-bill', [
                'table_id' => $table->id,
                'bill_mode' => 'close_bill',
                'amount_paid' => 30000,
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ]);

        $order = Order::query()->firstOrFail();
        $transaction = Transaction::query()->where('order_id', $order->id)->firstOrFail();

        $response->assertRedirect(route('pos.transactions.receipt', $transaction));
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->assertDatabaseHas('tables', ['id' => $table->id, 'status' => 'occupied']);
    }

    public function test_close_bill_rejects_table_with_open_bill(): void
    {
        foreach (['pos.create', 'pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.create', 'pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'T1', 'zone_id' => $zone->id, 'status' => 'open_bill']);
        $category = MenuCategory::query()->create(['name' => 'Main']);
        $menuItem = MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Nasi',
            'price' => 25000,
            'print_to' => 'kitchen',
        ]);

        $this->actingAs($cashier)
            ->from('/pos')
            ->post('/pos/orders/close-bill', [
                'table_id' => $table->id,
                'bill_mode' => 'close_bill',
                'amount_paid' => 30000,
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ])
            ->assertRedirect('/pos')
            ->assertSessionHas('error', 'Meja ini sedang memiliki open bill, reserved, atau blocked. Buka open bill yang ada atau pilih meja lain.');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_open_bill_can_add_items_and_payment_requires_printing_pending_items(): void
    {
        foreach (['pos.create', 'pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.create', 'pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $order = $this->orderWithItemTotal($cashier, 25000);
        $category = MenuCategory::query()->firstOrFail();
        $menuItem = MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Es Teh',
            'price' => 8000,
            'print_to' => 'bar',
        ]);

        $this->actingAs($cashier)
            ->post("/pos/orders/{$order->id}/items", [
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 2],
                ],
            ])
            ->assertRedirect(route('pos.index', ['order' => $order->id]))
            ->assertSessionHas('success', 'Item berhasil ditambahkan ke open bill. Cetak ke Kitchen/Bar untuk mengirim item baru.');

        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'quantity' => 2,
            'subtotal' => 16000,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'subtotal' => 41000,
            'total_amount' => 41000,
        ]);
        $this->assertDatabaseHas('tables', ['id' => $order->table_id, 'status' => 'open_bill']);

        $this->actingAs($cashier)
            ->from('/pos?order='.$order->id)
            ->post("/pos/orders/{$order->id}/pay", ['amount_paid' => 50000])
            ->assertRedirect('/pos?order='.$order->id)
            ->assertSessionHas('error', 'Masih ada item baru yang belum dicetak ke Kitchen/Bar.');

        $response = $this->actingAs($cashier)
            ->post("/pos/orders/{$order->id}/submit");

        $barOrder = BarOrder::query()->where('order_id', $order->id)->firstOrFail();

        $response->assertRedirect(route('pos.orders.station-ticket', [
            'order' => $order->id,
            'bar_order' => $barOrder->id,
        ]));
        $this->actingAs($cashier)
            ->get(route('pos.orders.station-ticket', [
                'order' => $order->id,
                'bar_order' => $barOrder->id,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/StationTicket')
                ->where('order.id', $order->id)
                ->has('barOrders', 1));

        $response = $this->actingAs($cashier)
            ->post("/pos/orders/{$order->id}/items/submit", [
                'items' => [
                    ['menu_item_id' => $menuItem->id, 'quantity' => 1],
                ],
            ]);

        $latestBarOrder = BarOrder::query()->where('order_id', $order->id)->latest('id')->firstOrFail();

        $response->assertRedirect(route('pos.orders.station-ticket', [
            'order' => $order->id,
            'bar_order' => $latestBarOrder->id,
        ]));
        $this->assertDatabaseHas('order_items', [
            'order_id' => $order->id,
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'status' => 'sent',
        ]);

        $foodItem = MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Mie Goreng',
            'price' => 18000,
            'print_to' => 'kitchen',
        ]);

        $response = $this->actingAs($cashier)
            ->post("/pos/orders/{$order->id}/items/submit", [
                'items' => [
                    ['menu_item_id' => $foodItem->id, 'quantity' => 1],
                ],
            ]);

        $latestKitchenOrder = KitchenOrder::query()->where('order_id', $order->id)->latest('id')->firstOrFail();

        $response->assertRedirect(route('pos.orders.station-ticket', [
            'order' => $order->id,
            'kitchen_order' => $latestKitchenOrder->id,
        ]));
        $this->actingAs($cashier)
            ->get(route('pos.orders.station-ticket', [
                'order' => $order->id,
                'kitchen_order' => $latestKitchenOrder->id,
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/StationTicket')
                ->has('kitchenOrders', 1)
                ->has('barOrders', 0));
    }

    public function test_xendit_callback_validates_token_logs_and_is_idempotent(): void
    {
        config(['services.xendit.webhook_token' => 'verify-token']);
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
        config([
            'services.xendit.secret_key' => 'xnd_development_test',
            'services.xendit.enabled' => true,
        ]);
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

    public function test_cashier_can_simulate_xendit_qris_payment_in_test_mode(): void
    {
        Permission::query()->firstOrCreate(['name' => 'pos.checkout', 'guard_name' => 'web']);
        Permission::query()->firstOrCreate(['name' => 'shift.view', 'guard_name' => 'web']);

        Http::fake([
            'api.xendit.co/qr_codes/qr_test/payments/simulate' => Http::response([
                'id' => 'qrpy_test',
                'status' => 'SUCCEEDED',
                'reference_id' => 'karcisqu-test-2',
            ]),
        ]);

        config([
            'services.xendit.secret_key' => 'xnd_development_test',
            'services.xendit.enabled' => true,
        ]);

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $order = $this->orderWithItemTotal($cashier, 20000);
        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => $cashier->id,
            'payment_method' => 'qris',
            'amount_paid' => 20000,
            'change_amount' => 0,
            'status' => 'pending',
        ]);
        $payment = XenditPayment::query()->create([
            'transaction_id' => $transaction->id,
            'external_id' => 'karcisqu-test-2',
            'xendit_invoice_id' => 'qr_test',
            'payment_method' => 'qris',
            'amount' => 20000,
            'status' => 'ACTIVE',
        ]);

        $this->actingAs($cashier)
            ->post(route('pos.orders.xendit.simulate', [$order, $payment]))
            ->assertRedirect(route('pos.xendit.success', $payment));

        $this->assertDatabaseHas('xendit_payments', ['id' => $payment->id, 'status' => 'paid']);
        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'status' => 'paid']);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'paid']);
        $this->actingAs($cashier)
            ->get(route('pos.xendit.success', $payment))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/PaymentSuccess')
                ->where('payment.id', $payment->id)
                ->where('transaction.id', $transaction->id)
                ->where('redirectSeconds', 3));
        Http::assertSent(fn ($request) => $request->url() === 'https://api.xendit.co/qr_codes/qr_test/payments/simulate'
            && $request['amount'] === 20000);
    }

    public function test_xendit_qris_simulation_rejects_live_secret_key(): void
    {
        Permission::query()->firstOrCreate(['name' => 'pos.checkout', 'guard_name' => 'web']);
        Permission::query()->firstOrCreate(['name' => 'shift.view', 'guard_name' => 'web']);

        Http::fake();

        config([
            'services.xendit.secret_key' => 'xnd_production_test',
            'services.xendit.enabled' => true,
        ]);

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $order = $this->orderWithItemTotal($cashier, 20000);
        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => $cashier->id,
            'payment_method' => 'qris',
            'amount_paid' => 20000,
            'change_amount' => 0,
            'status' => 'pending',
        ]);
        $payment = XenditPayment::query()->create([
            'transaction_id' => $transaction->id,
            'external_id' => 'karcisqu-test-3',
            'xendit_invoice_id' => 'qr_test',
            'payment_method' => 'qris',
            'amount' => 20000,
            'status' => 'ACTIVE',
        ]);

        $this->actingAs($cashier)
            ->from(route('pos.index', ['order' => $order->id, 'payment' => $payment->id]))
            ->post(route('pos.orders.xendit.simulate', [$order, $payment]))
            ->assertRedirect(route('pos.index', ['order' => $order->id, 'payment' => $payment->id]))
            ->assertSessionHas('error', 'Simulasi pembayaran hanya tersedia untuk Xendit Test Mode.');

        $this->assertDatabaseHas('xendit_payments', ['id' => $payment->id, 'status' => 'ACTIVE']);
        $this->assertDatabaseHas('transactions', ['id' => $transaction->id, 'status' => 'pending']);
        Http::assertNothingSent();
    }

    public function test_pos_index_auto_loads_pending_xendit_payment_for_active_order(): void
    {
        foreach (['pos.view', 'pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.view', 'pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $order = $this->orderWithItemTotal($cashier, 20000);

        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => $cashier->id,
            'payment_method' => 'qris',
            'amount_paid' => 20000,
            'change_amount' => 0,
            'status' => 'pending',
        ]);
        $payment = XenditPayment::query()->create([
            'transaction_id' => $transaction->id,
            'external_id' => 'karcisqu-auto-test',
            'payment_method' => 'qris',
            'amount' => 20000,
            'status' => 'ACTIVE',
            'xendit_raw_response' => ['qr_string' => '000201...'],
        ]);

        $this->actingAs($cashier)
            ->get(route('pos.index', ['order' => $order->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/Index')
                ->where('xenditPayment.id', $payment->id)
                ->where('xenditPayment.status', 'ACTIVE'));
    }

    public function test_pos_index_does_not_load_paid_xendit_payment_for_active_order(): void
    {
        foreach (['pos.view', 'pos.checkout', 'shift.view'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $cashier = User::factory()->create(['role' => 'kasir']);
        $cashier->givePermissionTo(['pos.view', 'pos.checkout', 'shift.view']);
        Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 100000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $order = $this->orderWithItemTotal($cashier, 20000);
        $order->update(['status' => 'paid']);

        $transaction = Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => $cashier->id,
            'payment_method' => 'qris',
            'amount_paid' => 20000,
            'change_amount' => 0,
            'status' => 'paid',
        ]);
        XenditPayment::query()->create([
            'transaction_id' => $transaction->id,
            'external_id' => 'karcisqu-paid-test',
            'payment_method' => 'qris',
            'amount' => 20000,
            'status' => 'paid',
        ]);

        $this->actingAs($cashier)
            ->get(route('pos.index', ['order' => $order->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Pos/Index')
                ->where('activeOrder', null)
                ->where('xenditPayment', null));
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
