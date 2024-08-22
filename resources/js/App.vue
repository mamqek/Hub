<template>    
    <nav class="main-nav">
        
        <router-link v-if="!authenticated" to="/auth" class="authorize">Sign (In/Up)</router-link>
        <router-link to="/soul-map">Soul Map</router-link>
        <router-link to="/zip-code-checker">Zip Code Checker</router-link>
        <router-link to="/" class="logo-link">
            <img class="logo" src="./../../public/images/logo.png" alt="Logo">
        </router-link>

    </nav>

    <router-view v-slot="{ Component, route }">
        <div :key="route.name" id="layout">
            <Component :is="Component" />
        </div>
    </router-view>
    <!-- TODO: beutify and fetch available languages from backend -->
    <select v-model="language" @change="changeLanguage(language)">
        <option value="ru">Russian</option>
        <option value="en">English</option>
    </select>

</template>

<script>
import { useUserStore } from '@/stores/userStore';
import { mapState } from "pinia";
import i18n, {changeLanguage} from "./lang.js"


export default {
    name: 'App',

    data() {
        return {
            language: i18n.global.locale
        }
    },

    computed: {
        ...mapState(useUserStore, ['user', 'authenticated']),
    },

    created() {
        // TODO: sync with store, if in store, check which is more relaible, maybe move in store setup method
        this.$axios.post(`authenticate`)
            .then(({ data }) => {
                console.log('User authenticated');
                this.authorized = data;
            })
    },

    methods: {
        changeLanguage
    }
}
</script>

<style scoped>



</style>