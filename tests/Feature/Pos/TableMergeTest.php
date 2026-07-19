<?php

namespace Tests\Feature\Pos;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\Table;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithRestaurant;
use Tests\TestCase;

class TableMergeTest extends TestCase
{
    use InteractsWithRestaurant;
    use RefreshDatabase;

    private User $kasir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->activeRestaurant();
        $this->kasir = $this->managerFor($this->restaurant, ['pos.view', 'pos.create', 'pos.checkout']);
    }

    public function test_merge_combines_open_bills_into_target_table(): void
    {
        $target = $this->table('A1');
        $source = $this->table('A2');
        $targetOrder = $this->openOrder($target, 20000);
        $sourceOrder = $this->openOrder($source, 15000);

        $this->actingAs($this->kasir)
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/pos/tables/merge', ['target_table_id' => $target->id, 'table_ids' => [$source->id]])
            ->assertRedirect()
            ->assertSessionHas('success');

        $targetOrder->refresh();
        $this->assertSame(2, $targetOrder->items()->count());
        $this->assertSame(35000.0, (float) $targetOrder->subtotal);
        $this->assertSame('cancelled', $sourceOrder->refresh()->status);
        $this->assertStringContainsString("Digabung ke Order #{$targetOrder->id}", (string) $sourceOrder->notes);

        $source->refresh();
        $this->assertSame($target->id, $source->merged_into_table_id);
        $this->assertSame('open_bill', $source->status);
        $this->assertSame('open_bill', $target->refresh()->status);
    }

    public function test_merge_can_include_empty_table_and_moves_bill_to_empty_target(): void
    {
        $target = $this->table('B1');
        $withBill = $this->table('B2');
        $empty = $this->table('B3');
        $order = $this->openOrder($withBill, 10000);

        $this->actingAs($this->kasir)
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/pos/tables/merge', ['target_table_id' => $target->id, 'table_ids' => [$withBill->id, $empty->id]])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertSame($target->id, $order->refresh()->table_id);
        $this->assertSame($target->id, $empty->refresh()->merged_into_table_id);
        $this->assertSame('open_bill', $empty->status);
        $this->assertSame($target->id, $withBill->refresh()->merged_into_table_id);
    }

    public function test_paying_merged_bill_releases_all_tables(): void
    {
        $target = $this->table('C1');
        $source = $this->table('C2');
        $targetOrder = $this->openOrder($target, 20000);
        $this->openOrder($source, 15000);

        $this->actingAs($this->kasir)
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/pos/tables/merge', ['target_table_id' => $target->id, 'table_ids' => [$source->id]])
            ->assertRedirect();

        $this->actingAs($this->kasir)
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post("/pos/orders/{$targetOrder->id}/pay", ['amount_paid' => 50000])
            ->assertRedirect();

        $this->assertSame('paid', $targetOrder->refresh()->status);
        $source->refresh();
        $this->assertNull($source->merged_into_table_id);
        $this->assertSame('occupied', $source->status);
        $this->assertSame('occupied', $target->refresh()->status);
    }

    public function test_unmerge_releases_tables_and_keeps_bill_on_target(): void
    {
        $target = $this->table('D1');
        $source = $this->table('D2');
        $targetOrder = $this->openOrder($target, 20000);
        $this->openOrder($source, 15000);

        $this->actingAs($this->kasir)
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/pos/tables/merge', ['target_table_id' => $target->id, 'table_ids' => [$source->id]])
            ->assertRedirect();

        $this->actingAs($this->kasir)
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post("/pos/tables/{$target->id}/unmerge")
            ->assertRedirect()
            ->assertSessionHas('success');

        $source->refresh();
        $this->assertNull($source->merged_into_table_id);
        $this->assertSame('occupied', $source->status);
        $this->assertSame(2, $targetOrder->refresh()->items()->count());
        $this->assertSame('open_bill', $target->refresh()->status);
    }

    public function test_cannot_merge_tables_without_any_open_bill(): void
    {
        $target = $this->table('E1');
        $source = $this->table('E2');

        $this->actingAs($this->kasir)
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/pos/tables/merge', ['target_table_id' => $target->id, 'table_ids' => [$source->id]])
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertNull($source->refresh()->merged_into_table_id);
    }

    public function test_cannot_merge_bill_owned_by_other_cashier(): void
    {
        $otherKasir = User::factory()->create();
        $target = $this->table('F1');
        $source = $this->table('F2');
        $this->openOrder($target, 20000);
        $this->openOrder($source, 15000, $otherKasir);

        $this->actingAs($this->kasir)
            ->withSession(['active_restaurant_id' => $this->restaurant->id])
            ->post('/pos/tables/merge', ['target_table_id' => $target->id, 'table_ids' => [$source->id]])
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertNull($source->refresh()->merged_into_table_id);
    }

    private function table(string $name): Table
    {
        $zone = Zone::query()->firstOrCreate(['name' => 'Indoor']);

        return Table::query()->create(['name' => $name, 'zone_id' => $zone->id]);
    }

    private function openOrder(Table $table, int $amount, ?User $kasir = null): Order
    {
        $category = MenuCategory::query()->firstOrCreate(['name' => 'Makanan']);
        $menuItem = MenuItem::query()->create(['category_id' => $category->id, 'name' => 'Item'.uniqid(), 'price' => $amount]);

        $order = Order::query()->create([
            'table_id' => $table->id,
            'kasir_id' => ($kasir ?? $this->kasir)->id,
            'order_type' => 'dine_in',
            'status' => 'submitted',
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

        $table->update(['status' => 'open_bill']);

        return $order;
    }
}
