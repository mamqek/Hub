<?php

namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;

class LocaleController extends Controller
{

    function getMessages($locale) {
        $path = base_path("lang/{$locale}.json");

        if (!File::exists($path)) {
            abort(404, 'Translation file not found.');
        }
    
        return response()->file($path);
    }

    function getLocales() {
        $langDirectory = base_path("lang");
        $subDirectories = File::directories($langDirectory);
        $locales = array_map(function($dir) {
            return basename($dir);
        }, $subDirectories);

        return $locales;
    }

    function changeLocale($locale) {
        try {
            App::setLocale($locale);
            session(['locale' => $locale]);

            return response()->json([
                'status' => 'success',
                // 'message' => 'Succesfully changed locale',
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while changing the locale',
                'error' => $e->getMessage()
            ], 500);
        }

    }
}
