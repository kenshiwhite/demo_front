import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Alert, Modal, KeyboardAvoidingView, Platform,
    TouchableWithoutFeedback, Keyboard, ScrollView
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InputField, Button } from '../components/UI';
import { colors, spacing, radius, typography, STATUS_TOP } from '../styles/theme';

export default function VerifyEmailScreen() {
    const { user, signIn, signOut } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [changeEmailModal, setChangeEmailModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [changingEmail, setChangingEmail] = useState(false);

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert('Ошибка', 'Введите 6-значный код');
            return;
        }
        setLoading(true);
        try {
            await client.post('/api/auth/verify-email/', { code });
            const response = await client.get('/api/auth/me/');
            await signIn(response.data);
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Неверный код');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            const response = await client.post('/api/auth/resend-verification/');
            if (response.data.code) {
                Alert.alert(
                    'Код подтверждения',
                    `Ваш код: ${response.data.code}`,
                    [{ text: 'OK', onPress: () => setCode(response.data.code) }]
                );
            }
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось отправить код');
        } finally {
            setResending(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            Alert.alert('Ошибка', 'Введите корректный email');
            return;
        }
        setChangingEmail(true);
        try {
            await client.patch('/api/auth/me/update/', { email: newEmail });
            const updatedUser = await client.get('/api/auth/me/');
            await signIn(updatedUser.data);
            const codeResponse = await client.post('/api/auth/resend-verification/');
            setChangeEmailModal(false);
            setNewEmail('');
            if (codeResponse.data.code) {
                Alert.alert('Код отправлен', `Ваш новый код: ${codeResponse.data.code}`, [
                    { text: 'OK', onPress: () => setCode(codeResponse.data.code) }
                ]);
            }
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось изменить email');
        } finally {
            setChangingEmail(false);
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Пропустить верификацию?',
            'Без подтверждения email вы не сможете отправлять заявки.',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Пропустить',
                    onPress: async () => {
                        const response = await client.get('/api/auth/me/');
                        await signIn({ ...response.data, skip_verification: true });
                    }
                }
            ]
        );
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
                <TouchableOpacity onPress={handleSkip}>
                    <Text style={styles.skipBtn}>Пропустить</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📧</Text>
                </View>

                <Text style={styles.title}>Подтвердите email</Text>
                <Text style={styles.subtitle}>
                    Код подтверждения отправлен на{'\n'}
                    <Text style={styles.email}>{user?.email}</Text>
                </Text>

                <TouchableOpacity
                    style={styles.changeEmailBtn}
                    onPress={() => setChangeEmailModal(true)}
                >
                    <Text style={styles.changeEmailText}>Неверный email? Изменить →</Text>
                </TouchableOpacity>

                <View style={styles.codeSection}>
                    <Text style={styles.codeLabel}>Введите 6-значный код</Text>
                    <InputField
                        value={code}
                        onChangeText={setCode}
                        placeholder="000000"
                        keyboardType="numeric"
                        maxLength={6}
                        style={{ marginBottom: 0 }}
                    />
                </View>

                <Button
                    label="Подтвердить"
                    onPress={handleVerify}
                    loading={loading}
                    style={{ marginTop: spacing.xl }}
                />

                <Button
                    label={resending ? 'Отправка...' : 'Отправить код повторно'}
                    onPress={handleResend}
                    loading={resending}
                    variant="ghost"
                    style={{ marginTop: spacing.sm }}
                />

                <Text style={styles.hint}>
                    Проверьте папку "Спам" если письмо не пришло
                </Text>
            </ScrollView>

            <Modal visible={changeEmailModal} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Изменить email</Text>
                                <Text style={styles.modalSubtitle}>
                                    Введите правильный email и мы отправим новый код
                                </Text>
                                <InputField
                                    label="Новый email"
                                    value={newEmail}
                                    onChangeText={setNewEmail}
                                    placeholder="example@email.com"
                                    keyboardType="email-address"
                                />
                                <Button
                                    label="Сохранить и отправить код"
                                    onPress={handleChangeEmail}
                                    loading={changingEmail}
                                />
                                <Button
                                    label="Отмена"
                                    onPress={() => { setChangeEmailModal(false); setNewEmail(''); }}
                                    variant="ghost"
                                    style={{ marginTop: spacing.sm }}
                                />
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: STATUS_TOP,
        paddingHorizontal: spacing.xxl,
        paddingBottom: spacing.md,
    },
    topBtn: { color: colors.textSecondary, fontSize: 15 },
    skipBtn: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: spacing.xxl,
        paddingBottom: spacing.xxxl,
    },
    iconContainer: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.xl },
    icon: { fontSize: 64 },
    title: { ...typography.h1, textAlign: 'center', marginBottom: spacing.md },
    subtitle: { ...typography.body, textAlign: 'center', color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.md },
    email: { color: colors.primary, fontWeight: '600' },
    changeEmailBtn: { alignItems: 'center', marginBottom: spacing.xl },
    changeEmailText: { color: colors.danger, fontSize: 14 },
    codeSection: { marginBottom: spacing.md },
    codeLabel: { ...typography.label, marginBottom: spacing.sm },
    hint: { ...typography.caption, textAlign: 'center', marginTop: spacing.xl },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.xxl,
    },
    modalTitle: { ...typography.h2, marginBottom: spacing.xs },
    modalSubtitle: { ...typography.bodySmall, marginBottom: spacing.xl },
});