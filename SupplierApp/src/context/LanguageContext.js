import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LANGUAGES, DEFAULT_LANGUAGE } from '../i18n/translations';

const STORAGE_KEY = 'app_language';
const SUPPORTED_CODES = LANGUAGES.map((l) => l.code);

const LanguageContext = createContext({
    language: DEFAULT_LANGUAGE,
    languages: LANGUAGES,
    loading: true,
    setLanguage: () => {},
    t: (key) => key,
});

export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((saved) => {
                if (saved && SUPPORTED_CODES.includes(saved)) setLanguageState(saved);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const setLanguage = async (code) => {
        if (!SUPPORTED_CODES.includes(code)) return;
        setLanguageState(code);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, code);
        } catch (e) {
            // Non-fatal: language just won't persist across app restarts.
        }
    };

    const t = (key) => {
        const dict = translations[language] || translations[DEFAULT_LANGUAGE];
        return dict[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
    };

    const value = { language, languages: LANGUAGES, loading, setLanguage, t };

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);