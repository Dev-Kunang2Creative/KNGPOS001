<?php

namespace Tests\Feature\Manager;

use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class MenuManagementTest extends TestCase
{
    use RefreshDatabase;

    private function manager(): User
    {
        Permission::query()->firstOrCreate(['name' => 'menu.view', 'guard_name' => 'web']);
        Permission::query()->firstOrCreate(['name' => 'menu.manage', 'guard_name' => 'web']);

        $user = User::factory()->create(['role' => 'manager']);
        $user->givePermissionTo(['menu.view', 'menu.manage']);

        return $user;
    }

    public function test_manager_can_create_category_and_item_with_print_target(): void
    {
        $category = MenuCategory::query()->create(['name' => 'Makanan', 'sort_order' => 1, 'is_active' => true]);

        $this->actingAs($this->manager())
            ->post('/menu/items', [
                'category_id' => $category->id,
                'name' => 'Nasi Goreng',
                'description' => 'Pedas',
                'price' => 35000,
                'print_to' => 'kitchen',
                'is_available' => true,
                'sort_order' => 1,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('menu_items', [
            'name' => 'Nasi Goreng',
            'print_to' => 'kitchen',
        ]);
    }

    public function test_category_with_active_items_cannot_be_deleted(): void
    {
        $category = MenuCategory::query()->create(['name' => 'Makanan', 'sort_order' => 1, 'is_active' => true]);
        MenuItem::query()->create([
            'category_id' => $category->id,
            'name' => 'Sate',
            'price' => 30000,
            'print_to' => 'kitchen',
            'is_available' => true,
            'sort_order' => 1,
        ]);

        $this->actingAs($this->manager())
            ->delete("/menu/categories/{$category->id}")
            ->assertRedirect()
            ->assertSessionHas('error');
    }
}
