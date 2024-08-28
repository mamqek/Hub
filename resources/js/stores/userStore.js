import { defineStore } from 'pinia'
import { $axios } from '@/axios.js'
import { notify } from "@kyvg/vue3-notification";
import { t } from '../lang';
import router from '../router'


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
            if (!this.authenticated) {
                return;
            }

            $axios.post('auth/authenticate')
            .then(({data}) => {
                if(!data && this.authenticated) {
                    this.logout();
                    notify({
                        type: "warn",
                        title: t('session_expired'),
                        text: t('session_expired_message')
                    })
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
                router.push('/');
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
