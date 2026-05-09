import i18n from 'i18next';
import { initReactI18next, useTranslation as useOriginalTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from '../locales/en.json';
import hi from '../locales/hi.json';
import te from '../locales/te.json';
import ta from '../locales/ta.json';
import mr from '../locales/mr.json';
import kn from '../locales/kn.json';

type Language = 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'kn';

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            hi: { translation: hi },
            te: { translation: te },
            ta: { translation: ta },
            mr: { translation: mr },
            kn: { translation: kn }
        },
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already escapes values
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'netra_language'
        }
    });

export default i18n;

// The main hook used across all components
export const useTranslation = () => {
    const { t, i18n: i18nInst } = useOriginalTranslation();

    const setLanguage = async (lang: Language) => {
        i18nInst.changeLanguage(lang);
        localStorage.setItem('netra_language', lang);

        // Persist to Supabase profile if user is logged in
        try {
            const { supabase } = await import('./supabase');
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const role = user.user_metadata?.role || 'patient';
                const table = role === 'doctor' ? 'profiles_doctor' : 'profiles_patient';
                await supabase.from(table).update({ language: lang }).eq('id', user.id);
            }
        } catch (_) {
            // Silently fail — localStorage is the primary source of truth for language
        }
    };

    return {
        t: (key: string, defaultValueOrOptions?: string | Record<string, unknown>, options?: Record<string, unknown>) => {
            if (typeof defaultValueOrOptions === 'string') {
                // Usage: t('key', 'default value', { options })
                const res = t(key, defaultValueOrOptions, options);
                return res;
            }
            // Usage: t('key', { options })
            return t(key, defaultValueOrOptions as Record<string, unknown>);
        },
        language: (i18nInst.language?.slice(0, 2) || 'en') as Language,
        setLanguage,
        i18n: i18nInst
    };
};
