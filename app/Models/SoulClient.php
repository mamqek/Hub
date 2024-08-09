<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SoulClient extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'date', 'date_of_birth', 'souls'];

    public function souls(){
        return $this->hasMany(Soul::class);
    }


    

}
