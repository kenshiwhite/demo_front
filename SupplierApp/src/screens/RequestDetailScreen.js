import React, { useState, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, Image
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { InputField, Button, SectionTitle, Divider } from '../components/UI';
import { spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import { OpenAddressInMap } from '../components/AddressMap';

export default function RequestDetailScreen({ request, onClose, onUpdate }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { user } = useAuth();
    const isClient = user.role === 'client';
    const isSupplierStaff = user.role === 'supplier' || user.role === 'sales_rep';
    const isEditable = isClient && request.status === 'pending';
    const canCancel = (isClient || isSupplierStaff) && ['pending', 'accepted'].includes(request.status);

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        note: request.note || '',
        delivery_address: request.delivery_address || '',
        desired_delivery_date: request.desired_delivery_date || '',
        contact_phone: request.contact_phone || '',
    });

    const getStatusConfig = (status) => {
        const configs = {
            pending: { label: 'Ожидает', color: colors.warning, bg: '#FEF3C7', icon: 'clock' },
            accepted: { label: 'Принято', color: colors.success, bg: '#DCFCE7', icon: 'check' },
            declined: { label: 'Отклонено', color: colors.danger, bg: '#FEE2E2', icon: 'x' },
            fulfilled: { label: 'Выполнено', color: colors.purple, bg: '#EDE9FE', icon: 'truck' },
            cancelled: { label: 'Отменено', color: colors.danger, bg: '#FEE2E2', icon: 'x' },
        };
        return configs[status] || { label: status, color: colors.textSecondary, bg: colors.borderLight, icon: 'info' };
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

    const handleCancelRequest = () => {
        Alert.alert(
            'Отменить заявку',
            'Отменить эту заявку для обеих сторон?',
            [
                { text: 'Оставить', style: 'cancel' },
                {
                    text: 'Отменить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await client.post(`/api/requests/${request.id}/cancel/`);
                            Alert.alert('Отменено', 'Заявка отменена');
                            onUpdate();
                        } catch (e) {
                            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось отменить заявку');
                        }
                    }
                }
            ]
        );
    };

    const items = request.items || [];
    const statusConfig = getStatusConfig(request.status);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                    <Icon name="chevronLeft" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Заявка #{request.id}</Text>
                {isEditable && !editing ? (
                    <TouchableOpacity onPress={() => setEditing(true)} style={styles.headerBtn}>
                        <Icon name="edit" size={18} color="#fff" />
                    </TouchableOpacity>
                ) : editing ? (
                    <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                        <Icon name="check" size={20} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerBtn} />
                )}
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {/* Status banner */}
                <View style={[styles.statusBanner, { backgroundColor: statusConfig.bg }]}>
                    <View style={[styles.statusIconBox, { backgroundColor: statusConfig.color + '20' }]}>
                        <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
                    </View>
                    <View>
                        <Text style={styles.statusLabel}>Статус заявки</Text>
                        <Text style={[styles.statusValue, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                    <View style={styles.statusDate}>
                        <Text style={styles.statusDateLabel}>Создана</Text>
                        <Text style={styles.statusDateValue}>
                            {new Date(request.created_at).toLocaleDateString('ru-RU')}
                        </Text>
                    </View>
                </View>

                {/* Supplier */}
                <View style={styles.section}>
                    <SectionTitle label="Поставщик" />
                    <View style={styles.infoRow}>
                        {request.supplier_profile_picture ? (
                            <Image
                                source={{ uri: request.supplier_profile_picture }}
                                style={styles.rowAvatar}
                            />
                        ) : (
                            <Icon name="building" size={16} color={colors.textTertiary} />
                        )}
                        <Text style={styles.infoText}>{request.supplier_name || '—'}</Text>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.section}>
                    <SectionTitle label={`Товары (${items.length})`} />
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
                                        <Icon name="package" size={16} color={colors.textTertiary} />
                                    </View>
                                )}
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{item.product_name}</Text>
                                    <Text style={styles.itemDetail}>
                                        {parseInt(item.price_at_request).toLocaleString('ru-RU')} ₸ / {item.product_unit}
                                    </Text>
                                    <Text style={styles.itemDetail}>
                                        Количество: {item.quantity} {item.product_unit}
                                    </Text>
                                </View>
                                <Text style={styles.itemTotal}>
                                    {parseInt(item.total).toLocaleString('ru-RU')} ₸
                                </Text>
                            </View>
                        ))
                    )}
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Общая сумма</Text>
                        <Text style={styles.totalValue}>
                            {request.total_price
                                ? parseInt(request.total_price).toLocaleString('ru-RU')
                                : '—'} ₸
                        </Text>
                    </View>
                </View>

                {/* Client info */}
                <View style={styles.section}>
                    <SectionTitle label="Клиент" />
                    <View style={styles.infoRow}>
                        {request.client_profile_picture ? (
                            <Image
                                source={{ uri: request.client_profile_picture }}
                                style={styles.rowAvatar}
                            />
                        ) : (
                            <Icon name="user" size={16} color={colors.textTertiary} />
                        )}
                        <Text style={styles.infoText}>{request.client_name || '—'}</Text>
                    </View>
                    {request.client_company ? (
                        <View style={styles.infoRow}>
                            <Icon name="building" size={16} color={colors.textTertiary} />
                            <Text style={styles.infoText}>{request.client_company}</Text>
                        </View>
                    ) : null}
                    <View style={styles.infoRow}>
                        <Icon name="phone" size={16} color={colors.textTertiary} />
                        {editing ? (
                            <InputField
                                value={form.contact_phone}
                                onChangeText={(v) => setForm(p => ({ ...p, contact_phone: v }))}
                                placeholder="+7 (___) ___-__-__"
                                keyboardType="phone-pad"
                                style={{ flex: 1, marginBottom: 0, marginLeft: spacing.sm }}
                            />
                        ) : (
                            <Text style={styles.infoText}>
                                {request.contact_phone || request.client_phone || '—'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Delivery */}
                <View style={styles.section}>
                    <SectionTitle label="Доставка" />
                    <View style={styles.infoRow}>
                        <Icon name="map_pin" size={16} color={colors.textTertiary} />
                        {editing ? (
                            <InputField
                                value={form.delivery_address}
                                onChangeText={(v) => setForm(p => ({ ...p, delivery_address: v }))}
                                placeholder="Адрес доставки"
                                multiline
                                style={{ flex: 1, marginBottom: 0, marginLeft: spacing.sm }}
                                autoCapitalize="sentences"
                                autoCorrect
                            />
                        ) : (
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoText}>{request.delivery_address || '—'}</Text>
                                <OpenAddressInMap address={request.delivery_address} />
                            </View>
                        )}
                    </View>
                    <View style={styles.infoRow}>
                        <Icon name="calendar" size={16} color={colors.textTertiary} />
                        {editing ? (
                            <InputField
                                value={form.desired_delivery_date}
                                onChangeText={(v) => setForm(p => ({ ...p, desired_delivery_date: v }))}
                                placeholder="ГГГГ-ММ-ДД"
                                keyboardType="numeric"
                                style={{ flex: 1, marginBottom: 0, marginLeft: spacing.sm }}
                            />
                        ) : (
                            <Text style={styles.infoText}>
                                {request.desired_delivery_date
                                    ? new Date(request.desired_delivery_date).toLocaleDateString('ru-RU')
                                    : '—'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Note */}
                <View style={styles.section}>
                    <SectionTitle label="Заметка" />
                    {editing ? (
                        <InputField
                            value={form.note}
                            onChangeText={(v) => setForm(p => ({ ...p, note: v }))}
                            placeholder="Заметка для поставщика..."
                            multiline
                            numberOfLines={3}
                            autoCapitalize="sentences"
                            autoCorrect
                        />
                    ) : (
                        <Text style={styles.noteText}>{request.note || 'Нет заметки'}</Text>
                    )}
                </View>

                {request.status === 'cancelled' && (
                    <View style={styles.section}>
                        <SectionTitle label="Отмена" />
                        <Text style={styles.noteText}>
                            {request.cancel_reason || 'Заявка была отменена.'}
                        </Text>
                        {request.cancelled_at ? (
                            <Text style={styles.cancelledAt}>
                                {new Date(request.cancelled_at).toLocaleString('ru-RU')}
                            </Text>
                        ) : null}
                    </View>
                )}

                {/* Supplier response */}
                {request.response && (
                    <View style={[styles.section, styles.responseSection]}>
                        <SectionTitle label="Ответ поставщика" />
                        <Text style={styles.responseText}>{request.response.message}</Text>
                        {request.response.offered_price && (
                            <View style={styles.offeredPriceRow}>
                                <Text style={styles.offeredPriceLabel}>Предложенная цена</Text>
                                <Text style={styles.offeredPriceValue}>
                                    {parseInt(request.response.offered_price).toLocaleString('ru-RU')} ₸
                                </Text>
                            </View>
                        )}
                        <View style={styles.infoRow}>
                            <Icon name="clock" size={14} color={colors.textTertiary} />
                            <Text style={styles.infoText}>
                                {new Date(request.response.created_at).toLocaleString('ru-RU')}
                            </Text>
                        </View>
                    </View>
                )}

                {editing && (
                    <Button
                        label="Отмена"
                        onPress={() => setEditing(false)}
                        variant="secondary"
                        style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}
                    />
                )}

                {canCancel && !editing && (
                    <TouchableOpacity style={styles.cancelRequestBtn} onPress={handleCancelRequest}>
                        <Icon name="x" size={16} color={colors.danger} />
                        <Text style={styles.cancelRequestText}>Отменить заявку</Text>
                    </TouchableOpacity>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
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
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    body: { flex: 1 },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    statusIconBox: {
        width: 44,
        height: 44,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusLabel: { fontSize: 12, color: colors.textSecondary },
    statusValue: { fontSize: 16, fontWeight: '700' },
    statusDate: { marginLeft: 'auto', alignItems: 'flex-end' },
    statusDateLabel: { fontSize: 11, color: colors.textSecondary },
    statusDateValue: { fontSize: 13, fontWeight: '600', color: colors.text },
    section: {
        backgroundColor: colors.card,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadow.sm,
    },
    responseSection: { borderLeftWidth: 3, borderLeftColor: colors.primary },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    rowAvatar: { width: 20, height: 20, borderRadius: 10 },
    infoText: { fontSize: 14, color: colors.text, flex: 1 },
    emptyText: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', padding: spacing.md },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    itemImage: { width: 52, height: 52, borderRadius: radius.md, marginRight: spacing.md },
    itemImagePlaceholder: {
        width: 52,
        height: 52,
        borderRadius: radius.md,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
    itemDetail: { fontSize: 12, color: colors.textSecondary },
    itemTotal: { fontSize: 14, fontWeight: '700', color: colors.primary },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    totalLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    totalValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
    noteText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    cancelledAt: { fontSize: 12, color: colors.textTertiary, marginTop: spacing.sm },
    cancelRequestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        padding: spacing.lg,
        backgroundColor: '#FEF2F2',
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    cancelRequestText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
    responseText: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: spacing.md },
    offeredPriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    offeredPriceLabel: { fontSize: 13, color: colors.success },
    offeredPriceValue: { fontSize: 16, fontWeight: '700', color: colors.success },
});