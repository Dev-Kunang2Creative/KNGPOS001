<?php

namespace Tests\Feature\Manager;

use App\Models\BarStation;
use App\Models\KitchenStation;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\SystemSettings;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PhaseTenElevenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_manager_dashboard_renders_metrics(): void
    {
        KitchenStation::query()->create(['name' => 'Kitchen 1']);
        BarStation::query()->create(['name' => 'Bar 1']);

        $this->actingAs($this->manager(['dashboard.view']))
            ->get('/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard/Index')
                ->has('metrics.totalOrders')
                ->has('metrics.kitchenStations')
            );
    }

    public function test_cashier_report_includes_self_order_and_total_and_exports_csv(): void
    {
        $cashier = User::factory()->create(['role' => 'kasir', 'name' => 'Kasir Test']);
        $this->paidOrder($cashier, 'dine_in', 'cash', 10000);
        $this->paidOrder($cashier, 'self_order', 'qris', 15000);

        $this->actingAs($this->manager(['reports.view', 'reports.export']))
            ->get('/reports/kasir')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Cashier')
                ->where('rows.0.kasir_name', 'Kasir Test')
                ->where('rows.1.kasir_name', 'Self-Order')
                ->where('rows.2.kasir_name', 'TOTAL')
            );

        $this->actingAs($this->manager(['reports.view', 'reports.export']))
            ->post('/reports/kasir/export')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');

        $this->actingAs($this->manager(['reports.view', 'reports.export']))
            ->post('/reports/kasir/export', ['format' => 'pdf'])
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_user_role_change_creates_audit_log(): void
    {
        $user = User::factory()->create(['role' => 'kasir']);

        $this->actingAs($this->manager(['users.view', 'users.manage']))
            ->put("/users/{$user->id}", [
                'name' => $user->name,
                'email' => $user->email,
                'role' => 'manager',
                'is_active' => true,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.role.updated',
            'resource_type' => User::class,
            'resource_id' => $user->id,
        ]);
    }

    public function test_system_settings_update_creates_audit_log(): void
    {
        $this->actingAs($this->manager(['settings.view', 'settings.manage']))
            ->put('/settings/system', [
                'restaurant_name' => 'Karcisqu Test',
                'tax_percentage' => 11,
                'tax_is_active' => true,
                'service_charge_percentage' => 5,
                'service_charge_is_active' => true,
                'xendit_enabled' => true,
            ])
            ->assertRedirect();

        $this->assertSame('Karcisqu Test', SystemSettings::get('restaurant_name'));
        $this->assertDatabaseHas('audit_logs', ['action' => 'settings.system.updated']);
    }

    private function manager(array $permissions): User
    {
        foreach ($permissions as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $user = User::factory()->create(['role' => 'manager']);
        $user->givePermissionTo($permissions);

        return $user;
    }

    private function paidOrder(User $cashier, string $orderType, string $paymentMethod, int $amount): void
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
            'paid_at' => now(),
        ]);
    }
}
