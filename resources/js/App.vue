<template>    
    <nav class="main-nav">
        
        <router-link v-if="!CHECKSTORE" to="/auth">Login/Register</router-link>
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
export default {
    name: 'App',

    data(){
        return {
            authorized: false,
        }
    },

    created() {
        this.$axios.post(`authenticate`)
            .then(({ data }) => {

                console.log('User authenticated');
                this.authorized = data;
            })
    },
}
</script>

<style scoped>



</style>