import { defineStore } from 'pinia'
import { $axios } from '@/axios.js'


export const useUserStore = defineStore('user', {
    state: () => ({
        user: {
            username: null,
            // full_name: null,
            role: null,
        }, 
        authenticated: false,
    
        language: null,
        translations: null,
    }),
    persist: true,

    actions: {
        setUser(userData) {
            this.user = userData;
        },
        addAttribute(attribute, value) {
            this.user[attribute] = value;
        },
        getAttribute(attribute) {
            return this.user[attribute];
        },
        authorize(data = null) {
            this.user.username = data?.username;
            // this.user.full_name = data?.full_name;
            this.user.role = data?.role;
            this.authenticated = true;

            console.log(' user: ', this.user)
            console.log(' auth: ', this.authenticated)
        },
        async logout() {

            function delete_cookie(name) {
                let invalidDate = new Date();
                invalidDate.setDate(invalidDate.getDate() - 1)
                document.cookie = name + "=; expires=" + invalidDate.toUTCString() + "; path=/";
            }

            try {
                this.user = {
                    username: null,
                    // full_name: null,
                    role: null,
                };
                this.authenticated = false;
                // await $axios.get("api/my_logout/");
                // delete_cookie('sessionid');
                // delete_cookie('csrftoken');
                console.log('Logged out');
                // location.reload();
            } catch (error) {
                console.error("[Logout function failed]: ", error)
            }
        },

        setLanguage(language, translations){
            this.language = language;
            this.translations = translations;
        }
    },
});
