import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, TextInput,
    KeyboardAvoidingView, Platform, Keyboard,
    TouchableWithoutFeedback
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RequestDetailScreen({ request, onClose, onUpdate }) {
    const { user } = useAuth();
    const isClient = user.role === 'client';
    const isEditable = isClient && request.status === 'pending';

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        quantity: request.quantity.toString(),
        note: request.note || '',
        delivery_address: request.delivery_address || '',
        desired_delivery_date: request.desired_delivery_date || '',
        contact_phone: request.contact_phone || '',
    });

    const getStatusColor = (status) => {
        const colors = {
            pending: '#F59E0B',
            accepted: '#10B981',
            declined: '#EF4444',
            fulfilled: '#6366F1',
        };
        return colors[status] || '#999';
    };

    const getStatusText = (status) => {
        const texts = {
            pending: 'Ожидает',
            accepted: 'Принято',
            declined: 'Отклонено',
            fulfilled: 'Выполнено',
        };
        return texts[status] || status;
    };

    const handleSave = async () => {
        if (!form.delivery_address) {
            Alert.alert('Ошибка', 'Введите адрес доставки');
            return;
        }
        try {
            await client.patch(`/api/requests/${request.id}/`, {
                quantity: parseInt(form.quantity),
                note: form.note,
                delivery_address: form.delivery_address,
                desired_delivery_date: form.desired_delivery_date || null,
                contact_phone: form.contact_phone,
            });
            Alert.alert('Успешно', 'Заявка обновлена');
            setEditing(false);
            onUpdate();
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось обновить заявку');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.back}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Заявка #{request.id}</Text>
                {isEditable && !editing && (
                    <TouchableOpacity onPress={() => setEditing(true)}>
                        <Text style={styles.editBtn}>Изменить</Text>
                    </TouchableOpacity>
                )}
                {editing && (
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={styles.editBtn}>Сохранить</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.body}>
                {/* Status */}
                <View style={styles.statusRow}>
                    <Text style={styles.sectionLabel}>Статус</Text>
                    <View style={[styles.badge, { backgroundColor: getStatusColor(request.status) }]}>
                        <Text style={styles.badgeText}>{getStatusText(request.status)}</Text>
                    </View>
                </View>

                {/* Product info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Информация о товаре</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Товар:</Text>
                        <Text style={styles.value}>{request.product_name}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Количество:</Text>
                        {editing ? (
                            <TextInput
                                style={styles.inlineInput}
                                value={form.quantity}
                                onChangeText={(v) => setForm(p => ({ ...p, quantity: v }))}
                                keyboardType="numeric"
                            />
                        ) : (
                            <Text style={styles.value}>{request.quantity}</Text>
                        )}
                    </View>
                    {request.total_price && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Итого:</Text>
                            <Text style={[styles.value, styles.totalPrice]}>
                                {parseInt(request.total_price).toLocaleString('ru-RU')} ₸
                            </Text>
                        </View>
                    )}
                </View>

                {/* Client info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Информация о клиенте</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Клиент:</Text>
                        <Text style={styles.value}>{request.client_name}</Text>
                    </View>
                    {request.client_company ? (
                        <View style={styles.row}>
                            <Text style={styles.label}>Компания:</Text>
                            <Text style={styles.value}>{request.client_company}</Text>
                        </View>
                    ) : null}
                    <View style={styles.row}>
                        <Text style={styles.label}>Телефон:</Text>
                        {editing ? (
                            <TextInput
                                style={styles.inlineInput}
                                value={form.contact_phone}
                                onChangeText={(v) => setForm(p => ({ ...p, contact_phone: v }))}
                                keyboardType="phone-pad"
                            />
                        ) : (
                            <Text style={styles.value}>
                                {request.contact_phone || request.client_phone || '—'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Delivery info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Информация о доставке</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Адрес:</Text>
                        {editing ? (
                            <TextInput
                                style={[styles.inlineInput, { flex: 1 }]}
                                value={form.delivery_address}
                                onChangeText={(v) => setForm(p => ({ ...p, delivery_address: v }))}
                                multiline
                            />
                        ) : (
                            <Text style={[styles.value, { flex: 1, textAlign: 'right' }]}>
                                {request.delivery_address || '—'}
                            </Text>
                        )}
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Дата доставки:</Text>
                        {editing ? (
                            <TextInput
                                style={styles.inlineInput}
                                value={form.desired_delivery_date}
                                onChangeText={(v) => setForm(p => ({ ...p, desired_delivery_date: v }))}
                                placeholder="ГГГГ-ММ-ДД"
                            />
                        ) : (
                            <Text style={styles.value}>
                                {request.desired_delivery_date
                                    ? new Date(request.desired_delivery_date).toLocaleDateString('ru-RU')
                                    : '—'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Note */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Заметка</Text>
                    {editing ? (
                        <TextInput
                            style={[styles.inlineInput, { width: '100%', minHeight: 80 }]}
                            value={form.note}
                            onChangeText={(v) => setForm(p => ({ ...p, note: v }))}
                            multiline
                            placeholder="Заметка (необязательно)"
                        />
                    ) : (
                        <Text style={styles.noteText}>
                            {request.note || 'Нет заметки'}
                        </Text>
                    )}
                </View>

                {/* Dates */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Даты</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Создана:</Text>
                        <Text style={styles.value}>
                            {new Date(request.created_at).toLocaleString('ru-RU')}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Обновлена:</Text>
                        <Text style={styles.value}>
                            {new Date(request.updated_at).toLocaleString('ru-RU')}
                        </Text>
                    </View>
                </View>

                {/* Supplier response */}
                {request.response && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ответ поставщика</Text>
                        <Text style={styles.responseText}>{request.response.message}</Text>
                        {request.response.offered_price && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Предложенная цена:</Text>
                                <Text style={[styles.value, { color: '#10B981', fontWeight: '700' }]}>
                                    {parseInt(request.response.offered_price).toLocaleString('ru-RU')} ₸
                                </Text>
                            </View>
                        )}
                        <View style={styles.row}>
                            <Text style={styles.label}>Дата ответа:</Text>
                            <Text style={styles.value}>
                                {new Date(request.response.created_at).toLocaleString('ru-RU')}
                            </Text>
                        </View>
                    </View>
                )}

                {editing && (
                    <TouchableOpacity
                        style={styles.cancelEditBtn}
                        onPress={() => setEditing(false)}
                    >
                        <Text style={styles.cancelEditText}>Отмена</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
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
    editBtn: { color: '#fff', fontSize: 14, fontWeight: '600' },
    body: { flex: 1 },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
    },
    sectionLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 12,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4F46E5',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    label: { fontSize: 14, color: '#666' },
    value: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
    totalPrice: { color: '#4F46E5', fontWeight: '700', fontSize: 16 },
    noteText: { fontSize: 14, color: '#444', lineHeight: 20 },
    responseText: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
        marginBottom: 12,
    },
    inlineInput: {
        borderWidth: 1,
        borderColor: '#4F46E5',
        borderRadius: 6,
        padding: 6,
        fontSize: 14,
        color: '#1a1a1a',
        minWidth: 120,
        textAlign: 'right',
    },
    cancelEditBtn: {
        margin: 12,
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        marginBottom: 40,
    },
    cancelEditText: { color: '#666', fontSize: 16 },
});