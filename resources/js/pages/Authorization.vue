<template>
    <div class="content container" id="container" :class="{ active: registerSide }">
            <div class="form-container sign-up">
                <form @submit.prevent="register">
                    <h1>Create Account</h1>
                    <!-- <div class="social-icons">
                        <a href="#" class="icons"><i class='bx bxl-google'></i></a>
                        <a href="#" class="icons"><i class='bx bxl-facebook'></i></a>
                        <a href="#" class="icons"><i class='bx bxl-github'></i></a>
                        <a href="#" class="icons"><i class='bx bxl-linkedin'></i></a>
                    </div> -->
                    <span>Register With Unique Username and E-mail</span>

                    <input type="text" v-model="username" placeholder="How should we call you?">
                    <span v-if="validationErrors.username" class="error">{{ validationErrors.username[0] }}</span>

                    <input type="text" v-model="email" placeholder="Your E-mail">
                    <span v-if="validationErrors.email" class="error">{{ validationErrors.email[0] }}</span>

                    <input type="password" v-model="password" placeholder="Password">
                    <span v-if="validationErrors.password" class="error">{{ validationErrors.password[0] }}</span>

                    <input type="password" v-model="password_confirmation" placeholder="Confirm password">
                    <button>Sign Up</button>
                </form>
            </div>


            <div class="form-container sign-in">
                <form @submit.prevent="login">
                    <h1>Sign In</h1>
                    <!-- <div class="social-icons">
                        <a href="#" class="icons"><i class='bx bxl-google'></i></a>
                        <a href="#" class="icons"><i class='bx bxl-facebook'></i></a>
                        <a href="#" class="icons"><i class='bx bxl-github'></i></a>
                        <a href="#" class="icons"><i class='bx bxl-linkedin'></i></a>
                    </div> -->
                    <span>Login With E-mail or Username</span>
                    <input type="text" v-model="identifier" placeholder="Your Username or E-mail">
                    <input type="password" placeholder="Password">
                    <a href="#">Forget Password?</a>
                    <button>Sign In</button>
                </form>
            </div>


            <div class="toggle-container">
                <div class="toggle">
                    <div class="toggle-panel toggle-left">
                        <h1>Already have an account?</h1>
                        <p>Sign in With Username or E-mail</p>
                        <button class="hidden" id="login" @click="registerSide = false">Sign In</button>
                    </div>
                    <div class="toggle-panel toggle-right">
                        <h1>Don't have an account?</h1>
                        <p>Sign Up With Username And E-mail</p>
                        <button class="hidden" id="register" @click="registerSide = true">Sign Up</button>
                    </div>
                </div>
            </div>
        </div>

</template>
    
<script>
import { useUserStore } from '@/stores/userStore';
import InputText from "@/elements/InputText.vue"

export default {
    name: 'Authorization',

    data(){
        return {
            identifier: "test",
            username: "test",
            email: "",
            password: "password",
            password_confirmation: "password",
            registerSide: false, 
            validationErrors: {}
        }
    },

    components: {
        InputText
    },

    methods: {
        login() {
            this.$axios.post("/login", {
                identifier: this.identifier,
                password: this.password
            })
            .then(({data}) => {
                console.log(data)
                useUserStore().authorize(data.user)
                this.$router.push('/');
            })
            .catch(error => {
                alert(error.message)
            })
        },

        register() {
            this.$axios.post("/register", {
                username: this.username,
                email: this.email,
                password: this.password,
                password_confirmation: this.password_confirmation,
            })
            .then(({data}) => {
                console.log(data);
                useUserStore().authorize(data.user);
                this.$router.push('/');
            })
            .catch(error => {
                console.log(error)
                if (error.status == 422) {
                    console.log("validation")
                    this.validationErrors = error.message;
                    return
                }
                alert(error.message)
            })
        }
    }
}
</script>

<style scoped>

.container{
    /* border-radius: 30px; */
    box-shadow: 0 5px 15px rgba(255, 255, 255, 0.35);
    position: relative;
    overflow: hidden;
    /* width: 768px;
    max-width: 100%;
    min-height: 480px; */
}

.container p{
    font-size: 14px;
    line-height: 20px;
    letter-spacing: 0.3px;
    margin: 20px 0;
}

.container span{
    font-size: 12px;
}

.container a{
    color: #333;
    font-size: 13px;
    text-decoration: none;
    margin: 15px 0 10px;
}

.container button{
    background-color: rgb(255, 13, 13);
    color: #fff;
    font-size: 12px;
    padding: 10px 45px;
    border: 1px solid transparent;
    border-radius: 8px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-top: 10px;
    cursor: pointer;
}

.container button.hidden{
    background-color: transparent;
    border-color: #fff;
}

.container form{
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 0 40px;
    height: 100%;
}

.container input{
    background-color: #eee;
    border:none;
    margin: 8px 0;
    padding: 10px 15px;
    font-size: 13px;
    border-radius: 8px;
    width: 100%;
    outline: none;
}

.form-container{
    position: absolute;
    top: 0;
    height: 100%;
    transition: all 0.6s ease-in-out;
}

.sign-in{
    left: 0;
    width: 50%;
}

.container.active .sign-in{
    transform: translateX(100%);
}

.sign-up{
    left: 0;
    width: 50%;
    opacity: 0;
}

.container.active .sign-up{
    transform: translateX(100%);
    opacity: 1;
    z-index: 2;
    animation: move 0.6s;
}

@keyframes move{
    0%, 49.99%{
        opacity: 0;
        z-index: 1;
    }
    50%, 100%{
        opacity: 1;
        z-index: 2;
    }
}

.social-icons{
    margin: 20px 0;
}

.social-icons a{
    border: 1px solid #ccc;
    border-radius: 20%;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    margin: 0 3px;
    width: 40px;
    height: 40px;
}

.toggle-container{
    position: absolute;
    top: 0;
    left: 50%;
    width: 50%;
    height: 100%;
    overflow: hidden;
    transition: all 0.6s ease-in-out;
    /* border-radius: 20px; */
    z-index: 2;
}

.container.active .toggle-container{
    transform: translateX(-100%);
    /* border-radius: 20px; */
}

.toggle{
    background-color: var(--dark-background);
    height: 100%;
    color: #fff;
    position: relative;
    left: -100%;
    height: 100%;
    width: 200%;
    transform: translateX(0);
    transition: all 0.6s ease-in-out;
}

.container.active .toggle{
    transform: translateX(50%);
}

.toggle-panel{
    position: absolute;
    width: 50%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 0 30px;
    text-align: center;
    top: 0;
    transform: translateX(0);
    transition: all 0.6s ease-in-out;
}

.toggle-left{
    transform: translateX(-200%);
}

.container.active .toggle-left{
    transform: translateX(0);
}

.toggle-right{
    right: 0;
    transform: translateX(0);
}


</style>