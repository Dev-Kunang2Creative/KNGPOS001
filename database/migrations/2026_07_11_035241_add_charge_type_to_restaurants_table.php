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
            // 'percentage' = value is a % of subtotal; 'nominal' = flat Rp amount.
            $table->string('tax_type')->default('percentage')->after('tax_is_active');
            $table->string('service_charge_type')->default('percentage')->after('service_charge_is_active');

            // Widen so the value column can also hold a nominal Rp amount, not just a %.
            $table->decimal('tax_percentage', 12, 2)->default(0)->change();
            $table->decimal('service_charge_percentage', 12, 2)->default(0)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            $table->dropColumn(['tax_type', 'service_charge_type']);
            $table->decimal('tax_percentage', 5, 2)->default(0)->change();
            $table->decimal('service_charge_percentage', 5, 2)->default(0)->change();
        });
    }
};
