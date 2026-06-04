<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('transactions') || DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['kasir_id']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('kasir_id')->nullable()->change();
            $table->foreign('kasir_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('transactions') || DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['kasir_id']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('kasir_id')->nullable(false)->change();
            $table->foreign('kasir_id')->references('id')->on('users')->restrictOnDelete();
        });
    }
};
