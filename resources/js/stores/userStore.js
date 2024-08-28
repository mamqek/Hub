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
        setup() {
            this.authenticate();
        },
        setUser(userData) {
            this.user = userData;
        },
        addAttribute(attribute, value) {
            this.user[attribute] = value;
        },
        getAttribute(attribute) {
            return this.user[attribute];
        },
        authenticate() {
            $axios.post('auth/authenticate')
            .then(({data}) => {
                if(!data && this.authenticated) {
                    this.logout()
                    
                }
            })
        },
        authorize(data = null) {
            this.user.username = data?.username;
            // this.user.full_name = data?.full_name;
            this.user.role = data?.role;
            this.authenticated = true;
        },
        async logout() {

            function delete_cookie(name) {
                let invalidDate = new Date();
                invalidDate.setDate(invalidDate.getDate() - 1)
                document.cookie = name + "=; expires=" + invalidDate.toUTCString() + "; path=/";
            }

            try {
                $axios.post('auth/logout')
                .then(({data}) => {
                    // Update Axios defaults with the new CSRF token
                    $axios.defaults.headers['X-CSRF-TOKEN'] = data.csrf_token;
                });
                this.user = {
                    username: null,
                    // full_name: null,
                    role: null,
                };
                this.authenticated = false;
                // delete_cookie('sessionid');
                // delete_cookie('csrftoken');
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
