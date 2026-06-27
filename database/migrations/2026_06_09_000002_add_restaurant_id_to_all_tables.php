<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Only TOP-LEVEL entities that are directly queried need restaurant_id.
     * Child records (order_items, kitchen_orders, bar_orders, etc.) inherit
     * their restaurant scope through their parent relationship.
     *
     * Format: table_name => nullable
     */
    private array $tables = [
        // Core operational tables - direct query targets
        'zones' => false,
        'kitchen_stations' => false,
        'bar_stations' => false,
        'tables' => false,
        'menu_categories' => false,
        'menu_items' => false,
        'menu_promotions' => false,
        'orders' => false,
        'shifts' => false,
        'transactions' => false,
        'printers' => false,
        'self_orders' => false,
        'audit_logs' => true,       // nullable — some logs may be system-level
        'system_settings' => true,  // nullable — global settings have no restaurant
    ];

    // Child tables that DO NOT get restaurant_id:
    // - order_items → accessed via Order (scoped)
    // - kitchen_orders → accessed via Order or KitchenStation (both scoped)
    // - bar_orders → accessed via Order or BarStation (both scoped)
    // - kitchen_order_items → accessed via KitchenOrder
    // - bar_order_items → accessed via BarOrder
    // - self_order_items → accessed via SelfOrder (scoped)
    // - zone_station_assignments → accessed via Zone (scoped)
    // - waiter_zone_assignments → accessed via Zone/User
    // - table_qrcodes → accessed via Table (scoped)
    // - xendit_payments → accessed via Transaction (scoped)
    // - cashier_shift_summaries → accessed via Shift (scoped)
    // - kitchen_order_reassignments → accessed via KitchenOrder

    public function up(): void
    {
        // Step 1: Create a default restaurant from existing system_settings
        $restaurantName = DB::table('system_settings')
            ->where('key', 'restaurant_name')
            ->value('value') ?? config('app.name', 'Default Restaurant');

        $defaultRestaurantId = DB::table('restaurants')->insertGetId([
            'name' => $restaurantName,
            'slug' => Str::slug($restaurantName) ?: 'default',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Migrate restaurant-specific settings from system_settings to restaurant
        $settingsMapping = [
            'restaurant_address' => 'address',
            'restaurant_phone' => 'phone',
            'receipt_header' => 'receipt_header',
            'receipt_footer' => 'receipt_footer',
            'tax_percentage' => 'tax_percentage',
            'tax_is_active' => 'tax_is_active',
            'service_charge_percentage' => 'service_charge_percentage',
            'service_charge_is_active' => 'service_charge_is_active',
        ];

        $updateData = [];
        foreach ($settingsMapping as $settingKey => $restaurantColumn) {
            $value = DB::table('system_settings')->where('key', $settingKey)->value('value');
            if ($value !== null) {
                $updateData[$restaurantColumn] = $value;
            }
        }

        if (! empty($updateData)) {
            DB::table('restaurants')->where('id', $defaultRestaurantId)->update($updateData);
        }

        // Step 2: Assign all existing users to the default restaurant
        $users = DB::table('users')->get(['id', 'role']);
        foreach ($users as $user) {
            $role = $user->role ?? 'kasir';
            // super_admin doesn't need restaurant_users entry
            if ($role === 'super_admin') {
                continue;
            }

            DB::table('restaurant_users')->insert([
                'restaurant_id' => $defaultRestaurantId,
                'user_id' => $user->id,
                'role' => $role,
                'is_primary' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Set owner to the first manager user, if any
        $firstManager = DB::table('users')->where('role', 'manager')->first();
        if ($firstManager) {
            DB::table('restaurants')
                ->where('id', $defaultRestaurantId)
                ->update(['owner_id' => $firstManager->id]);
        }

        // Step 3: Add restaurant_id to top-level operational tables ONLY
        foreach ($this->tables as $tableName => $nullable) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }

            if (Schema::hasColumn($tableName, 'restaurant_id')) {
                continue;
            }

            // Add nullable column first
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('restaurant_id')->nullable()->after('id');
            });

            // Backfill all existing records
            DB::table($tableName)->whereNull('restaurant_id')->update([
                'restaurant_id' => $defaultRestaurantId,
            ]);

            // Make NOT NULL if required
            if (! $nullable) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->unsignedBigInteger('restaurant_id')->nullable(false)->change();
                });
            }

            // Add foreign key and index
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->foreign('restaurant_id')
                    ->references('id')
                    ->on('restaurants')
                    ->restrictOnDelete();
                $table->index('restaurant_id', "{$tableName}_restaurant_id_index");
            });
        }

        // Step 4: Add composite unique for system_settings (restaurant_id + key)
        Schema::table('system_settings', function (Blueprint $table) {
            $table->dropUnique(['key']);
        });

        Schema::table('system_settings', function (Blueprint $table) {
            $table->unique(['restaurant_id', 'key'], 'system_settings_restaurant_key_unique');
        });
    }

    public function down(): void
    {
        // Restore system_settings unique
        if (Schema::hasTable('system_settings')) {
            Schema::table('system_settings', function (Blueprint $table) {
                $table->dropUnique('system_settings_restaurant_key_unique');
            });

            Schema::table('system_settings', function (Blueprint $table) {
                $table->unique('key');
            });
        }

        // Remove restaurant_id from all tables
        foreach (array_reverse(array_keys($this->tables)) as $tableName) {
            if (! Schema::hasTable($tableName) || ! Schema::hasColumn($tableName, 'restaurant_id')) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropForeign([$tableName . '.restaurant_id']);
                $table->dropIndex("{$tableName}_restaurant_id_index");
                $table->dropColumn('restaurant_id');
            });
        }

        // Remove default restaurant data
        DB::table('restaurant_users')->delete();
        DB::table('restaurants')->delete();
    }
};
