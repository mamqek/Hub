<template>    
    <nav>
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
}
</script>

<style scoped>



</style>