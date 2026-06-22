import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, TextInput, Image
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RequestDetailScreen({ request, onClose, onUpdate }) {
    const { user } = useAuth();
    const isClient = user.role === 'client';
    const isEditable = isClient && request.status === 'pending';

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
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

    const items = request.items || [];
    const totalPrice = request.total_price
        ? parseInt(request.total_price).toLocaleString('ru-RU')
        : items.reduce((t, i) => t + parseFloat(i.price_at_request || 0) * i.quantity, 0).toLocaleString('ru-RU');

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
                {!isEditable && !editing && (
                    <View style={{ width: 60 }} />
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

                {/* Supplier info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Поставщик</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Компания:</Text>
                        <Text style={styles.value}>
                            {request.supplier_name || '—'}
                        </Text>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Товары</Text>
                    {items.length === 0 ? (
                        <Text style={styles.emptyText}>Нет товаров</Text>
                    ) : (
                        items.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                                {item.product_image ? (
                                    <Image
                                        source={{ uri: item.product_image }}
                                        style={styles.itemImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.itemImagePlaceholder}>
                                        <Text style={styles.placeholderText}>Нет фото</Text>
                                    </View>
                                )}
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{item.product_name}</Text>
                                    <Text style={styles.itemDetail}>
                                        {parseInt(item.price_at_request).toLocaleString('ru-RU')} ₸ / {item.product_unit}
                                    </Text>
                                    <Text style={styles.itemDetail}>
                                        Кол-во: {item.quantity} {item.product_unit}
                                    </Text>
                                    <Text style={styles.itemTotal}>
                                        Итого: {parseInt(item.total).toLocaleString('ru-RU')} ₸
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Общая сумма:</Text>
                        <Text style={styles.totalValue}>{totalPrice} ₸</Text>
                    </View>
                </View>

                {/* Client info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Информация о клиенте</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Клиент:</Text>
                        <Text style={styles.value}>{request.client_name || '—'}</Text>
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
                                placeholder="Введите телефон"
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
                    <Text style={styles.sectionTitle}>Доставка</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Адрес:</Text>
                        {editing ? (
                            <TextInput
                                style={[styles.inlineInput, { flex: 1 }]}
                                value={form.delivery_address}
                                onChangeText={(v) => setForm(p => ({ ...p, delivery_address: v }))}
                                multiline
                                placeholder="Введите адрес"
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

                <View style={{ height: 40 }} />
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
        fontSize: 13,
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
    emptyText: { fontSize: 14, color: '#999', textAlign: 'center', paddingVertical: 12 },
    itemRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    itemImage: {
        width: 56,
        height: 56,
        borderRadius: 8,
        marginRight: 12,
    },
    itemImagePlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    placeholderText: { fontSize: 10, color: '#999' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    itemDetail: { fontSize: 12, color: '#666', marginTop: 2 },
    itemTotal: { fontSize: 13, fontWeight: '600', color: '#4F46E5', marginTop: 4 },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
    totalValue: { fontSize: 18, fontWeight: 'bold', color: '#4F46E5' },
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
    },
    cancelEditText: { color: '#666', fontSize: 16 },
});