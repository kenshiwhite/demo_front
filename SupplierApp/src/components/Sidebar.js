// SupplierApp/src/components/Sidebar.js
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert, Animated, Dimensions, Easing, Image, StyleSheet,
    Text, TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';

const screenWidth = Dimensions.get('window').width;
const SIDEBAR_WIDTH = Math.round(screenWidth * 0.5);

const MENU_ITEMS = [
    { key: 'profile', label: 'Профиль', icon: 'user' },
    { key: 'clients', label: 'Клиенты', icon: 'contact_card' },
    { key: 'workers', label: 'Сотрудники', icon: 'team' },
    { key: 'analytics', label: 'Аналитика', icon: 'bar_chart' },
    { key: 'rep_stats', label: 'Моя статистика', icon: 'trending_up' },
    { key: 'settings', label: 'Настройки', icon: 'info' },
];

// Slide-in drawer, opens to half the screen width from the right side.
// Reuses the app's existing icons — no new icon assets needed.
export default function Sidebar({
    visible, onClose, user, onNavigate, onLogout,
    showClients = true, showWorkers = true, showAnalytics = true, showRepStats = false,
}) {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const [rendered, setRendered] = useState(visible);
    const translateX = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setRendered(true);
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 1, duration: 260, useNativeDriver: true,
                }),
            ]).start();
        } else if (rendered) {
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: SIDEBAR_WIDTH, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0, duration: 220, useNativeDriver: true,
                }),
            ]).start(({ finished }) => { if (finished) setRendered(false); });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    if (!rendered) return null;

    const handleNavigate = (key) => {
        onClose();
        onNavigate(key);
    };

    const handleLogout = () => {
        onClose();
        Alert.alert(
            'Выход из аккаунта',
            'Вы уверены, что хотите выйти?',
            [
                { text: 'Отмена', style: 'cancel' },
                { text: 'Выйти', style: 'destructive', onPress: () => onLogout?.() },
            ]
        );
    };

    const items = MENU_ITEMS.filter((item) => {
        if (item.key === 'clients') return showClients;
        if (item.key === 'workers') return showWorkers;
        if (item.key === 'analytics') return showAnalytics;
        if (item.key === 'rep_stats') return showRepStats;
        return true;
    });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
            </TouchableWithoutFeedback>

            <Animated.View style={[styles.panel, { transform: [{ translateX }] }]}>
                <View style={styles.profileHeader}>
                    {user?.profile_picture ? (
                        <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(user?.company_name || user?.username || '?')[0]?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.userName} numberOfLines={1}>
                        {user?.company_name || user?.username}
                    </Text>
                    <Text style={styles.userRole}>
                        {{
                            supplier: 'Поставщик',
                            sales_rep: 'Сотрудник',
                            client: 'Клиент',
                        }[user?.role] || ''}
                    </Text>
                </View>

                <View style={styles.menu}>
                    {items.map((item) => (
                        <TouchableOpacity
                            key={item.key}
                            style={styles.menuItem}
                            onPress={() => handleNavigate(item.key)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.menuIconBox}>
                                <Icon name={item.icon} size={18} color={colors.primary} />
                            </View>
                            <Text style={styles.menuLabel} numberOfLines={1}>{item.label}</Text>
                            <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.menuDivider} />

                <View style={styles.menu}>
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.menuIconBox, styles.menuIconBoxDanger]}>
                            <Icon name="logout" size={18} color={colors.danger} />
                        </View>
                        <Text style={[styles.menuLabel, styles.menuLabelDanger]} numberOfLines={1}>
                            Выйти
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    panel: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: colors.card,
        paddingTop: STATUS_TOP + spacing.md,
        ...shadow.lg,
    },
    profileHeader: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        marginBottom: spacing.md,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
    userName: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
    userRole: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    menu: { paddingHorizontal: spacing.sm },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: radius.md,
    },
    menuIconBox: {
        width: 32,
        height: 32,
        borderRadius: radius.md,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
    menuDivider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.md,
        marginHorizontal: spacing.lg,
    },
    menuIconBoxDanger: { backgroundColor: colors.danger + '1A' },
    menuLabelDanger: { color: colors.danger },
});