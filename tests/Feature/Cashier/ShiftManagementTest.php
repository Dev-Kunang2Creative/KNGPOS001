<?php

namespace Tests\Feature\Cashier;

use App\Models\CashierShiftSummary;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ShiftManagementTest extends TestCase
{
    use RefreshDatabase;

    private function cashier(): User
    {
        foreach (['pos.view', 'shift.view', 'shift.open', 'shift.close'] as $permission) {
            Permission::query()->firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $user = User::factory()->create(['role' => 'kasir']);
        $user->givePermissionTo(['pos.view', 'shift.view', 'shift.open', 'shift.close']);

        return $user;
    }

    private function manager(): User
    {
        Permission::query()->firstOrCreate(['name' => 'shift.view', 'guard_name' => 'web']);

        $user = User::factory()->create(['role' => 'manager']);
        $user->givePermissionTo('shift.view');

        return $user;
    }

    public function test_cashier_without_active_shift_is_redirected_from_pos(): void
    {
        $this->actingAs($this->cashier())
            ->get('/pos')
            ->assertRedirect('/shifts');
    }

    public function test_cashier_can_open_and_close_shift(): void
    {
        $cashier = $this->cashier();

        $this->actingAs($cashier)
            ->post('/shifts', ['opening_cash' => 100000])
            ->assertRedirect('/pos');

        $shift = Shift::query()->where('kasir_id', $cashier->id)->firstOrFail();
        $this->assertSame('open', $shift->status);

        $this->actingAs($cashier)
            ->post("/shifts/{$shift->id}/close", ['closing_cash' => 100000])
            ->assertRedirect('/shifts');

        $this->assertDatabaseHas('shifts', ['id' => $shift->id, 'status' => 'closed']);
        $this->assertDatabaseHas('cashier_shift_summaries', ['shift_id' => $shift->id]);
    }

    public function test_cashier_only_sees_own_shift_history(): void
    {
        $cashier = $this->cashier();
        $otherCashier = $this->cashier();

        Shift::query()->create(['kasir_id' => $cashier->id, 'opening_cash' => 100000, 'status' => 'open', 'opened_at' => now()]);
        Shift::query()->create(['kasir_id' => $otherCashier->id, 'opening_cash' => 200000, 'status' => 'open', 'opened_at' => now()->addMinute()]);

        $this->actingAs($cashier)
            ->get('/shifts')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shifts/Index')
                ->has('shifts', 1)
                ->where('shifts.0.kasir_id', $cashier->id));
    }

    public function test_manager_sees_all_shift_history_with_cashier_and_summary(): void
    {
        $cashierOne = $this->cashier();
        $cashierTwo = $this->cashier();

        $olderShift = Shift::query()->create([
            'kasir_id' => $cashierOne->id,
            'opening_cash' => 100000,
            'closing_cash' => 160000,
            'status' => 'closed',
            'opened_at' => now()->subHours(2),
            'closed_at' => now()->subHour(),
        ]);
        CashierShiftSummary::query()->create([
            'shift_id' => $olderShift->id,
            'total_cash' => 50000,
            'total_qris' => 25000,
            'total_transactions' => 2,
            'total_revenue' => 75000,
            'cash_difference' => 10000,
        ]);

        Shift::query()->create([
            'kasir_id' => $cashierTwo->id,
            'opening_cash' => 200000,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $this->actingAs($this->manager())
            ->get('/shifts')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Shifts/Index')
                ->has('shifts', 2)
                ->where('shifts.1.cashier.name', $cashierOne->name)
                ->where('shifts.1.summary.total_revenue', '75000.00')
                ->where('shifts.1.summary.cash_difference', '10000.00'));
    }
}
