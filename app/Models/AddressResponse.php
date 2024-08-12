<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AddressResponse extends Model
{
    use HasFactory;

    protected $fillable = ['address_id', 'endpoint', 'response'];

    // To automatically convert array to JSON and decode from JSON
    protected $casts = [
        'response' => 'array',
    ];

    public function address() {
        return $this->belongsTo(Address::class, 'address_id');
    }
}
