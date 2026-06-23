import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { register } from '../api/auth';
import { InputField, Button } from '../components/UI';
import { colors, spacing, radius, typography, STATUS_TOP } from '../styles/theme';

export default function RegisterScreen({ navigation }) {
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        role: 'client',
        company_name: '',
        phone: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleRegister = async () => {
        if (!form.username || !form.email || !form.password) {
            Alert.alert('Ошибка', 'Заполните обязательные поля');
            return;
        }
        if (form.password.length < 8) {
            Alert.alert('Ошибка', 'Пароль должен быть не менее 8 символов');
            return;
        }
        setLoading(true);
        try {
            await register(form);
            Alert.alert('Успешно', 'Аккаунт создан! Войдите в систему.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error) {
            const msg = error.response?.data;
            let errorText = 'Регистрация не удалась.';
            if (msg?.username) errorText = 'Это имя пользователя уже занято.';
            else if (msg?.email) errorText = 'Этот email уже используется.';
            Alert.alert('Ошибка', errorText);
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
                <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.backBtnText}>← Назад</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Создать аккаунт</Text>
                <Text style={styles.subtitle}>Заполните данные для регистрации</Text>

                <View style={styles.roleSection}>
                    <Text style={styles.roleLabel}>Я являюсь:</Text>
                    <View style={styles.roleRow}>
                        <TouchableOpacity
                            style={[styles.roleBtn, form.role === 'client' && styles.roleBtnActive]}
                            onPress={() => handleChange('role', 'client')}
                        >
                            <Text style={styles.roleIcon}>🛒</Text>
                            <Text style={[styles.roleBtnText, form.role === 'client' && styles.roleBtnTextActive]}>
                                Клиент
                            </Text>
                            <Text style={[styles.roleDesc, form.role === 'client' && { color: colors.primary }]}>
                                Покупаю товары
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.roleBtn, form.role === 'supplier' && styles.roleBtnActive]}
                            onPress={() => handleChange('role', 'supplier')}
                        >
                            <Text style={styles.roleIcon}>🏭</Text>
                            <Text style={[styles.roleBtnText, form.role === 'supplier' && styles.roleBtnTextActive]}>
                                Поставщик
                            </Text>
                            <Text style={[styles.roleDesc, form.role === 'supplier' && { color: colors.primary }]}>
                                Продаю товары
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.form}>
                    <Text style={styles.sectionLabel}>Основные данные</Text>
                    <InputField
                        label="Имя пользователя *"
                        value={form.username}
                        onChangeText={(v) => handleChange('username', v)}
                        placeholder="Введите имя пользователя"
                        autoCapitalize="none"
                    />
                    <InputField
                        label="Email *"
                        value={form.email}
                        onChangeText={(v) => handleChange('email', v)}
                        placeholder="Введите email адрес"
                        keyboardType="email-address"
                    />
                    <InputField
                        label="Пароль * (мин. 8 символов)"
                        value={form.password}
                        onChangeText={(v) => handleChange('password', v)}
                        placeholder="Придумайте пароль"
                        secureTextEntry
                    />

                    <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
                        Информация о компании
                    </Text>
                    <InputField
                        label="Название компании"
                        value={form.company_name}
                        onChangeText={(v) => handleChange('company_name', v)}
                        placeholder="Введите название компании"
                        autoCapitalize="words"
                        autoCorrect={false}
                    />
                    <InputField
                        label="Телефон"
                        value={form.phone}
                        onChangeText={(v) => handleChange('phone', v)}
                        placeholder="+7 (___) ___-__-__"
                        keyboardType="phone-pad"
                    />
                </View>

                <Button
                    label="Создать аккаунт"
                    onPress={handleRegister}
                    loading={loading}
                    style={{ marginTop: spacing.xl }}
                />

                <TouchableOpacity
                    style={styles.loginLink}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.loginLinkText}>
                        Уже есть аккаунт?{' '}
                        <Text style={styles.loginLinkBold}>Войти</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: spacing.xxl,
        paddingTop: STATUS_TOP + spacing.md,
        paddingBottom: spacing.xxxl,
    },
    backBtn: { marginBottom: spacing.xl },
    backBtnText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
    title: { ...typography.h1, marginBottom: spacing.xs },
    subtitle: { ...typography.bodySmall, marginBottom: spacing.xl },
    roleSection: { marginBottom: spacing.xl },
    roleLabel: { ...typography.h4, marginBottom: spacing.md },
    roleRow: { flexDirection: 'row', gap: spacing.md },
    roleBtn: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    roleBtnActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    roleIcon: { fontSize: 28, marginBottom: spacing.sm },
    roleBtnText: { fontSize: 15, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
    roleBtnTextActive: { color: colors.primary },
    roleDesc: { fontSize: 12, color: colors.textTertiary },
    form: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.xxl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    loginLink: { marginTop: spacing.xl, alignItems: 'center' },
    loginLinkText: { ...typography.bodySmall },
    loginLinkBold: { color: colors.primary, fontWeight: '600' },
});