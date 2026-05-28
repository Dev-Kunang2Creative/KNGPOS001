<?php

namespace Tests\Feature\Cashier;

use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
