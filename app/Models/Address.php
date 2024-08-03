<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    use HasFactory;

    public function AddressSearchAddress() {
        return $this->hasMany(AddressSearchAddress::class, 'address_search_id');
    }


}
