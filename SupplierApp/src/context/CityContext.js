import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CityContext = createContext({
    selectedCity: null,
    cityLabel: '',
    loading: true,
    selectCity: async () => {},
    clearCity: async () => {},
});

export const CityProvider = ({ children }) => {
    const [selectedCity, setSelectedCity] = useState(null);
    const [cityLabel, setCityLabel] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCity();
    }, []);

    const loadCity = async () => {
        try {
            const saved = await AsyncStorage.getItem('selected_city');
            if (saved) {
                const parsed = JSON.parse(saved);
                setSelectedCity(parsed.value);
                setCityLabel(parsed.label);
            }
        } catch (e) {
            console.log('Could not load city:', e);
        } finally {
            setLoading(false);
        }
    };

    const selectCity = async (value, label) => {
        try {
            await AsyncStorage.setItem('selected_city', JSON.stringify({ value, label }));
            setSelectedCity(value);
            setCityLabel(label);
        } catch (e) {
            console.log('Could not save city:', e);
        }
    };

    const clearCity = async () => {
        try {
            await AsyncStorage.removeItem('selected_city');
            setSelectedCity(null);
            setCityLabel('');
        } catch (e) {}
    };

    return (
        <CityContext.Provider value={{
            selectedCity, cityLabel, loading,
            selectCity, clearCity
        }}>
            {children}
        </CityContext.Provider>
    );
};

export const useCity = () => {
    const context = useContext(CityContext);
    if (!context) {
        return {
            selectedCity: null,
            cityLabel: '',
            loading: false,
            selectCity: async () => {},
            clearCity: async () => {},
        };
    }
    return context;
};