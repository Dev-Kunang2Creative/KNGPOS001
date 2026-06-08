<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo_path')->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->decimal('tax_percentage', 5, 2)->default(0);
            $table->boolean('tax_is_active')->default(false);
            $table->decimal('service_charge_percentage', 5, 2)->default(0);
            $table->boolean('service_charge_is_active')->default(false);
            $table->string('currency', 10)->default('IDR');
            $table->text('receipt_header')->nullable();
            $table->text('receipt_footer')->nullable();
            $table->enum('status', ['active', 'inactive', 'suspended'])->default('active');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('restaurant_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('role', ['manager', 'kasir', 'waiter', 'dapur', 'bar'])->default('kasir');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['restaurant_id', 'user_id']);
            $table->index(['user_id', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_users');
        Schema::dropIfExists('restaurants');
    }
};
