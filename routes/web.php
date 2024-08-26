<?php

use Illuminate\Support\Facades\Route;


Route::get('translations/{locale}', ['App\Http\Controllers\LocaleController', 'getMessages']);
Route::get('translations', ['App\Http\Controllers\LocaleController', 'getLocales']);
Route::post('translations/{locale}', ['App\Http\Controllers\LocaleController', 'changeLocale']);

Route::group(['prefix' => 'auth'], function () {
    Route::post('login', ['App\Http\Controllers\UserController', 'login']);
    Route::post('register', ['App\Http\Controllers\UserController', 'register']);
    Route::post('authenticate', ['App\Http\Controllers\UserController', 'authenticate']);
    Route::post('logout', ['App\Http\Controllers\UserController', 'logout']);
});

Route::post('/check-zip-code', 'App\Http\Controllers\BagAPIController@checkZipCode');
Route::post('/link', 'App\Http\Controllers\BagAPIController@link');

Route::group(['prefix' => 'soulmap'], function () {
    Route::get('/souls', 'App\Http\Controllers\SoulController@getAllRecordsGrouped');

    Route::get('/clients', 'App\Http\Controllers\SoulClientController@getAllClients');
    Route::post('/saveClient', 'App\Http\Controllers\SoulClientController@saveClient');
});



Route::get('/{vue_capture?}', function () {
    return view('welcome');
})->where('vue_capture', '[\/\w\.-]*');