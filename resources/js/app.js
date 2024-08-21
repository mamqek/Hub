import '@fortawesome/fontawesome-free/css/all.css'

import { createApp } from 'vue';
import App from "./App.vue";

import { $axios } from './axios.js'
import router from "@/router.js";

import i18n from './lang.js'

import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useUserStore } from './stores/userStore.js'



const app = createApp(App);

app.use(router)

app.config.globalProperties.$axios = $axios;

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

app.use(i18n);

// Function to initialize the language before mounting the app
async function initializeApp() {
    const userStore = useUserStore();

    // Wait for the store to initialize the language
    await userStore.initStore();

    // Once the language is set, mount the app
    app.mount('#app');
}

// Start the initialization process
initializeApp();