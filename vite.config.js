import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'; // For Angular paths



export default defineConfig({
    plugins: [
        vue(),
        laravel({
            input: [
                "resources/css/app.css", 
                "resources/css/reset.css", 
                "resources/css/elements.css", 

                "resources/js/vue/app.js",

                "resources/js/angular/src/main.ts"
            ],
            refresh: true,
        }),
    ],
    resolve: {
        alias: {
            vue: "vue/dist/vue.esm-bundler.js",
            '@': fileURLToPath(new URL('./resources/js/vue', import.meta.url)), // Alias for Vue

            '@angular': resolve(__dirname, 'resources/angular'), // Alias for Angular
        },
    },
});
