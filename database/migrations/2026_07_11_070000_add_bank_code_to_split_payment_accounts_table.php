<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('split_payment_accounts', function (Blueprint $table) {
            // Add bank_code for Xendit Payouts (e.g. ID_BCA, ID_MANDIRI)
            $table->string('bank_code')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('split_payment_accounts', function (Blueprint $table) {
            $table->dropColumn('bank_code');
        });
    }
};
