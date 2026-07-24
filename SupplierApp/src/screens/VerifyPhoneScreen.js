import React, { useEffect, useState, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InputField, Button } from '../components/UI';
import { spacing, radius, typography, STATUS_TOP } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

export default function VerifyPhoneScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { user, signIn, signOut } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        handleResend(true);
    }, []);

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert('Ошибка', 'Введите 6-значный код');
            return;
        }

        setLoading(true);
        try {
            await client.post('/api/auth/verify-phone/', { code });
            const response = await client.get('/api/auth/me/');
            await signIn(response.data);
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Неверный код');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async (silent = false) => {
        setResending(true);
        try {
            const response = await client.post('/api/auth/send-phone-code/');
            if (response.data.code) {
                setCode(response.data.code);
                if (!silent) {
                    Alert.alert('Код подтверждения', `Ваш код: ${response.data.code}`);
                }
            } else if (!silent) {
                Alert.alert('Готово', 'Код отправлен по SMS');
            }
        } catch (e) {
            if (!silent) {
                Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось отправить код');
            }
        } finally {
            setResending(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.topRow}>
                <TouchableOpacity onPress={signOut}>
                    <Text style={styles.topBtn}>← Выйти</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>☎</Text>
                </View>

                <Text style={styles.title}>Подтвердите телефон</Text>
                <Text style={styles.subtitle}>
                    Код подтверждения отправлен на{'\n'}
                    <Text style={styles.phone}>{user?.phone}</Text>
                </Text>

                <View style={styles.card}>
                    <Text style={styles.codeLabel}>Введите 6-значный код</Text>
                    <InputField
                        value={code}
                        onChangeText={setCode}
                        placeholder="000000"
                        keyboardType="numeric"
                        maxLength={6}
                        style={{ marginBottom: 0 }}
                    />

                    <Button
                        label="Подтвердить"
                        onPress={handleVerify}
                        loading={loading}
                        style={{ marginTop: spacing.xl }}
                    />

                    <Button
                        label={resending ? 'Отправка...' : 'Отправить код повторно'}
                        onPress={() => handleResend(false)}
                        loading={resending}
                        variant="ghost"
                        style={{ marginTop: spacing.sm }}
                    />
                </View>

                <Text style={styles.hint}>
                    В режиме разработки код может появиться автоматически без реального SMS.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: STATUS_TOP,
        paddingHorizontal: spacing.xxl,
        paddingBottom: spacing.md,
    },
    topBtn: { color: colors.textSecondary, fontSize: 15 },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: spacing.xxl,
        paddingBottom: spacing.xxxl,
    },
    iconContainer: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.xl },
    icon: { fontSize: 64 },
    title: { ...typography.h1, textAlign: 'center', marginBottom: spacing.md },
    subtitle: {
        ...typography.body,
        textAlign: 'center',
        color: colors.textSecondary,
        lineHeight: 24,
        marginBottom: spacing.xl,
    },
    phone: { color: colors.primary, fontWeight: '600' },
    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xxl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    codeLabel: { ...typography.label, marginBottom: spacing.sm },
    hint: { ...typography.caption, textAlign: 'center', marginTop: spacing.xl },
});