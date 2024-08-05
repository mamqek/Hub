let mix = require('laravel-mix');


mix.js('resources/js/app.js', 'public/js')
    .vue({ version: 3 })
   
if (mix.inProduction()) {
    mix.version();
}