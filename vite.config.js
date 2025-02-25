import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'; // For Angular paths



export default defineConfig({
    plugins: [
        vue(),
        laravel({
            // for files which are loaded on every page (css), other page specific are in welcome.blade (but if removed from blade are not recognized, ask someone)
            input: ["resources/js/vue/app.js", 
            'resources/css/app.css',
            'resources/css/reset.css',
            'resources/css/elements.css',],
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
