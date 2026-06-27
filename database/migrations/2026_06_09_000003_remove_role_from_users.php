<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove the 'role' column from users table.
        // Role is now managed per-restaurant via the restaurant_users pivot table.
        if (Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('role');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('users', 'role')) {
            Schema::table('users', function (Blueprint $table) {
                $table->enum('role', ['super_admin', 'manager', 'kasir', 'waiter', 'dapur', 'bar'])
                    ->default('kasir')
                    ->after('email');
            });
        }
    }
};
