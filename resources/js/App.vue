<template>    
    <nav class="main-nav">
        
        <router-link v-if="!authenticated" to="/auth" class="authorize">Sign (In/Up)</router-link>
        <router-link to="/soul-map">Soul Map</router-link>
        <router-link to="/zip-code-checker">Zip Code Checker</router-link>
        <router-link to="/">Home</router-link>

    </nav>

    <router-view v-slot="{ Component, route }">
        <div :key="route.name" id="layout">
            <Component :is="Component" />
        </div>
    </router-view>
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
        this.$axios.post(`authenticate`)
            .then(({ data }) => {
                // sync with store later
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