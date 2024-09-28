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
        Schema::create('satisfactory_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->integer("extraction_rate")->default(null);
            $table->enum("type", ["solid", "fluid"]);
            $table->string("icon")->default(null);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('satisfactory_items');
    }
};
