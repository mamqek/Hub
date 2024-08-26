
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
        loadMessages(i18n.global.fallbackLocale);

        const store = useUserStore();

        // if language is not saved in the store
        if (!store.language) {
            let defaultLang = i18n.global.locale;
            await changeLanguage(defaultLang);
            return
        }

        await changeLanguage(store.language, store.translations);

        checkForUpdate(store.language, store.translations);
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
        } else {
            // If translations are already loaded, fetch them in the background to check for updates
            checkForUpdate(locale, translations);
        }

        return translations;
    } catch (error) {
        console.error(`Failed to load messages for locale ${locale}:`, error);
        throw error;
    }
}

export async function changeLanguage(locale, translations = null){
    // TODO: connect this to backend setting
    try {

        if (translations) {
            i18n.global.setLocaleMessage(locale, translations);
        } else {
            translations = await loadMessages(locale);
        }

        i18n.global.locale = locale;
        useUserStore().setLanguage(locale, translations);
        
        $axios.post(`/translations/${locale}`, {
            locale : locale
        })
        .then(({data}) => {
            console.log(data)
        })
    } catch (error) {
        console.error(`Failed to change language to ${locale}:`, error);
    }
} 

function checkForUpdate(locale, translations){
    $axios.get(`/translations/${locale}`)
    .then(({ data: fetchedTranslations }) => {                            
        if (JSON.stringify(translations) !== JSON.stringify(fetchedTranslations)) {
            i18n.global.setLocaleMessage(locale, fetchedTranslations);
            useUserStore().setLanguage(locale, fetchedTranslations);
        }      
    })
    .catch(error => {
        console.error(`Failed to fetch updated messages for locale ${locale}:`, error);
    });
}


export default i18n;
