import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://demo-application-1jpu.onrender.com';

const client = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// automatically attach token to every request
client.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// automatically refresh token if expired
client.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const refresh = await SecureStore.getItemAsync('refresh_token');
                const response = await axios.post(`${API_URL}/api/auth/refresh/`, {
                    refresh,
                });
                const newAccess = response.data.access;
                await SecureStore.setItemAsync('access_token', newAccess);
                original.headers.Authorization = `Bearer ${newAccess}`;
                return client(original);
            } catch {
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
            }
        }
        return Promise.reject(error);
    }
);

export default client;