import React, { useEffect, useState, useMemo } from 'react';
import { useCity } from '../context/CityContext';
import Icon from '../components/Icon';
import CitySelectScreen from './CitySelectScreen';
import SupplierCitiesScreen from './SupplierCitiesScreen';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Modal,
} from 'react-native';
import { register } from '../api/auth';
import { InputField, Button } from '../components/UI';
import { spacing, radius, typography, STATUS_TOP } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

export default function RegisterScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { selectedCity, cityLabel, selectCity } = useCity();
    const [showCitySelect, setShowCitySelect] = useState(false);
    const [showCitiesSelect, setShowCitiesSelect] = useState(false);

    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        role: 'client',
        company_name: '',
        phone: '',
        city: selectedCity || '',
        service_cities: [],
    });

    // sync city from context into form
    useEffect(() => {
        if (selectedCity) {
            setForm(p => ({ ...p, city: selectedCity }));
        }
    }, [selectedCity]);

    const [loading, setLoading] = useState(false);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleRegister = async () => {
        if (!form.username || !form.email || !form.password || !form.phone) {
            Alert.alert('Ошибка', 'Заполните обязательные поля');
            return;
        }
        if (form.password.length < 8) {
            Alert.alert('Ошибка', 'Пароль должен быть не менее 8 символов');
            return;
        }
        if (form.role === 'supplier') {
            if (!form.service_cities || form.service_cities.length === 0) {
                Alert.alert('Ошибка', 'Выберите хотя бы один город доставки');
                return;
            }
        } else if (!form.city) {
            Alert.alert('Ошибка', 'Выберите город');
            return;
        }
        setLoading(true);
        try {
            const payload = { ...form };
            if (form.role === 'supplier') {
                // Primary/HQ city defaults to the first covered city so the
                // rest of the app (single-city displays, sorting) still has
                // something sensible to show.
                payload.city = form.service_cities[0];
            } else {
                delete payload.service_cities;
            }
            await register(payload);
            Alert.alert('Успешно', 'Аккаунт создан! Войдите в систему.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error) {
            const msg = error.response?.data;
            let errorText = 'Регистрация не удалась.';
            if (msg?.username) errorText = 'Это имя пользователя уже занято.';
            else if (msg?.email) errorText = 'Этот email уже используется.';
            else if (msg?.phone) errorText = Array.isArray(msg.phone) ? msg.phone[0] : msg.phone;
            else if (msg?.service_cities) errorText = Array.isArray(msg.service_cities) ? msg.service_cities[0] : msg.service_cities;
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
                        label="Телефон *"
                        value={form.phone}
                        onChangeText={(v) => handleChange('phone', v)}
                        placeholder="+7 (___) ___-__-__"
                        keyboardType="phone-pad"
                    />
                    {form.role === 'supplier' ? (
                        <TouchableOpacity
                            style={styles.cityPickerBtn}
                            onPress={() => setShowCitiesSelect(true)}
                            activeOpacity={0.7}
                        >
                            <Icon
                                name="map_pin"
                                size={16}
                                color={form.service_cities.length > 0 ? colors.primary : colors.textTertiary}
                            />
                            <Text
                                style={[styles.cityPickerText, form.service_cities.length === 0 && { color: colors.placeholder }]}
                                numberOfLines={1}
                            >
                                {form.service_cities.length > 0
                                    ? `Городов доставки: ${form.service_cities.length}`
                                    : 'Выберите города доставки'}
                            </Text>
                            <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.cityPickerBtn}
                            onPress={() => setShowCitySelect(true)}
                            activeOpacity={0.7}
                        >
                            <Icon name="map_pin" size={16} color={cityLabel ? colors.primary : colors.textTertiary} />
                            <Text style={[styles.cityPickerText, !cityLabel && { color: colors.placeholder }]}>
                                {cityLabel || 'Выберите город'}
                            </Text>
                            <Icon name="chevronRight" size={14} color={colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>

                <Button
                    label="Создать аккаунт"
                    onPress={handleRegister}
                    loading={loading}
                    style={{ marginTop: spacing.xl }}
                />

                {/* {showCitySelect && (
                    <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                        <CitySelectScreen
                            onClose={() => setShowCitySelect(false)}
                            onSelect={(city) => {
                                setForm(p => ({ ...p, city: city.value }));
                                setShowCitySelect(false);
                            }}
                        />
                    </View>
                )} */}

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

            <Modal
                visible={showCitySelect}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowCitySelect(false)}
            >
                <CitySelectScreen
                    onClose={() => setShowCitySelect(false)}
                    onSelect={(city) => {
                        setForm((p) => ({
                            ...p,
                            city: city.value,
                        }));
                        setShowCitySelect(false);
                    }}
                />
            </Modal>

            <Modal
                visible={showCitiesSelect}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowCitiesSelect(false)}
            >
                <SupplierCitiesScreen
                    localOnly
                    initialSelected={form.service_cities}
                    onClose={() => setShowCitiesSelect(false)}
                    onSaved={(service_cities) => {
                        setForm((p) => ({ ...p, service_cities }));
                    }}
                />
            </Modal>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors) => StyleSheet.create({
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
    cityPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.card,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 50,
        marginBottom: spacing.md,
    },
    cityPickerText: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },
});