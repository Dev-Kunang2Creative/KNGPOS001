<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('xendit_payments', function (Blueprint $table) {
            $table->string('split_rule_id')->nullable()->after('xendit_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::table('xendit_payments', function (Blueprint $table) {
            $table->dropColumn('split_rule_id');
        });
    }
};
