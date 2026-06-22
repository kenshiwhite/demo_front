import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, Modal,
    KeyboardAvoidingView, Platform
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

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
            Alert.alert('Успешно', 'Email подтверждён!');
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Неверный код');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await client.post('/api/auth/resend-verification/');
            Alert.alert('Отправлено', 'Новый код отправлен на ваш email');
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
            // step 1 - update email
            await client.patch('/api/auth/me/update/', { email: newEmail });
            
            // step 2 - update user in context with new email
            const updatedUser = await client.get('/api/auth/me/');
            await signIn(updatedUser.data);
            
            // step 3 - send verification code to new email
            await client.post('/api/auth/resend-verification/');
            
            setChangeEmailModal(false);
            setNewEmail('');
            Alert.alert('Успешно', `Код подтверждения отправлен на ${newEmail}`);
        } catch (e) {
            console.log('Change email error:', e.response?.data);
            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось изменить email');
        } finally {
            setChangingEmail(false);
        }
    };

    const handleSkip = () => {
        Alert.alert(
            'Пропустить верификацию?',
            'Без подтверждения email вы не сможете отправлять заявки и добавлять товары. Продолжить?',
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
            {/* Top buttons */}
            <View style={styles.topRow}>
                <TouchableOpacity onPress={signOut} style={styles.topBtn}>
                    <Text style={styles.topBtnText}>← Выйти</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSkip} style={styles.topBtn}>
                    <Text style={styles.skipText}>Пропустить</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>📧</Text>
                </View>

                <Text style={styles.title}>Подтвердите email</Text>
                <Text style={styles.subtitle}>
                    Мы отправили 6-значный код на{'\n'}
                    <Text style={styles.email}>{user?.email}</Text>
                </Text>

                <TouchableOpacity
                    style={styles.changeEmailBtn}
                    onPress={() => setChangeEmailModal(true)}
                >
                    <Text style={styles.changeEmailText}>Неверный email? Изменить</Text>
                </TouchableOpacity>

                <TextInput
                    style={styles.codeInput}
                    placeholder="000000"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="numeric"
                    maxLength={6}
                    textAlign="center"
                />

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.buttonText}>Подтвердить</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResend}
                    disabled={resending}
                >
                    {resending
                        ? <ActivityIndicator color="#4F46E5" size="small" />
                        : <Text style={styles.resendText}>Отправить код повторно</Text>
                    }
                </TouchableOpacity>

                <Text style={styles.hint}>
                    Проверьте папку "Спам" если письмо не пришло
                </Text>
            </View>

            {/* Change email modal */}
            <Modal visible={changeEmailModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Изменить email</Text>
                        <Text style={styles.modalSubtitle}>
                            Введите правильный email и мы отправим новый код
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Новый email"
                            value={newEmail}
                            onChangeText={setNewEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleChangeEmail}
                            disabled={changingEmail}
                        >
                            {changingEmail
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.buttonText}>Сохранить и отправить код</Text>
                            }
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setChangeEmailModal(false);
                                setNewEmail('');
                            }}
                        >
                            <Text style={styles.cancelText}>Отмена</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 56,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    topBtn: {
        padding: 8,
    },
    topBtnText: {
        color: '#666',
        fontSize: 15,
    },
    skipText: {
        color: '#4F46E5',
        fontSize: 15,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    icon: { fontSize: 64 },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
    },
    email: {
        color: '#4F46E5',
        fontWeight: '600',
    },
    changeEmailBtn: {
        alignItems: 'center',
        marginBottom: 24,
    },
    changeEmailText: {
        color: '#EF4444',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    codeInput: {
        borderWidth: 2,
        borderColor: '#4F46E5',
        borderRadius: 12,
        padding: 16,
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 24,
        letterSpacing: 12,
    },
    button: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    resendButton: {
        alignItems: 'center',
        padding: 12,
        marginBottom: 16,
    },
    resendText: {
        color: '#4F46E5',
        fontSize: 15,
    },
    hint: {
        textAlign: 'center',
        color: '#999',
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#1a1a1a',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
        fontSize: 16,
    },
    cancelButton: {
        alignItems: 'center',
        padding: 12,
    },
    cancelText: {
        color: '#666',
        fontSize: 16,
    },
});