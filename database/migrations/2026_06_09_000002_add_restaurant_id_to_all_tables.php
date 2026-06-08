<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Tables that need restaurant_id added.
     * Format: table_name => nullable (true = nullable FK, false = required FK after backfill)
     */
    private array $tables = [
        'zones' => false,
        'kitchen_stations' => false,
        'bar_stations' => false,
        'tables' => false,
        'menu_categories' => false,
        'menu_items' => false,
        'menu_promotions' => false,
        'orders' => false,
        'order_items' => false,
        'shifts' => false,
        'transactions' => false,
        'kitchen_orders' => false,
        'bar_orders' => false,
        'printers' => false,
        'self_orders' => false,
        'xendit_payments' => false,
        'table_qrcodes' => false,
        'zone_station_assignments' => false,
        'waiter_zone_assignments' => false,
        'audit_logs' => true,       // nullable — some logs may be system-level
        'system_settings' => true,  // nullable — global settings have no restaurant
        'cashier_shift_summaries' => false,
    ];

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
            // super_admin doesn't need restaurant_users entry — they access all via isSuperAdmin()
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

        // Step 3: Add restaurant_id to all operational tables
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

            // Make NOT NULL if required, then add FK
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
        // Drop existing unique on 'key' first
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
