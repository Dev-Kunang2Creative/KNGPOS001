<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kitchen_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('kitchen_orders', 'printed_at')) {
                $table->timestamp('printed_at')->nullable()->after('sent_at');
            }
        });

        Schema::table('bar_orders', function (Blueprint $table) {
            if (! Schema::hasColumn('bar_orders', 'printed_at')) {
                $table->timestamp('printed_at')->nullable()->after('sent_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('kitchen_orders', function (Blueprint $table) {
            if (Schema::hasColumn('kitchen_orders', 'printed_at')) {
                $table->dropColumn('printed_at');
            }
        });

        Schema::table('bar_orders', function (Blueprint $table) {
            if (Schema::hasColumn('bar_orders', 'printed_at')) {
                $table->dropColumn('printed_at');
            }
        });
    }
};
