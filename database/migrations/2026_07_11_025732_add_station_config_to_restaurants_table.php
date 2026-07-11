<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->boolean('has_kitchen')->default(true)->after('currency');
            $table->boolean('has_bar')->default(true)->after('has_kitchen');
            $table->boolean('has_waiter')->default(true)->after('has_bar');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn(['has_kitchen', 'has_bar', 'has_waiter']);
        });
    }
};
