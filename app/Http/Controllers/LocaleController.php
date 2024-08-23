<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;


class LocaleController extends Controller
{

    function getMessages($locale) {
        $path = base_path("lang/{$locale}/main.json");
        if (!File::exists($path)) {
            abort(404, 'Translation file not found.');
        }
    
        return response()->file($path);
    }

    function getLanguages() {
        $langDirectory = base_path("lang");
        $subDirectories = File::directories($langDirectory);
        $languages = array_map(function($dir) {
            return basename($dir);
        }, $subDirectories);

        return $languages;
    }
}
