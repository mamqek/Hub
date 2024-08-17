<template>
    <form @submit.prevent="login"class="content">

        <InputText v-model="username"
            label="Username"
            id="username"
            required
        />
        <InputText v-model="password"
            label="Password"
            id="password"
            type="password"
            required
        />
        
        <button class="btn">Login</button>
    </form>
</template>
    
<script>
import InputText from "@/elements/InputText.vue"

export default {
    name: 'Authorization',

    data(){
        return {
            username: "test@example.com",
            password: "password",
        }
    },

    components: {
        InputText
    },

    methods: {
        login() {
            this.$axios.post("/login", {
                username: this.username,
                password: this.password
            })
            .then(({data}) => {
                console.log(data)
            })
            .catch(error => {
                alert(error.message)
            })
        }
    }
}
</script>

<style scoped>


</style>