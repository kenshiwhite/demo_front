import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
    registerForPushNotifications,
    savePushTokenToBackend
} from './src/utils/notifications';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SupplierHomeScreen from './src/screens/SupplierHomeScreen';
import ClientHomeScreen from './src/screens/ClientHomeScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

const Navigation = () => {
    const { user, loading } = useAuth();
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        if (user && (user.is_email_verified || user.skip_verification)) {
            // Register for push notifications when user is logged in
            registerForPushNotifications().then(token => {
                if (token) savePushTokenToBackend(token);
            });

            // Listen for notifications received while app is in foreground
            notificationListener.current = Notifications.addNotificationReceivedListener(
                notification => {
                    console.log('Notification received:', notification);
                }
            );

            // Listen for notification taps
            responseListener.current = Notifications.addNotificationResponseReceivedListener(
                response => {
                    const data = response.notification.request.content.data;
                    console.log('Notification tapped:', data);
                    // You can navigate to specific screens here based on data.type
                }
            );
        }

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, [user]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Register" component={RegisterScreen} />
                </>
            ) : !user.is_email_verified && !user.skip_verification ? (
                <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            ) : user.role === 'supplier' ? (
                <Stack.Screen name="SupplierHome" component={SupplierHomeScreen} />
            ) : (
                <Stack.Screen name="ClientHome" component={ClientHomeScreen} />
            )}
        </Stack.Navigator>
    );
};

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <CartProvider>
                    <NavigationContainer>
                        <Navigation />
                    </NavigationContainer>
                </CartProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}