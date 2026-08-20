<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('split_payment_accounts')) {
            return;
        }

        Schema::create('split_payment_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');                          // e.g. "Kas Pusat", "Biaya Franchise"
            $table->string('xendit_account_id')->nullable(); // Xendit sub-account user ID
            $table->string('bank_name')->nullable();         // e.g. "BCA", "Mandiri"
            $table->string('account_number')->nullable();    // Local bank account for reference
            $table->string('account_holder')->nullable();    // Account holder name
            $table->string('split_type')->default('percentage'); // 'percentage' or 'nominal'
            $table->decimal('percent_amount', 5, 2)         // 0.00 – 100.00
                ->default(0);
            $table->decimal('nominal_amount', 12, 2)->default(0);
            $table->decimal('pending_balance', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('split_payment_accounts');
    }
};
