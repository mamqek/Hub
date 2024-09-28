<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AddressSearchAddress extends Model
{
    use HasFactory;

    protected $fillable = ['address_search_id', 'address_id'];

    // TODO: try getting rid of this model in favor of using belongsToMany in AddressSearch and Address models
    // https://laravel.com/docs/11.x/eloquent-relationships#many-to-many
    public function addressSearch()
    {
        return $this->belongsTo(AddressSearch::class, 'address_search_id');
    }

    public function address()
    {
        return $this->belongsTo(Address::class, 'address_id');
    }
}
