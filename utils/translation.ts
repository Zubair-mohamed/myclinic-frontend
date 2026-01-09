
import i18next from 'i18next';
import { I18nString } from '../types';

export const getTranslatedName = (name?: I18nString | string | null): string => {
    if (!name) return '';
    if (typeof name === 'string') return name;

    // Check if i18next is initialized, otherwise default to 'en'
    const lang = i18next.isInitialized ? i18next.language : 'en';

    // Use 'en' as a fallback if the current language is not 'ar' or if the 'ar' translation is missing.
    if (lang === 'ar' && name.ar) {
        return name.ar;
    }
    return name.en || name.ar || '';
};
