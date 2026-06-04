<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('self_orders')) {
            Schema::create('self_orders', function (Blueprint $table) {
                $table->id();
                $table->foreignId('table_id')->constrained('tables')->restrictOnDelete();
                $table->foreignId('table_qrcode_id')->nullable()->constrained('table_qrcodes')->nullOnDelete();
                $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->string('customer_name')->nullable();
                $table->text('notes')->nullable();
                $table->enum('status', ['pending', 'converted_to_order', 'rejected', 'expired'])->default('pending');
                $table->decimal('subtotal', 12, 2)->default(0);
                $table->decimal('total_amount', 12, 2)->default(0);
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('rejected_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->timestamps();

                $table->index(['status', 'created_at']);
                $table->index(['table_id', 'status']);
            });
        }

        if (! Schema::hasTable('self_order_items')) {
            Schema::create('self_order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('self_order_id')->constrained('self_orders')->cascadeOnDelete();
                $table->foreignId('menu_item_id')->constrained('menu_items')->restrictOnDelete();
                $table->unsignedInteger('quantity');
                $table->decimal('unit_price', 12, 2);
                $table->decimal('subtotal', 12, 2);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('self_order_items');
        Schema::dropIfExists('self_orders');
    }
};
