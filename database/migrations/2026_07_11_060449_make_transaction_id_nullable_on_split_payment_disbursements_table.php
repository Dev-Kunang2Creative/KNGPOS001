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
        // fresh database the table is created later with a nullable column, so skip.
        if (! Schema::hasTable('split_payment_disbursements')) {
            return;
        }

        Schema::table('split_payment_disbursements', function (Blueprint $table) {
            $table->unsignedBigInteger('transaction_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('split_payment_disbursements', function (Blueprint $table) {
            $table->unsignedBigInteger('transaction_id')->nullable(false)->change();
        });
    }
};
