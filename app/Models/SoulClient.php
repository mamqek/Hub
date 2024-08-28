<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SoulClient extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'date', 'date_of_birth', 'souls', 'user_id'];

    // To automatically convert array to JSON and decode from JSON
    protected $casts = [
        'souls' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function souls(){
        return $this->hasMany(Soul::class);
    }


    

}
