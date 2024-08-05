<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Soul extends Model
{
    use HasFactory;

    protected $table = 'souls';

    // Assuming the table has these columns
    protected $fillable = ['group_name', 'number', 'text'];

    /**
     * Get records by group name.
     *
     * @param string $groupName
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getByGroupName(string $groupName)
    {
        return self::where('group_name', $groupName)->get();
    }

    /**
     * Get all records grouped by group name.
     *
     * @return \Illuminate\Support\Collection
     */
    public static function getAllGroupedByGroupName()
    {
        return self::all()->groupBy('group_name');
    }
}
