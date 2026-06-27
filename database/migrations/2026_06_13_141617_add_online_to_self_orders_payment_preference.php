<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE `self_orders` MODIFY `payment_preference` ENUM('qris','cashier','online') NOT NULL DEFAULT 'cashier'");
        DB::statement("ALTER TABLE `transactions` MODIFY `payment_method` ENUM('cash','qris','ewallet','bank_transfer','va','xendit') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `self_orders` MODIFY `payment_preference` ENUM('qris','cashier') NOT NULL DEFAULT 'cashier'");
        DB::statement("ALTER TABLE `transactions` MODIFY `payment_method` ENUM('cash','qris','ewallet','bank_transfer','va') NOT NULL");
    }
};
