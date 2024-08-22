<template>    
    <nav class="main-nav">
        <router-link to="/" class="logo-link">
            <img class="logo" src="./../../public/images/logo.png" alt="Logo">
        </router-link>
        <div class="select-container">
            <select class="lang-select" v-model="language" @change="changeLanguage(language)">
                <option value="ru">{{ $t('ru') }}</option>
                <option value="en">{{ $t('en') }}</option>
            </select>
        </div>
        <router-link class="page-link" to="/soul-map">{{ $t('soul_map') }}</router-link>
        <router-link class="page-link" to="/zip-code-checker">{{ $t('zip_code_checker') }}</router-link>
        <router-link class="page-link" v-if="!authenticated" to="/auth" id="authorize">{{ $t('sign_in') }}</router-link>

    </nav>

    <router-view v-slot="{ Component, route }">
        <div :key="route.name" id="layout">
            <Component :is="Component" />
        </div>
    </router-view>
    <!-- TODO: beutify and fetch available languages from backend -->

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