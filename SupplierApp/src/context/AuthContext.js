import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { logout } from '../api/auth';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkToken();
    }, []);

    const checkToken = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const userInfo = await SecureStore.getItemAsync('user_info');
            if (token && userInfo) {
                setUser(JSON.parse(userInfo));
            }
        } catch (e) {
            console.log('No token found');
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (userData) => {
        await SecureStore.setItemAsync('user_info', JSON.stringify(userData));
        setUser(userData);
    };

    const signOut = async () => {
        await logout();
        await SecureStore.deleteItemAsync('user_info');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);