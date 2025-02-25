<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Only force the root URL if we're not running in the console (so it only applies to web requests)
        if (!$this->app->runningInConsole()) {
            // If the request is forwarded from a proxy, trust the headers and force the URL to be HTTPS
            if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
                URL::forceScheme('https');
            }
            // If the current request host is not localhost, force the URL to match the request
            $host = request()->getHost();
            if ($host !== 'localhost') {
                URL::forceRootUrl(request()->getSchemeAndHttpHost());
            }
        }
    }
}
