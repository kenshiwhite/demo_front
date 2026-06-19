import client from './client';
import * as SecureStore from 'expo-secure-store';

export const register = async (data) => {
    const response = await client.post('/api/auth/register/', data);
    return response.data;
};

export const login = async (username, password) => {
    const response = await client.post('/api/auth/login/', { username, password });
    const { access, refresh } = response.data;
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
    return response.data;
};

export const logout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
};