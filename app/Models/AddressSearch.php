<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class AddressSearch extends Model
{
    use HasFactory;

    protected $fillable = ['postcode', 'huisnummer', 'huisletter', 'exacteMatch'];

    public function AddressSearchAddress() {
        return $this->hasMany(AddressSearchAddress::class, 'address_search_id');
    }

    public function incrementOrCreate(array $attributes) {
        if (!isset($attributes['postcode'], $attributes['huisnummer'], $attributes['exacteMatch'])) {
            throw new InvalidArgumentException("Missing required attributes: postcode, huisnummer, exacteMatch");
        }
        // Start building the query
        $query = $this->newQuery()
            ->where('postcode', $attributes['postcode'])
            ->where('huisnummer', $attributes['huisnummer'])
            ->where('exacteMatch', $attributes['exacteMatch']);

        // Check if huisletter is present in attributes
        if (isset($attributes['huisletter'])) {
            // If huisletter is present, add it to the query
            $query->where('huisletter', $attributes['huisletter']);
        }

        // Execute the query to find the existing record or create a new one
        $record = $query->firstOrNew($attributes);
        Log::info($record);

        // If found, increment search_count; otherwise, set it to 1
        $record->search_count = $record->exists ? $record->search_count + 1 : 1;


        // Save the record
        $record->save();

        return $record;
    }
}
