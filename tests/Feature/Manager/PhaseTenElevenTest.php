<?php

namespace Tests\Feature\Manager;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\RestaurantUser;
use App\Models\Shift;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class PhaseTenElevenTest extends TestCase
{
    use InteractsWithRestaurant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->activeRestaurant();
    }

    public function test_manager_dashboard_renders_metrics(): void
    {
        KitchenStation::query()->create(['name' => 'Kitchen 1']);
        BarStation::query()->create(['name' => 'Bar 1']);

        $this->actingAs($this->manager(['dashboard.view']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard/Index')
                ->has('metrics.totalOrders')
                ->has('metrics.kitchenStations')
            );
    }

    public function test_cashier_report_includes_self_order_and_total(): void
    {
        $cashier = User::factory()->create(['role' => 'kasir', 'name' => 'Kasir Test']);
        $this->paidOrder($cashier, 'dine_in', 'cash', 10000);
        $this->paidOrder($cashier, 'self_order', 'qris', 15000);

        $this->actingAs($this->manager(['reports.view']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->get('/reports/kasir')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Cashier')
                ->where('rows.0.kasir_name', 'Kasir Test')
                ->where('rows.1.kasir_name', 'Self-Order')
                ->where('rows.2.kasir_name', 'TOTAL')
                ->has('shifts')
            );
    }

    public function test_cashier_report_shift_filter_limits_transactions_to_shift_window(): void
    {
        $cashier = User::factory()->create(['name' => 'Kasir Shift']);
        $shift = Shift::query()->create([
            'kasir_id' => $cashier->id,
            'opening_cash' => 0,
            'opened_at' => today()->setTime(10, 0),
            'closed_at' => today()->setTime(12, 0),
        ]);

        $this->paidOrder($cashier, 'dine_in', 'cash', 10000, today()->setTime(11, 0));
        $this->paidOrder($cashier, 'dine_in', 'cash', 20000, today()->setTime(14, 0));

        $this->actingAs($this->manager(['reports.view']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->get('/reports/kasir?shift_id='.$shift->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Cashier')
                ->where('rows.0.kasir_name', 'Kasir Shift')
                ->where('rows.0.total_transactions', 1)
                ->where('rows.0.total_revenue', fn ($value) => (float) $value === 10000.0)
                ->where('rows.1.kasir_name', 'TOTAL')
                ->where('rows.1.total_transactions', 1)
            );
    }

    public function test_cashier_report_export_excel_downloads_spreadsheet(): void
    {
        $cashier = User::factory()->create(['role' => 'kasir', 'name' => 'Kasir Export']);
        $this->paidOrder($cashier, 'dine_in', 'cash', 10000);

        $response = $this->actingAs($this->manager(['reports.view']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->get('/reports/kasir/export/excel')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.ms-excel; charset=UTF-8');

        $this->assertStringContainsString('laporan-kasir-', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('.xls', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('Kasir Export', $response->getContent());
        $this->assertStringContainsString('TOTAL', $response->getContent());
    }

    public function test_cashier_report_export_pdf_downloads_document(): void
    {
        $cashier = User::factory()->create(['role' => 'kasir', 'name' => 'Kasir Export']);
        $this->paidOrder($cashier, 'dine_in', 'cash', 10000);

        $response = $this->actingAs($this->manager(['reports.view']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->get('/reports/kasir/export/pdf')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringContainsString('laporan-kasir-', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('.pdf', $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_cashier_report_export_requires_permission(): void
    {
        $this->actingAs($this->managerFor($this->restaurant, []))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->get('/reports/kasir/export/excel')
            ->assertForbidden();
    }

    public function test_user_role_change_updates_restaurant_role(): void
    {
        $user = User::factory()->create();
        RestaurantUser::query()->create([
            'restaurant_id' => $this->restaurant->id,
            'user_id' => $user->id,
            'role' => 'kasir',
            'is_primary' => true,
        ]);

        $this->actingAs($this->manager(['users.view', 'users.manage']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->put("/users/{$user->id}", [
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'manager',
                'is_active' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('restaurant_users', [
            'restaurant_id' => $this->restaurant->id,
            'user_id' => $user->id,
            'role' => 'manager',
        ]);
    }

    public function test_system_settings_update_creates_audit_log(): void
    {
        $this->actingAs($this->manager(['settings.view', 'settings.manage']))
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->put('/settings/system', [
                'restaurant_name' => 'Karcisqu Test',
                'restaurant_address' => 'Jl. Test No. 1',
                'restaurant_phone' => null,
                'receipt_header' => null,
                'receipt_footer' => null,
                'tax_percentage' => 11,
                'tax_is_active' => true,
                'service_charge_percentage' => 5,
                'service_charge_is_active' => true,
            ])
            ->assertRedirect();

        $this->assertSame('Karcisqu Test', $this->restaurant->refresh()->name);
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.system.updated']);
    }

    private function manager(array $permissions): User
    {
        return $this->managerFor($this->restaurant, $permissions);
    }

    private function paidOrder(User $cashier, string $orderType, string $paymentMethod, int $amount, ?Carbon $paidAt = null): void
    {
        $zone = Zone::query()->firstOrCreate(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'T'.uniqid(), 'zone_id' => $zone->id]);
        $category = MenuCategory::query()->create(['name' => 'Main'.uniqid()]);
        $menuItem = MenuItem::query()->create(['category_id' => $category->id, 'name' => 'Item'.uniqid(), 'price' => $amount]);
        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => $orderType === 'self_order' ? null : $cashier->id,
            'order_type' => $orderType,
            'status' => 'paid',
            'subtotal' => $amount,
            'total_amount' => $amount,
        ]);
        $order->items()->create([
            'menu_item_id' => $menuItem->id,
            'quantity' => 1,
            'unit_price' => $amount,
            'subtotal' => $amount,
            'status' => 'sent',
        ]);
        Transaction::query()->create([
            'order_id' => $order->id,
            'kasir_id' => $cashier->id,
            'payment_method' => $paymentMethod,
            'amount_paid' => $amount,
            'change_amount' => 0,
            'status' => 'paid',
            'paid_at' => $paidAt ?? now(),
        ]);
    }
}
