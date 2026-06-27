<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('printers')) {
            Schema::create('printers', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->enum('type', ['kasir', 'kitchen', 'bar']);
                $table->string('ip_address')->nullable();
                $table->unsignedInteger('port')->default(9100);
                $table->enum('paper_width', ['58mm', '80mm'])->default('80mm');
                $table->boolean('is_active')->default(true);
                $table->foreignId('kitchen_station_id')->nullable()->constrained('kitchen_stations')->nullOnDelete();
                $table->foreignId('bar_station_id')->nullable()->constrained('bar_stations')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('printers');
    }
};
