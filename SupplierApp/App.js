import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { CityProvider, useCity } from './src/context/CityContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
    registerForPushNotifications,
    savePushTokenToBackend
} from './src/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SupplierHomeScreen from './src/screens/SupplierHomeScreen';
import ClientHomeScreen from './src/screens/ClientHomeScreen';
import VerifyPhoneScreen from './src/screens/VerifyPhoneScreen';
import CitySelectScreen from './src/screens/CitySelectScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

// Kazakhstan cities map for label lookup
const CITIES_MAP = {
    almaty: 'Алматы',
    astana: 'Астана',
    shymkent: 'Шымкент',
    karaganda: 'Қарағанды',
    aktobe: 'Ақтөбе',
    taraz: 'Тараз',
    pavlodar: 'Павлодар',
    ust_kamenogorsk: 'Өскемен',
    semey: 'Семей',
    atyrau: 'Атырау',
    kostanay: 'Қостанай',
    kyzylorda: 'Қызылорда',
    uralsk: 'Орал',
    petropavlovsk: 'Петропавл',
    aktau: 'Ақтау',
    temirtau: 'Теміртау',
    turkestan: 'Түркістан',
    taldykorgan: 'Талдықорған',
    ekibastuz: 'Екібастұз',
    rudny: 'Рудный',
};

const Navigation = () => {
    const { user, loading: authLoading } = useAuth();
    const { selectedCity, cityLabel, loading: cityLoading, selectCity } = useCity();
    const notificationListener = useRef();
    const responseListener = useRef();

    // When user logs in, sync their city from DB to context
    useEffect(() => {
        if (user?.city && user.city !== selectedCity) {
            const label = CITIES_MAP[user.city] || user.city;
            selectCity(user.city, label);
        }
    }, [user]);

    useEffect(() => {
        if (user && (user.is_phone_verified || user.skip_verification)) {
            registerForPushNotifications().then(token => {
                if (token) savePushTokenToBackend(token);
            });

            notificationListener.current = Notifications.addNotificationReceivedListener(
                notification => console.log('Notification received:', notification)
            );

            responseListener.current = Notifications.addNotificationResponseReceivedListener(
                response => console.log('Notification tapped:', response)
            );
        }

        return () => {
            notificationListener.current?.remove?.();
            responseListener.current?.remove?.();
        };
    }, [user]);

    if (authLoading || cityLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    // Show city select before login if no city chosen
    if (!selectedCity && !user) {
        return <CitySelectScreen />;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            ) : !user.is_phone_verified && !user.skip_verification ? (
                <Stack.Screen name="VerifyPhone" component={VerifyPhoneScreen} />
            ) : ['supplier', 'sales_rep'].includes(user.role) ? (
                <Stack.Screen name="SupplierHome" component={SupplierHomeScreen} />
            ) : (
                <Stack.Screen name="ClientHome" component={ClientHomeScreen} />
            )}
        </Stack.Navigator>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <CityProvider>
                            <CartProvider>
                                <NavigationContainer>
                                    <Navigation />
                                </NavigationContainer>
                            </CartProvider>
                        </CityProvider>
                    </AuthProvider>
                </QueryClientProvider>
            </LanguageProvider>
        </ThemeProvider>
    );
}