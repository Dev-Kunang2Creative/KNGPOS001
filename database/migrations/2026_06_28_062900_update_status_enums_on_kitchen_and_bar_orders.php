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
        DB::statement("ALTER TABLE kitchen_orders MODIFY COLUMN status ENUM('queued', 'in_progress', 'ready', 'completed', 'cancelled') DEFAULT 'queued'");
        DB::statement("ALTER TABLE bar_orders MODIFY COLUMN status ENUM('queued', 'in_progress', 'ready', 'completed', 'cancelled') DEFAULT 'queued'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE kitchen_orders MODIFY COLUMN status ENUM('queued', 'in_progress', 'done', 'cancelled') DEFAULT 'queued'");
        DB::statement("ALTER TABLE bar_orders MODIFY COLUMN status ENUM('queued', 'in_progress', 'done', 'cancelled') DEFAULT 'queued'");
    }
};
