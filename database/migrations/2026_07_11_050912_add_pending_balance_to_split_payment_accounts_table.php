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
        // This migration predates the create-table migration alphabetically; on a
        // fresh database the table (with this column) is created later, so skip.
        if (! Schema::hasTable('split_payment_accounts') || Schema::hasColumn('split_payment_accounts', 'pending_balance')) {
            return;
        }

        Schema::table('split_payment_accounts', function (Blueprint $table) {
            $table->decimal('pending_balance', 15, 2)->default(0)->after('percent_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('split_payment_accounts', function (Blueprint $table) {
            $table->dropColumn('pending_balance');
        });
    }
};
