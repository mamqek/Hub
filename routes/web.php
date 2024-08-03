<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/check-zip-code', 'App\Http\Controllers\BagAPIController@checkZipCode');

Route::get('/check-zip-code', 'App\Http\Controllers\BagAPIController@link');


Route::get('/{vue_capture?}', function () {
    return view('welcome');
})->where('vue_capture', '[\/\w\.-]*');