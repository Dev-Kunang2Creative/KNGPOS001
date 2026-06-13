<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            $table->enum('shape', ['square', 'round'])->default('square')->after('position_y');
            $table->unsignedSmallInteger('width')->default(96)->after('shape');
            $table->unsignedSmallInteger('height')->default(64)->after('width');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tables', function (Blueprint $table) {
            $table->dropColumn(['shape', 'width', 'height']);
        });
    }
};
