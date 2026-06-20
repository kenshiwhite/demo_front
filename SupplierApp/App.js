import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { ActivityIndicator, View } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SupplierHomeScreen from './src/screens/SupplierHomeScreen';
import ClientHomeScreen from './src/screens/ClientHomeScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

const Navigation = () => {
    const { user, loading } = useAuth();

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