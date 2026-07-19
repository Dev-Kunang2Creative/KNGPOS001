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
        // fresh database the table (with these columns) is created later, so skip.
        if (! Schema::hasTable('split_payment_accounts') || Schema::hasColumn('split_payment_accounts', 'split_type')) {
            return;
        }

        Schema::table('split_payment_accounts', function (Blueprint $table) {
            $table->string('split_type')->default('percentage')->after('account_holder'); // 'percentage' or 'nominal'
            $table->decimal('nominal_amount', 12, 2)->default(0)->after('percent_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('split_payment_accounts', function (Blueprint $table) {
            $table->dropColumn(['split_type', 'nominal_amount']);
        });
    }
};
