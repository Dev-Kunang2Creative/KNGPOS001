<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('kitchen_order_items')) {
            Schema::create('kitchen_order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('kitchen_order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('quantity');
                $table->text('notes')->nullable();
                $table->unique(['kitchen_order_id', 'order_item_id']);
            });
        }

        if (! Schema::hasTable('bar_order_items')) {
            Schema::create('bar_order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('bar_order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('order_item_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('quantity');
                $table->text('notes')->nullable();
                $table->unique(['bar_order_id', 'order_item_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('bar_order_items');
        Schema::dropIfExists('kitchen_order_items');
    }
};
