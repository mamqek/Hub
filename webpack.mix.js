let mix = require('laravel-mix');
require('laravel-mix-eslint');



mix.js('resources/js/app.js', 'public/js')
    .vue({ version: 3 })
    .eslint({
        fix: true, // Automatically fix linting errors
        extensions: ['js', 'vue'],
      });
   
if (mix.inProduction()) {
    mix.version();
}