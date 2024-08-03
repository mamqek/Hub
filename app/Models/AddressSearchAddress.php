<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AddressSearchAddress extends Model
{
    use HasFactory;

    protected $fillable = ['address_search_id', 'address_id'];

    public function addressSearch()
    {
        return $this->belongsTo(AddressSearch::class, 'address_search_id');
    }

    public function address()
    {
        return $this->belongsTo(Address::class, 'address_id');
    }
}
