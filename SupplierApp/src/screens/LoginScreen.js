import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { login, requestPhoneLoginCode, verifyPhoneLoginCode } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { InputField, Button } from '../components/UI';
import { colors, spacing, radius, typography, STATUS_TOP } from '../styles/theme';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [phoneCode, setPhoneCode] = useState('');
    const [loginMode, setLoginMode] = useState('password');
    const [codeSent, setCodeSent] = useState(false);
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
            if (!response.data.is_phone_verified) {
                const codeResponse = await client.post('/api/auth/send-phone-code/');
                if (codeResponse.data.code) {
                    Alert.alert('Подтвердите телефон', `Ваш код подтверждения: ${codeResponse.data.code}`);
                }
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Неверный логин или пароль');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPhoneCode = async () => {
        if (!phone) {
            Alert.alert('Ошибка', 'Введите номер телефона');
            return;
        }

        setLoading(true);
        try {
            const response = await requestPhoneLoginCode(phone);
            setCodeSent(true);
            if (response.code) {
                setPhoneCode(response.code);
                Alert.alert('Код подтверждения', `Ваш код: ${response.code}`);
            } else {
                Alert.alert('Готово', 'Код отправлен по SMS');
            }
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось отправить код');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPhoneLogin = async () => {
        if (!phone || phoneCode.length !== 6) {
            Alert.alert('Ошибка', 'Введите телефон и 6-значный код');
            return;
        }

        setLoading(true);
        try {
            const response = await verifyPhoneLoginCode(phone, phoneCode);
            await signIn(response.user);
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.detail || 'Неверный код');
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
                        <Text style={styles.logoText}>IN</Text>
                    </View>
                    <Text style={styles.appName}>InStock</Text>
                    <Text style={styles.tagline}>Платформа для поставщиков и клиентов</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.formTitle}>Вход в аккаунт</Text>

                    <View style={styles.modeRow}>
                        <TouchableOpacity
                            style={[styles.modeBtn, loginMode === 'password' && styles.modeBtnActive]}
                            onPress={() => setLoginMode('password')}
                        >
                            <Text style={[styles.modeText, loginMode === 'password' && styles.modeTextActive]}>
                                Пароль
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, loginMode === 'phone' && styles.modeBtnActive]}
                            onPress={() => setLoginMode('phone')}
                        >
                            <Text style={[styles.modeText, loginMode === 'phone' && styles.modeTextActive]}>
                                SMS
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {loginMode === 'password' ? (
                        <>
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
                        </>
                    ) : (
                        <>
                            <InputField
                                label="Телефон"
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="+7 (___) ___-__-__"
                                keyboardType="phone-pad"
                            />
                            {codeSent && (
                                <InputField
                                    label="Код из SMS"
                                    value={phoneCode}
                                    onChangeText={setPhoneCode}
                                    placeholder="000000"
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                            )}

                            <Button
                                label={codeSent ? 'Войти по коду' : 'Получить код'}
                                onPress={codeSent ? handleVerifyPhoneLogin : handleRequestPhoneCode}
                                loading={loading}
                                style={{ marginTop: spacing.sm }}
                            />
                            {codeSent && (
                                <Button
                                    label="Отправить код повторно"
                                    onPress={handleRequestPhoneCode}
                                    loading={loading}
                                    variant="ghost"
                                    style={{ marginTop: spacing.sm }}
                                />
                            )}
                        </>
                    )}

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
    modeRow: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: 4,
        marginBottom: spacing.lg,
    },
    modeBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
    },
    modeBtnActive: {
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    modeText: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
    modeTextActive: { color: colors.primary },
    registerLink: { marginTop: spacing.lg, alignItems: 'center' },
    registerLinkText: { ...typography.bodySmall },
    registerLinkBold: { color: colors.primary, fontWeight: '600' },
});
