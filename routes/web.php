<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/check-zip-code', 'App\Http\Controllers\BagAPIController@checkZipCode');
Route::get('/check-zip-code', 'App\Http\Controllers\BagAPIController@link');

Route::group(['prefix' => 'soulmap'], function () {
    Route::get('/souls', 'App\Http\Controllers\SoulController@getAllRecordsGrouped');

    Route::get('/clients', 'App\Http\Controllers\SoulClientController@getAllClients');
    Route::post('/saveClient', 'App\Http\Controllers\SoulClientController@saveClient');
});


Route::get('/{vue_capture?}', function () {
    return view('welcome');
})->where('vue_capture', '[\/\w\.-]*');