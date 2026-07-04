<?php

namespace Tests\Feature\Manager;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Restaurant;
use App\Models\Zone;
use App\Services\ReportService;
use App\Services\RestaurantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardMetricsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_metrics_include_top_menu_revenue_trend_and_payment_methods(): void
    {
        $restaurant = Restaurant::query()->create(['name' => 'Test Resto', 'slug' => 'test-resto']);
        app(RestaurantContext::class)->set($restaurant->id);

        $cashier = User::factory()->create();
        $zone = Zone::query()->create(['name' => 'Indoor']);
        $table = Table::query()->create(['name' => 'T1', 'zone_id' => $zone->id]);
        $category = MenuCategory::query()->create(['name' => 'Main']);
        $nasi = MenuItem::query()->create(['category_id' => $category->id, 'name' => 'Nasi Goreng', 'price' => 25000, 'print_to' => 'kitchen']);
        $esTeh = MenuItem::query()->create(['category_id' => $category->id, 'name' => 'Es Teh', 'price' => 5000, 'print_to' => 'bar']);

        // Paid order today: 3x Nasi Goreng + 1x Es Teh, paid by cash.
        $order = Order::query()->create(['table_id' => $table->id, 'kasir_id' => $cashier->id, 'status' => 'paid', 'subtotal' => 80000, 'total_amount' => 80000]);
        $order->items()->create(['menu_item_id' => $nasi->id, 'quantity' => 3, 'unit_price' => 25000, 'subtotal' => 75000, 'status' => 'sent']);
        $order->items()->create(['menu_item_id' => $esTeh->id, 'quantity' => 1, 'unit_price' => 5000, 'subtotal' => 5000, 'status' => 'sent']);
        Transaction::query()->create(['order_id' => $order->id, 'kasir_id' => $cashier->id, 'payment_method' => 'cash', 'amount_paid' => 80000, 'change_amount' => 0, 'status' => 'paid', 'paid_at' => now()]);

        // Second paid order today: 1x Es Teh, paid by QRIS.
        $order2 = Order::query()->create(['table_id' => $table->id, 'kasir_id' => $cashier->id, 'status' => 'paid', 'subtotal' => 5000, 'total_amount' => 5000]);
        $order2->items()->create(['menu_item_id' => $esTeh->id, 'quantity' => 1, 'unit_price' => 5000, 'subtotal' => 5000, 'status' => 'sent']);
        Transaction::query()->create(['order_id' => $order2->id, 'kasir_id' => $cashier->id, 'payment_method' => 'qris', 'amount_paid' => 5000, 'change_amount' => 0, 'status' => 'paid', 'paid_at' => now()]);

        $metrics = app(ReportService::class)->dashboardMetrics();

        $this->assertEquals(85000, $metrics['todayRevenue']);
        $this->assertSame(2, $metrics['todayTransactions']);
        $this->assertEquals(42500, $metrics['avgOrderValue']);

        // Top menu ranked by quantity: Nasi Goreng (3) then Es Teh (2).
        $this->assertCount(2, $metrics['topMenuItems']);
        $this->assertSame('Nasi Goreng', $metrics['topMenuItems'][0]['name']);
        $this->assertSame(3, $metrics['topMenuItems'][0]['quantity']);
        $this->assertSame('Es Teh', $metrics['topMenuItems'][1]['name']);
        $this->assertSame(2, $metrics['topMenuItems'][1]['quantity']);

        // Revenue trend covers 7 days, ending today with the full amount.
        $this->assertCount(7, $metrics['revenueTrend']);
        $this->assertEquals(85000, $metrics['revenueTrend'][6]['revenue']);
        $this->assertEquals(0, $metrics['revenueTrend'][0]['revenue']);

        // Payment methods grouped and sorted by amount descending.
        $this->assertSame('cash', $metrics['paymentMethods'][0]['method']);
        $methods = collect($metrics['paymentMethods'])->keyBy('method');
        $this->assertEquals(80000, $methods['cash']['amount']);
        $this->assertEquals(5000, $methods['qris']['amount']);
    }
}
