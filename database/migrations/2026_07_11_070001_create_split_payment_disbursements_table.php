<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('split_payment_disbursements')) {
            return;
        }

        Schema::create('split_payment_disbursements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('split_account_id')->constrained('split_payment_accounts')->restrictOnDelete();

            // Snapshot of destination at time of disbursement
            $table->string('channel_code');          // e.g. ID_BCA
            $table->string('account_number');
            $table->string('account_holder_name')->nullable();

            // Amounts
            $table->decimal('percent_amount', 5, 2); // snapshot %
            $table->decimal('amount', 12, 2);         // actual IDR amount

            // Xendit Payout response
            $table->string('reference_id')->unique(); // our reference sent to Xendit
            $table->string('xendit_payout_id')->nullable();
            $table->string('status')->default('pending'); // pending|succeeded|failed
            $table->text('error_message')->nullable();
            $table->json('xendit_raw_response')->nullable();

            $table->timestamp('disbursed_at')->nullable();
            $table->timestamps();

            $table->index(['transaction_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('split_payment_disbursements');
    }
};
