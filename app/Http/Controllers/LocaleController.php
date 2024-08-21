<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;


class LocaleController extends Controller
{
    function getMessages($locale) {
        $path = base_path("lang/{$locale}/main.json");
        Log::info($path);
        if (!File::exists($path)) {
            abort(404, 'Translation file not found.');
        }
    
        return response()->file($path);
    }
}
