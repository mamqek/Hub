import '@fortawesome/fontawesome-free/css/all.css'

import { createApp } from 'vue';
import App from "./App.vue";

import { $axios } from './axios.js'
import router from "@/router.js";


const app = createApp(App);

app.use(router)

app.config.globalProperties.$axios = $axios;

app.mount('#app');