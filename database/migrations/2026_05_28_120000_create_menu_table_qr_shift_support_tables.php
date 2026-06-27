<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('menu_promotions')) {
            Schema::create('menu_promotions', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->enum('type', ['percentage', 'fixed']);
                $table->decimal('value', 12, 2);
                $table->enum('applies_to', ['all', 'category', 'item'])->default('all');
                $table->foreignId('category_id')->nullable()->constrained('menu_categories')->nullOnDelete();
                $table->foreignId('menu_item_id')->nullable()->constrained('menu_items')->nullOnDelete();
                $table->decimal('min_order_amount', 12, 2)->nullable();
                $table->dateTime('valid_from');
                $table->dateTime('valid_until');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('table_qrcodes')) {
            Schema::create('table_qrcodes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('table_id')->constrained('tables')->cascadeOnDelete();
                $table->string('qr_token', 96)->unique();
                $table->boolean('is_active')->default(true);
                $table->timestamp('generated_at')->useCurrent();
                $table->timestamp('regenerated_at')->nullable();
                $table->timestamps();
                $table->index(['table_id', 'is_active']);
            });
        }

        if (! Schema::hasTable('cashier_shift_summaries')) {
            Schema::create('cashier_shift_summaries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('shift_id')->constrained('shifts')->cascadeOnDelete();
                $table->decimal('total_cash', 12, 2)->default(0);
                $table->decimal('total_qris', 12, 2)->default(0);
                $table->decimal('total_ewallet', 12, 2)->default(0);
                $table->decimal('total_bank_transfer', 12, 2)->default(0);
                $table->decimal('total_va', 12, 2)->default(0);
                $table->unsignedInteger('total_transactions')->default(0);
                $table->decimal('total_discount', 12, 2)->default(0);
                $table->decimal('total_tax', 12, 2)->default(0);
                $table->decimal('total_service_charge', 12, 2)->default(0);
                $table->decimal('total_revenue', 12, 2)->default(0);
                $table->decimal('cash_difference', 12, 2)->default(0);
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cashier_shift_summaries');
        Schema::dropIfExists('table_qrcodes');
        Schema::dropIfExists('menu_promotions');
    }
};
