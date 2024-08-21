
import { createI18n } from 'vue-i18n';
import { $axios } from './axios.js'
import { useUserStore } from './stores/userStore.js';

const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {},
});

export async function initLanguage(){
    try {
        const store = useUserStore();
        // if language is not saved in the store
        if (!store.language) {
            let defaultLang = i18n.global.locale;
            await loadMessages(defaultLang);
            return
        }

        if (!store.translations) {
            let translations = await loadMessages(store.language);
            store.translations = translations;
        }

        i18n.global.setLocaleMessage(store.language, store.translations);

    } catch (error) {
        console.error('Error initializing language:', error);
        // TODO: Handle the error (e.g., show a notification, fall back to a default language, etc.)
    }
}

export async function loadMessages(locale) {
    try {
        const response = await $axios.get(`/translations/${locale}`);
        
        let translations = response.data;

        i18n.global.setLocaleMessage(locale, translations);
        i18n.global.locale = locale;

        const store = useUserStore();
        store.language = locale;
        store.translations = translations;

        return "Success";
    } catch (error) {
        console.error(`Failed to load messages for locale ${locale}:`, error);
        throw error; // Propagate the error
    }
}


export default i18n;
