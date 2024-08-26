<template>    
    <nav class="main-nav">

        <router-link to="/" class="logo-link">
            <img class="logo" src="./../../public/images/logo.png" alt="Logo">
        </router-link>

        <div class="select-container" v-if="languages">
            <select class="lang-select" v-model="language" @change="changeLanguage(language)">
                <option v-for="lang in languages" :value="lang">{{ $t(`${lang}`) }}</option>
            </select>
        </div>

        <div class="page-links">
            <router-link to="/soul-map">{{ $t('soul_map') }}</router-link>
            <router-link to="/zip-code-checker">{{ $t('zip_code_checker') }}</router-link>
            <router-link v-if="!authenticated" to="/auth" id="authorize">{{ $t('sign_in') }}</router-link>
            <a @click="logout" v-if="authenticated">{{ $t('logout') }}</a>
        </div>

    </nav>

    <router-view v-slot="{ Component, route }">
        <div :key="route.name" id="layout">
            <Component :is="Component" />
        </div>
    </router-view>

    <!-- To make notifications available -->
    <notifications position="bottom right"/>
</template>

<script>
import { useUserStore } from '@/stores/userStore';
import { mapState } from "pinia";
import i18n, {changeLanguage} from "./lang.js"


export default {
    name: 'App',

    data() {
        return {
            language: i18n.global.locale,
            languages: null,
        }
    },

    computed: {
        ...mapState(useUserStore, ['user', 'authenticated']),
    },

    created() {
        this.$axios.get('translations')
        .then(({data}) => {
            this.languages = data;
        })
    },

    methods: {
        changeLanguage,

        logout() {
            this.$axios.post('auth/logout')
            .then(({data}) => {
                // Update Axios defaults with the new CSRF token
                this.$axios.defaults.headers['X-CSRF-TOKEN'] = data.csrf_token;
                useUserStore().logout();
                this.$router.push('/');
            })
        }
    }
}
</script>

<style scoped>



</style>