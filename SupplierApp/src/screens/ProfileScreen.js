import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, Modal,
    KeyboardAvoidingView, Platform,
    TouchableWithoutFeedback, Keyboard
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InputField, Button, Card, SectionTitle, Divider } from '../components/UI';
import { colors, spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';

export default function ProfileScreen({ onClose }) {
    const { user, signIn, signOut } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [passwordModal, setPasswordModal] = useState(false);
    const [emailModal, setEmailModal] = useState(false);

    const [form, setForm] = useState({
        company_name: user?.company_name || '',
        phone: user?.phone || '',
        description: user?.description || '',
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
            await client.patch('/api/auth/profile/', {
                company_name: form.company_name,
                phone: form.phone,
                description: form.description,
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
            setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
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
            Alert.alert('Успешно', 'Email обновлён');
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
        const roles = { client: 'Клиент', supplier: 'Поставщик', admin: 'Администратор' };
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
                        <Text style={styles.saveBtn}>Сохранить</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => setEditing(true)}>
                        <Text style={styles.saveBtn}>Изменить</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {/* Avatar section */}
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
                    {!user?.is_email_verified && (
                        <View style={styles.unverifiedBadge}>
                            <Text style={styles.unverifiedText}>⚠️ Email не подтверждён</Text>
                        </View>
                    )}
                </View>

                {/* Company info */}
                <View style={styles.section}>
                    <SectionTitle label="Информация о компании" />
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Название компании</Text>
                        {editing ? (
                            <InputField
                                value={form.company_name}
                                onChangeText={(v) => setForm(p => ({ ...p, company_name: v }))}
                                placeholder="Введите название компании"
                                autoCapitalize="words"
                                style={{ marginBottom: 0 }}
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{user?.company_name || '—'}</Text>
                        )}
                    </View>
                    <Divider />
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Телефон</Text>
                        {editing ? (
                            <InputField
                                value={form.phone}
                                onChangeText={(v) => setForm(p => ({ ...p, phone: v }))}
                                placeholder="+7 (___) ___-__-__"
                                keyboardType="phone-pad"
                                style={{ marginBottom: 0 }}
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{user?.phone || '—'}</Text>
                        )}
                    </View>
                    <Divider />
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>О компании</Text>
                        {editing ? (
                            <InputField
                                value={form.description}
                                onChangeText={(v) => setForm(p => ({ ...p, description: v }))}
                                placeholder="Краткое описание вашей компании"
                                multiline
                                numberOfLines={3}
                                style={{ marginBottom: 0 }}
                            />
                        ) : (
                            <Text style={styles.fieldValue}>{user?.description || '—'}</Text>
                        )}
                    </View>
                </View>

                {/* Email */}
                <View style={styles.section}>
                    <SectionTitle label="Email" />
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Адрес</Text>
                        <Text style={styles.fieldValue}>{user?.email}</Text>
                    </View>
                    <Divider />
                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>Статус</Text>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: user?.is_email_verified ? '#DCFCE7' : '#FEF3C7' }
                        ]}>
                            <Text style={[
                                styles.statusBadgeText,
                                { color: user?.is_email_verified ? colors.success : colors.warning }
                            ]}>
                                {user?.is_email_verified ? '✓ Подтверждён' : '⏳ Не подтверждён'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setEmailModal(true)}
                    >
                        <Text style={styles.actionBtnText}>Изменить email →</Text>
                    </TouchableOpacity>
                </View>

                {/* Account info */}
                <View style={styles.section}>
                    <SectionTitle label="Аккаунт" />
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
                    <SectionTitle label="Безопасность" />
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setPasswordModal(true)}
                    >
                        <Text style={styles.actionBtnText}>Изменить пароль →</Text>
                    </TouchableOpacity>
                </View>

                {editing && (
                    <Button
                        label="Отмена"
                        onPress={() => {
                            setEditing(false);
                            setForm({
                                company_name: user?.company_name || '',
                                phone: user?.phone || '',
                                description: user?.description || '',
                            });
                        }}
                        variant="secondary"
                        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}
                    />
                )}

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Выйти из аккаунта</Text>
                </TouchableOpacity>

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
                                <InputField
                                    label="Текущий пароль"
                                    value={passwordForm.old_password}
                                    onChangeText={(v) => setPasswordForm(p => ({ ...p, old_password: v }))}
                                    placeholder="Введите текущий пароль"
                                    secureTextEntry
                                />
                                <InputField
                                    label="Новый пароль"
                                    value={passwordForm.new_password}
                                    onChangeText={(v) => setPasswordForm(p => ({ ...p, new_password: v }))}
                                    placeholder="Минимум 8 символов"
                                    secureTextEntry
                                />
                                <InputField
                                    label="Подтвердите новый пароль"
                                    value={passwordForm.confirm_password}
                                    onChangeText={(v) => setPasswordForm(p => ({ ...p, confirm_password: v }))}
                                    placeholder="Повторите новый пароль"
                                    secureTextEntry
                                />
                                <Button label="Сохранить" onPress={handleChangePassword} loading={loading} />
                                <Button
                                    label="Отмена"
                                    onPress={() => {
                                        setPasswordModal(false);
                                        setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
                                    }}
                                    variant="ghost"
                                    style={{ marginTop: spacing.sm }}
                                />
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
                                <Text style={styles.modalSubtitle}>Текущий: {user?.email}</Text>
                                <InputField
                                    label="Новый email"
                                    value={newEmail}
                                    onChangeText={setNewEmail}
                                    placeholder="example@email.com"
                                    keyboardType="email-address"
                                />
                                <Button label="Сохранить" onPress={handleChangeEmail} loading={loading} />
                                <Button
                                    label="Отмена"
                                    onPress={() => { setEmailModal(false); setNewEmail(''); }}
                                    variant="ghost"
                                    style={{ marginTop: spacing.sm }}
                                />
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: STATUS_TOP,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
    },
    headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
    back: { color: '#fff', fontSize: 15 },
    saveBtn: { color: '#fff', fontSize: 15, fontWeight: '600' },
    body: { flex: 1 },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
        backgroundColor: colors.card,
        marginBottom: spacing.md,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
        ...shadow.lg,
    },
    avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
    username: { ...typography.h2, marginBottom: spacing.sm },
    roleBadge: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        marginBottom: spacing.sm,
    },
    roleText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    unverifiedBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        marginTop: spacing.xs,
    },
    unverifiedText: { color: colors.warning, fontSize: 13, fontWeight: '600' },
    section: {
        backgroundColor: colors.card,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadow.sm,
    },
    field: { paddingVertical: spacing.sm },
    fieldLabel: { ...typography.caption, marginBottom: spacing.xs },
    fieldValue: { ...typography.h4, color: colors.text },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        marginTop: spacing.xs,
    },
    statusBadgeText: { fontSize: 13, fontWeight: '600' },
    actionBtn: {
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    actionBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    logoutBtn: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.lg,
        backgroundColor: '#FEF2F2',
        borderRadius: radius.lg,
        alignItems: 'center',
    },
    logoutText: { color: colors.danger, fontWeight: '600', fontSize: 16 },
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