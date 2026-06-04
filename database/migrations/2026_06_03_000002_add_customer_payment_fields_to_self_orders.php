<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('self_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('self_orders', 'customer_email')) {
                $table->string('customer_email')->nullable()->after('customer_name');
            }

            if (! Schema::hasColumn('self_orders', 'payment_preference')) {
                $table->enum('payment_preference', ['qris', 'cashier'])->default('cashier')->after('customer_email');
            }

            if (! Schema::hasColumn('self_orders', 'receipt_emailed_at')) {
                $table->timestamp('receipt_emailed_at')->nullable()->after('rejection_reason');
            }
        });
    }

    public function down(): void
    {
        Schema::table('self_orders', function (Blueprint $table) {
            if (Schema::hasColumn('self_orders', 'receipt_emailed_at')) {
                $table->dropColumn('receipt_emailed_at');
            }

            if (Schema::hasColumn('self_orders', 'payment_preference')) {
                $table->dropColumn('payment_preference');
            }

            if (Schema::hasColumn('self_orders', 'customer_email')) {
                $table->dropColumn('customer_email');
            }
        });
    }
};
