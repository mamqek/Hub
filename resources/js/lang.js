
import { createI18n } from 'vue-i18n';
import { $axios } from './axios.js'
import { useUserStore } from './stores/userStore.js';
import { error } from 'laravel-mix/src/Log.js';

const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {},
});

export async function initLanguage(){
    try {        
        loadMessages(i18n.global.fallbackLocale);

        const store = useUserStore();

        // if language is not saved in the store
        if (!store.language) {
            let defaultLang = i18n.global.locale;
            await changeLanguage(defaultLang);
            return
        }

        i18n.global.locale = store.language
        
        if (!store.translations) {
            let translations = await loadMessages(store.language);
            store.translations = translations;
        }

        i18n.global.setLocaleMessage(store.language, store.translations);

    } catch (error) {
        console.error('Error initializing language:', error);
        // if fails often service workers to save in cache might be a solution. But idk how it would really benefit
        // TODO: Handle the error (e.g., show a notification, fall back to a default language, etc.)
    }
}

export async function loadMessages(locale) {
    try {
        // Check if the translations for this locale are already loaded
        let translations = i18n.global.messages[locale];
        if (!translations) {            
            ({data : translations} = await $axios.get(`/translations/${locale}`));
            i18n.global.setLocaleMessage(locale, translations);
        }

        return translations;
    } catch (error) {
        console.error(`Failed to load messages for locale ${locale}:`, error);
        throw error;
    }
}

export async function changeLanguage(locale){
    // TODO: connect this to backend setting
    try {
        let translations = await loadMessages(locale);
        i18n.global.locale = locale;
        useUserStore().setLanguage(locale, translations);
    } catch (error) {
        console.error(`Failed to change language to ${locale}:`, error);
    }
} 


export default i18n;
