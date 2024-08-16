<template>

    <div id="app">
        <nav>
            <!-- Link to subpage without leading / (for some reason doesnt work) -->
            <router-link to="/soul-map/clients">Clients</router-link>
            <router-link to="/soul-map/new-client">New Client</router-link>
        </nav>
        
        <router-view v-slot="{ Component, route }">
            <div id="layout">
                <Component :key="route.name"
                    :is="Component"
                    :colors 
                    :soulGroupNamesRus
                    :soulGroupNames
                />
            </div>
        </router-view>
        
    </div>

</template>

<script>
export default {
    data(){
        return {
            soulGroupNames: ["soul", "monada", "ego", "emotional_body", "mental_body", "physical_body", "genetic_body"],
            soulGroupNamesRus: ["Душа", "Монада", "Эго", "Эмоциональное тело", "Ментальное тело", "Физическое тело", "Генетическое тело"],
            colors: ["red", "#2200ff", "yellow", "green", "orange", "pink", "#54067d"],
        }
    }

}
</script>

<style>


</style>

<style scoped>

#app {
    background-image: url(/public/images/pink_gradient.jpg);
    background-repeat: no-repeat;
    background-size: cover;
}

#layout {
    background: transparent;
    backdrop-filter: blur(10px);
}

nav {
    justify-content: center;
    padding-top: calc(var(--navbar-height) + 30px);
}

</style>