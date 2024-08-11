<template>


    <nav>
        <!-- Link to subpage without leading / (for some reason doesnt work) -->
        <router-link to="/soul-map/clients">Clients</router-link>
        <router-link to="/soul-map/new-client">New Client</router-link>
    </nav>

    <router-view v-slot="{ Component, route }">
        <Component :key="route.name"
            :is="Component"
            :colors 
            :soulGroupNamesRus
            :soulGroupNames
        />
    </router-view>
        

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

<style scoped>

nav {
    display: flex;
    justify-content: center;
    gap: 50px;
    padding: var(--navbar-height) 0 40px;

    a {
        font-size: 28px;
        color: var(--dark-color);
    }
}

</style>