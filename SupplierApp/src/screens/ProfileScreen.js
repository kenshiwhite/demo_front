import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, TextInput, ActivityIndicator,
    Modal, KeyboardAvoidingView, Platform,
    TouchableWithoutFeedback, Keyboard
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ onClose }) {
    const { user, signIn, signOut } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [passwordModal, setPasswordModal] = useState(false);
    const [emailModal, setEmailModal] = useState(false);

    const [form, setForm] = useState({
        company_name: user?.company_name || '',
        phone: user?.phone || '',
        email: user?.email || '',
    });

    const [passwordForm, setPasswordForm] = useState({
        old_password: '',
        new_password: '',
        confirm_password: '',
    });

    const [newEmail, setNewEmail] = useState('');

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const response = await client.patch('/api/auth/profile/', {
                company_name: form.company_name,
                phone: form.phone,
            });
            const updatedUser = await client.get('/api/auth/me/');
            await signIn(updatedUser.data);
            setEditing(false);
            Alert.alert('Успешно', 'Профиль обновлён');
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось обновить профиль');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordForm.old_password || !passwordForm.new_password) {
            Alert.alert('Ошибка', 'Заполните все поля');
            return;
        }
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            Alert.alert('Ошибка', 'Новые пароли не совпадают');
            return;
        }
        if (passwordForm.new_password.length < 8) {
            Alert.alert('Ошибка', 'Пароль должен быть не менее 8 символов');
            return;
        }
        setLoading(true);
        try {
            await client.post('/api/auth/change-password/', {
                old_password: passwordForm.old_password,
                new_password: passwordForm.new_password,
            });
            setPasswordModal(false);
            setPasswordForm({
                old_password: '',
                new_password: '',
                confirm_password: '',
            });
            Alert.alert('Успешно', 'Пароль изменён');
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось изменить пароль');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!newEmail || !newEmail.includes('@')) {
            Alert.alert('Ошибка', 'Введите корректный email');
            return;
        }
        setLoading(true);
        try {
            await client.patch('/api/auth/me/update/', { email: newEmail });
            const updatedUser = await client.get('/api/auth/me/');
            await signIn(updatedUser.data);
            setEmailModal(false);
            setNewEmail('');
            Alert.alert('Успешно', 'Email обновлён. Подтвердите новый email.');
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось изменить email');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Выход',
            'Вы уверены, что хотите выйти?',
            [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Выйти', style: 'destructive', onPress: signOut }
            ]
        );
    };

    const getRoleText = (role) => {
        const roles = {
            client: 'Клиент',
            supplier: 'Поставщик',
            admin: 'Администратор',
        };
        return roles[role] || role;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.back}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Профиль</Text>
                {editing ? (
                    <TouchableOpacity onPress={handleSaveProfile} disabled={loading}>
                        {loading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.saveBtn}>Сохранить</Text>
                        }
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => setEditing(true)}>
                        <Text style={styles.saveBtn}>Изменить</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.body}>
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.company_name?.[0] || user?.username?.[0]?.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.username}>{user?.username}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{getRoleText(user?.role)}</Text>
                    </View>
                </View>

                {/* Basic info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Основная информация</Text>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Имя пользователя</Text>
                        <Text style={styles.fieldValue}>{user?.username}</Text>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Название компании</Text>
                        {editing ? (
                            <TextInput
                                style={styles.input}
                                value={form.company_name}
                                onChangeText={(v) => setForm(p => ({ ...p, company_name: v }))}
                                placeholder="Название компании"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>
                                {user?.company_name || '—'}
                            </Text>
                        )}
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Телефон</Text>
                        {editing ? (
                            <TextInput
                                style={styles.input}
                                value={form.phone}
                                onChangeText={(v) => setForm(p => ({ ...p, phone: v }))}
                                placeholder="Номер телефона"
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.fieldValue}>
                                {user?.phone || '—'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Email */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Email</Text>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Адрес</Text>
                        <Text style={styles.fieldValue}>{user?.email}</Text>
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Статус</Text>
                        <View style={[
                            styles.verifiedBadge,
                            { backgroundColor: user?.is_email_verified ? '#10B981' : '#F59E0B' }
                        ]}>
                            <Text style={styles.verifiedText}>
                                {user?.is_email_verified ? '✓ Подтверждён' : '⏳ Не подтверждён'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setEmailModal(true)}
                    >
                        <Text style={styles.actionBtnText}>Изменить email</Text>
                    </TouchableOpacity>
                </View>

                {/* Account info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Аккаунт</Text>
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Дата регистрации</Text>
                        <Text style={styles.fieldValue}>
                            {user?.date_joined
                                ? new Date(user.date_joined).toLocaleDateString('ru-RU')
                                : '—'}
                        </Text>
                    </View>
                </View>

                {/* Security */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Безопасность</Text>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setPasswordModal(true)}
                    >
                        <Text style={styles.actionBtnText}>Изменить пароль</Text>
                    </TouchableOpacity>
                </View>

                {/* Logout */}
                <TouchableOpacity
                    style={styles.logoutBtn}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutText}>Выйти из аккаунта</Text>
                </TouchableOpacity>

                {editing && (
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => {
                            setEditing(false);
                            setForm({
                                company_name: user?.company_name || '',
                                phone: user?.phone || '',
                            });
                        }}
                    >
                        <Text style={styles.cancelText}>Отмена</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Change Password Modal */}
            <Modal visible={passwordModal} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Изменить пароль</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Текущий пароль"
                                    value={passwordForm.old_password}
                                    onChangeText={(v) => setPasswordForm(p => ({ ...p, old_password: v }))}
                                    secureTextEntry
                                />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Новый пароль (мин. 8 символов)"
                                    value={passwordForm.new_password}
                                    onChangeText={(v) => setPasswordForm(p => ({ ...p, new_password: v }))}
                                    secureTextEntry
                                />
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Повторите новый пароль"
                                    value={passwordForm.confirm_password}
                                    onChangeText={(v) => setPasswordForm(p => ({ ...p, confirm_password: v }))}
                                    secureTextEntry
                                />
                                <TouchableOpacity
                                    style={styles.modalBtn}
                                    onPress={handleChangePassword}
                                    disabled={loading}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.modalBtnText}>Сохранить</Text>
                                    }
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setPasswordModal(false);
                                        setPasswordForm({
                                            old_password: '',
                                            new_password: '',
                                            confirm_password: '',
                                        });
                                    }}
                                >
                                    <Text style={styles.cancelText}>Отмена</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Change Email Modal */}
            <Modal visible={emailModal} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>Изменить email</Text>
                                <Text style={styles.modalSubtitle}>
                                    Текущий: {user?.email}
                                </Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Новый email"
                                    value={newEmail}
                                    onChangeText={setNewEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={styles.modalBtn}
                                    onPress={handleChangeEmail}
                                    disabled={loading}
                                >
                                    {loading
                                        ? <ActivityIndicator color="#fff" />
                                        : <Text style={styles.modalBtnText}>Сохранить</Text>
                                    }
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setEmailModal(false);
                                        setNewEmail('');
                                    }}
                                >
                                    <Text style={styles.cancelText}>Отмена</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 56,
        backgroundColor: '#4F46E5',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    back: { color: '#fff', fontSize: 14 },
    saveBtn: { color: '#fff', fontSize: 14, fontWeight: '600' },
    body: { flex: 1 },
    avatarSection: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    username: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
    roleBadge: {
        backgroundColor: '#f0f4ff',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    roleText: { color: '#4F46E5', fontWeight: '600', fontSize: 14 },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 12,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4F46E5',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    field: {
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    fieldLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
    fieldValue: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
    input: {
        borderWidth: 1,
        borderColor: '#4F46E5',
        borderRadius: 8,
        padding: 10,
        fontSize: 15,
        color: '#1a1a1a',
        marginTop: 4,
    },
    verifiedBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 4,
    },
    verifiedText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    actionBtn: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#f0f4ff',
        borderRadius: 8,
        alignItems: 'center',
    },
    actionBtnText: { color: '#4F46E5', fontWeight: '600', fontSize: 14 },
    logoutBtn: {
        margin: 12,
        padding: 16,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        alignItems: 'center',
    },
    logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 16 },
    cancelBtn: {
        marginHorizontal: 12,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    cancelText: { color: '#666', fontSize: 16 },
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
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
        fontSize: 16,
    },
    modalBtn: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    modalBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    cancelButton: { alignItems: 'center', padding: 12 },
});