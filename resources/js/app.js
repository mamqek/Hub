import '@fortawesome/fontawesome-free/css/all.css'

import { createApp } from 'vue';
import App from "./App.vue";

import i18n, {initLanguage} from './lang.js'

import { $axios } from './axios.js'
import router from "@/router.js";

import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useUserStore } from './stores/userStore.js'

import Notifications from '@kyvg/vue3-notification'


const app = createApp(App);


app.config.globalProperties.$axios = $axios;

// Store
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);

// Notifications library
app.use(Notifications)

// Language lbrary
app.use(i18n);


// Function to initialize the language before mounting the app
async function initializeApp() {
    useUserStore().setup();

    await initLanguage();

    // Router
    app.use(router)

    // Once the language is set, mount the app
    app.mount('#app');
}

// Start the initialization process
initializeApp();