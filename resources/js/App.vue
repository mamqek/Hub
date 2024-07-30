<template>    
    <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/zip-code-checker">Zip Code Checker</router-link>
    </nav>

    <router-view v-slot="{ Component, route }">
        <div :key="route.name" id="content-wrapper">
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