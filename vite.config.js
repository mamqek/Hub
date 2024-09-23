import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from 'node:url'



export default defineConfig({
    plugins: [
        vue(),
        laravel({
            input: [
                "resources/css/app.css", 
                "resources/css/reset.css", 
                "resources/css/elements.css", 

                "resources/js/vue/app.js",

            ],
            refresh: true,
        }),
    ],
    resolve: {
        alias: {
            vue: "vue/dist/vue.esm-bundler.js",
            '@': fileURLToPath(new URL('./resources/js/vue', import.meta.url)), // Alias for Vue

        },
    },
});
