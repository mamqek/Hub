<template>

    <div id="app">
        <nav>
            <!-- Link to subpage without leading / (for some reason doesnt work) -->
            <router-link to="/soul-map/clients">{{ $t('clients') }}</router-link>
            <router-link to="/soul-map/new-client">{{ $t('new_*', {item: $t('client')}) }}</router-link>
        </nav>
        
        <router-view v-slot="{ Component, route }">
            <div id="layout">
                <Component :key="route.name"
                    :is="Component"
                    :colors 
                    :soulGroupNamesByLang
                />
            </div>
        </router-view>
        
    </div>

</template>

<script>
import i18n from "@/lang.js"

export default {
    data(){
        return {
            soulGroupNames_en: ["Soul", "Monada", "Ego", "Emotional body", "Mental body", "Physical body", "Genetic body"],
            soulGroupNames_ru: ["Душа", "Монада", "Эго", "Эмоциональное тело", "Ментальное тело", "Физическое тело", "Генетическое тело"],
            colors: ["red", "#2200ff", "yellow", "green", "orange", "pink", "#54067d"],
        }
    },

    computed: {
        soulGroupNamesByLang() {
            return this[`soulGroupNames_${i18n.global.locale}`]; // Returns the array based on the current locale
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