<template>    
    <nav class="main-nav">
        
        <router-link v-if="!authenticated" to="/auth">Sign (In/Up)</router-link>
        <router-link to="/soul-map">Soul Map</router-link>
        <router-link to="/zip-code-checker">Zip Code Checker</router-link>
        <router-link to="/">Home</router-link>

    </nav>

    <router-view v-slot="{ Component, route }">
        <div :key="route.name" id="layout">
            <Component :is="Component" />
        </div>
    </router-view>

</template>

<script>
import { useUserStore } from '@/stores/userStore';
import { mapState } from "pinia";


export default {
    name: 'App',

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
}
</script>

<style scoped>



</style>