<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('zones')) {
            Schema::create('zones', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('color_hex', 7)->default('#2563EB');
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('kitchen_stations')) {
            Schema::create('kitchen_stations', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->enum('status', ['active', 'overloaded', 'inactive'])->default('active');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('bar_stations')) {
            Schema::create('bar_stations', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->enum('status', ['active', 'overloaded', 'inactive'])->default('active');
                $table->timestamps();
            });
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'role')) {
                $table->enum('role', ['super_admin', 'manager', 'kasir', 'waiter', 'dapur', 'bar'])->default('kasir')->index()->after('password');
            }

            if (! Schema::hasColumn('users', 'kitchen_station_id')) {
                $table->foreignId('kitchen_station_id')->nullable()->after('role')->constrained('kitchen_stations')->nullOnDelete();
            }

            if (! Schema::hasColumn('users', 'bar_station_id')) {
                $table->foreignId('bar_station_id')->nullable()->after('kitchen_station_id')->constrained('bar_stations')->nullOnDelete();
            }

            if (! Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('bar_station_id');
            }

            if (! Schema::hasColumn('users', 'must_change_password')) {
                $table->boolean('must_change_password')->default(false)->after('is_active');
            }

            if (! Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('must_change_password');
            }

            if (! Schema::hasColumn('users', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
        });

        if (! Schema::hasTable('tables')) {
            Schema::create('tables', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('capacity')->default(4);
            $table->foreignId('zone_id')->constrained()->restrictOnDelete();
            $table->integer('position_x')->default(0);
            $table->integer('position_y')->default(0);
            $table->enum('status', ['available', 'occupied', 'open_bill', 'reserved', 'blocked'])->default('available');
            $table->boolean('self_order_enabled')->default(true);
            $table->timestamps();
            $table->softDeletes();
            });
        }

        if (! Schema::hasTable('zone_station_assignments')) {
            Schema::create('zone_station_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('kitchen_station_id')->constrained()->restrictOnDelete();
            $table->foreignId('bar_station_id')->constrained()->restrictOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('waiter_zone_assignments')) {
            Schema::create('waiter_zone_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('zone_id')->constrained()->cascadeOnDelete();
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps();
            $table->unique(['user_id', 'zone_id']);
            });
        }

        if (! Schema::hasTable('menu_categories')) {
            Schema::create('menu_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            });
        }

        if (! Schema::hasTable('menu_items')) {
            Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('menu_categories')->restrictOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2);
            $table->string('image_path')->nullable();
            $table->enum('print_to', ['kasir', 'kitchen', 'bar', 'kitchen_bar'])->default('kasir');
            $table->boolean('is_available')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
            });
        }

        if (! Schema::hasTable('shifts')) {
            Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kasir_id')->constrained('users')->restrictOnDelete();
            $table->decimal('opening_cash', 12, 2)->default(0);
            $table->decimal('closing_cash', 12, 2)->nullable();
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['kasir_id', 'status']);
            });
        }

        if (! Schema::hasTable('orders')) {
            Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('table_id')->constrained('tables')->restrictOnDelete();
            $table->foreignId('kasir_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('order_type', ['dine_in', 'self_order'])->default('dine_in');
            $table->enum('status', ['open', 'submitted', 'paid', 'cancelled', 'void'])->default('open');
            $table->text('notes')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->foreignId('promotion_id')->nullable();
            $table->decimal('service_charge_amount', 12, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('order_items')) {
            Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'sent', 'cancelled'])->default('pending');
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('kitchen_orders')) {
            Schema::create('kitchen_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('kitchen_station_id')->constrained()->restrictOnDelete();
            $table->enum('status', ['queued', 'in_progress', 'done', 'cancelled'])->default('queued');
            $table->text('notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('bar_orders')) {
            Schema::create('bar_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bar_station_id')->constrained()->restrictOnDelete();
            $table->enum('status', ['queued', 'in_progress', 'done', 'cancelled'])->default('queued');
            $table->text('notes')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('kitchen_order_reassignments')) {
            Schema::create('kitchen_order_reassignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kitchen_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_station_id')->constrained('kitchen_stations')->restrictOnDelete();
            $table->foreignId('to_station_id')->constrained('kitchen_stations')->restrictOnDelete();
            $table->text('reason');
            $table->foreignId('reassigned_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('reassigned_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('transactions')) {
            Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->restrictOnDelete();
            $table->foreignId('kasir_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('payment_method', ['cash', 'qris', 'ewallet', 'bank_transfer', 'va']);
            $table->decimal('amount_paid', 12, 2);
            $table->decimal('change_amount', 12, 2)->default(0);
            $table->enum('status', ['pending', 'paid', 'failed', 'void', 'expired'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('xendit_payments')) {
            Schema::create('xendit_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->string('external_id')->unique();
            $table->string('xendit_invoice_id')->nullable();
            $table->string('payment_method')->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('status')->default('pending');
            $table->json('xendit_raw_response')->nullable();
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('system_settings')) {
            Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
            });
        }

        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('role')->nullable();
            $table->string('action');
            $table->string('resource_type');
            $table->unsignedBigInteger('resource_id')->nullable();
            $table->json('old_value')->nullable();
            $table->json('new_value')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('xendit_payments');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('kitchen_order_reassignments');
        Schema::dropIfExists('bar_orders');
        Schema::dropIfExists('kitchen_orders');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('shifts');
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('menu_categories');
        Schema::dropIfExists('waiter_zone_assignments');
        Schema::dropIfExists('zone_station_assignments');
        Schema::dropIfExists('tables');
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['kitchen_station_id']);
            $table->dropForeign(['bar_station_id']);
        });
        Schema::dropIfExists('bar_stations');
        Schema::dropIfExists('kitchen_stations');
        Schema::dropIfExists('zones');
    }
};
