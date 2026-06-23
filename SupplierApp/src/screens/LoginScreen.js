import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { InputField, Button } from '../components/UI';
import { colors, spacing, radius, typography, STATUS_TOP } from '../styles/theme';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
            return;
        }
        setLoading(true);
        try {
            await login(username, password);
            const response = await client.get('/api/auth/me/');
            await signIn(response.data);
            if (!response.data.is_email_verified) {
                const codeResponse = await client.post('/api/auth/resend-verification/');
                if (codeResponse.data.code) {
                    Alert.alert('Подтвердите email', `Ваш код подтверждения: ${codeResponse.data.code}`);
                }
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Неверный логин или пароль');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.logoSection}>
                    <View style={styles.logo}>
                        <Text style={styles.logoText}>ON</Text>
                    </View>
                    <Text style={styles.appName}>OnSupply</Text>
                    <Text style={styles.tagline}>Платформа для поставщиков и клиентов</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.formTitle}>Вход в аккаунт</Text>

                    <InputField
                        label="Имя пользователя"
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Введите имя пользователя"
                        autoCapitalize="none"
                    />
                    <InputField
                        label="Пароль"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Введите пароль"
                        secureTextEntry
                    />

                    <Button
                        label="Войти"
                        onPress={handleLogin}
                        loading={loading}
                        style={{ marginTop: spacing.sm }}
                    />

                    <TouchableOpacity
                        style={styles.registerLink}
                        onPress={() => navigation.navigate('Register')}
                    >
                        <Text style={styles.registerLinkText}>
                            Нет аккаунта?{' '}
                            <Text style={styles.registerLinkBold}>Зарегистрироваться</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: spacing.xxl,
        paddingTop: STATUS_TOP + spacing.xl,
        paddingBottom: spacing.xxxl,
    },
    logoSection: { alignItems: 'center', marginBottom: spacing.xxxl + spacing.xl },
    logo: {
        width: 72,
        height: 72,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    logoText: { color: '#fff', fontSize: 26, fontWeight: '800' },
    appName: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
    tagline: { ...typography.bodySmall, textAlign: 'center' },
    form: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xxl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    formTitle: { ...typography.h2, marginBottom: spacing.xl },
    registerLink: { marginTop: spacing.lg, alignItems: 'center' },
    registerLinkText: { ...typography.bodySmall },
    registerLinkBold: { color: colors.primary, fontWeight: '600' },
});