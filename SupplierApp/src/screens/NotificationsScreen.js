import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, Animated
} from 'react-native';
import client from '../api/client';
import { colors, spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';
import Icon from '../components/Icon';

export default function NotificationsScreen({ onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const response = await client.get('/api/notifications/');
            setNotifications(response.data.results || response.data);
            const countResponse = await client.get('/api/notifications/unread_count/');
            setUnreadCount(countResponse.data.unread_count);
        } catch (e) {
            console.log('Could not load notifications');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await client.post(`/api/notifications/${id}/mark_read/`);
            loadNotifications();
        } catch (e) {}
    };

    const handleMarkAllRead = async () => {
        try {
            await client.post('/api/notifications/mark_all_read/');
            loadNotifications();
        } catch (e) {}
    };

    const getTypeConfig = (type) => {
        const configs = {
            new_request: { color: colors.primary, icon: 'package' },
            request_accepted: { color: colors.success, icon: 'check' },
            request_declined: { color: colors.danger, icon: 'x' },
            request_fulfilled: { color: colors.purple, icon: 'truck' },
            new_response: { color: colors.warning, icon: 'mail' },
        };
        return configs[type] || { color: colors.textSecondary, icon: 'bell' };
    };

    const renderNotification = ({ item, index }) => {
        const config = getTypeConfig(item.notification_type);
        return (
            <TouchableOpacity
                style={[styles.card, !item.is_read && styles.unreadCard]}
                onPress={() => handleMarkRead(item.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconBox, { backgroundColor: config.color + '18' }]}>
                    <Icon name={config.icon} size={18} color={config.color} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.message}>{item.message}</Text>
                    <View style={styles.timeRow}>
                        <Icon name="clock" size={12} color={colors.textTertiary} />
                        <Text style={styles.time}>
                            {new Date(item.created_at).toLocaleDateString('ru-RU', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                        </Text>
                    </View>
                </View>
                {!item.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                    <Icon name="chevronLeft" size={22} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Уведомления</Text>
                    {unreadCount > 0 && (
                        <Text style={styles.headerSub}>{unreadCount} непрочитанных</Text>
                    )}
                </View>
                {unreadCount > 0 ? (
                    <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerBtn}>
                        <Icon name="check" size={20} color="#fff" />
                    </TouchableOpacity>
                ) : <View style={styles.headerBtn} />}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderNotification}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Icon name="bell" size={32} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>Нет уведомлений</Text>
                            <Text style={styles.emptySubtitle}>
                                Здесь появятся уведомления о заявках и ответах
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: STATUS_TOP,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
    },
    headerBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: spacing.lg },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadow.sm,
    },
    unreadCard: {
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        flexShrink: 0,
    },
    content: { flex: 1 },
    title: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
    message: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 6 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    time: { fontSize: 11, color: colors.textTertiary },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginLeft: spacing.sm,
        marginTop: spacing.xs,
        flexShrink: 0,
    },
    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.xxxl },
    emptyIconBox: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
    emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },
});