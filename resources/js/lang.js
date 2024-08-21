
import { createI18n } from 'vue-i18n';
import { $axios } from './axios.js'

const i18n = createI18n({
  locale: 'ru',
  fallbackLocale: 'en',
  messages: {},
});

export async function loadMessages(locale) {
    const response = await $axios.get(`/translations/${locale}`);
    let translations = response.data;

    i18n.global.setLocaleMessage(locale, translations);
    i18n.global.locale = locale;
    
    return translations;
}


export default i18n;
