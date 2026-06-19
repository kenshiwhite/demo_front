import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator
} from 'react-native';
import client from '../api/client';

export default function NotificationsScreen({ onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
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
        } catch (e) {
            console.log('Could not mark as read');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await client.post('/api/notifications/mark_all_read/');
            loadNotifications();
        } catch (e) {
            console.log('Could not mark all as read');
        }
    };

    const getTypeColor = (type) => {
        const colors = {
            new_request: '#4F46E5',
            request_accepted: '#10B981',
            request_declined: '#EF4444',
            request_fulfilled: '#6366F1',
            new_response: '#F59E0B',
        };
        return colors[type] || '#999';
    };

    const renderNotification = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, !item.is_read && styles.unread]}
            onPress={() => handleMarkRead(item.id)}
        >
            <View style={[styles.dot, { backgroundColor: getTypeColor(item.notification_type) }]} />
            <View style={styles.content}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
            {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.close}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    Notifications {unreadCount > 0 ? `(${unreadCount})` : ''}
                </Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead}>
                        <Text style={styles.markAll}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator style={styles.loader} size="large" color="#4F46E5" />
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderNotification}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>No notifications yet</Text>
                    }
                />
            )}
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
    close: { color: '#fff', fontSize: 14 },
    markAll: { color: '#fff', fontSize: 13 },
    list: { padding: 12 },
    loader: { marginTop: 40 },
    empty: { textAlign: 'center', color: '#999', marginTop: 40 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    unread: {
        backgroundColor: '#f0f4ff',
        borderLeftWidth: 3,
        borderLeftColor: '#4F46E5',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 12,
    },
    content: { flex: 1 },
    title: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
    message: { fontSize: 13, color: '#666', marginTop: 4 },
    time: { fontSize: 12, color: '#999', marginTop: 6 },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4F46E5',
        marginLeft: 8,
    },
});