<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('xendit_webhook_logs')) {
            Schema::create('xendit_webhook_logs', function (Blueprint $table) {
                $table->id();
                $table->string('external_id')->nullable()->index();
                $table->json('payload');
                $table->boolean('processed')->default(false);
                $table->text('error_message')->nullable();
                $table->timestamp('received_at')->useCurrent();
                $table->timestamp('created_at')->useCurrent();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('xendit_webhook_logs');
    }
};
