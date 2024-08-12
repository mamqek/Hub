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
        Schema::create('address_searches', function (Blueprint $table) {
            $table->id();
            $table->string('postcode');
            $table->string('huisnummer');
            $table->string('huisletter')->nullable();
            $table->integer('search_count')->default(0);
            $table->integer('exacteMatch')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('address_searches');
    }
};
