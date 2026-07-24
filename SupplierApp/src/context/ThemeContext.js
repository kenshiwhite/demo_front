import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors } from '../styles/theme';

const STORAGE_KEY = 'app_theme_mode';

const ThemeContext = createContext({
    mode: 'light',
    colors: lightColors,
    loading: true,
    setThemeMode: () => {},
    toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
    const [mode, setMode] = useState('light');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((saved) => {
                if (saved === 'dark' || saved === 'light') setMode(saved);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const setThemeMode = async (nextMode) => {
        if (nextMode !== 'light' && nextMode !== 'dark') return;
        setMode(nextMode);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, nextMode);
        } catch (e) {
            // Non-fatal: theme just won't persist across app restarts.
        }
    };

    const toggleTheme = () => setThemeMode(mode === 'light' ? 'dark' : 'light');

    const value = {
        mode,
        colors: mode === 'dark' ? darkColors : lightColors,
        loading,
        setThemeMode,
        toggleTheme,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);