import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import client from '../api/client';
import Icon from '../components/Icon';
import { AddressMap, OpenAddressInMap } from '../components/AddressMap';
import { Button, InputField, Badge } from '../components/UI';
import { radius, spacing, typography, STATUS_TOP } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { AnimatedListItem } from '../components/AnimatedPrimitives';

const emptyPerson = { name: '', phone: '', email: '', company_name: '', address: '', notes: '', latitude: null, longitude: null };

export default function ClientsScreen({ onBack }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [clients, setClients] = useState([]);
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [personModal, setPersonModal] = useState(false);
    const [requestModal, setRequestModal] = useState(false);
    const [person, setPerson] = useState(emptyPerson);
    const [requestClient, setRequestClient] = useState(null);
    const [quantities, setQuantities] = useState({});
    const [saving, setSaving] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [clientsRes, productsRes, requestsRes] = await Promise.all([
                client.get('/api/auth/business-clients/'),
                client.get('/api/catalog/products/'),
                client.get('/api/requests/'),
            ]);
            setClients(clientsRes.data.results || clientsRes.data);
            setProducts(productsRes.data.results || productsRes.data);
            setRequests(requestsRes.data.results || requestsRes.data);
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить список клиентов');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openPersonModal = () => {
        setPerson(emptyPerson);
        setPersonModal(true);
    };

    const savePerson = async () => {
        if (!person.name.trim() || !person.address.trim()) {
            Alert.alert('Проверьте данные', 'Укажите имя клиента и адрес.');
            return;
        }
        setSaving(true);
        try {
            await client.post('/api/auth/business-clients/', person);
            setPersonModal(false);
            await load();
            Alert.alert('Готово', 'Клиент добавлен в вашу базу.');
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось добавить клиента');
        } finally {
            setSaving(false);
        }
    };

    const openRequest = (customer) => {
        setRequestClient(customer);
        setQuantities({});
        setRequestModal(true);
    };

    const changeQuantity = (id, delta) => setQuantities(current => ({
        ...current,
        [id]: Math.max(0, (current[id] || 0) + delta),
    }));

    const createRequest = async () => {
        const items = products.filter(p => quantities[p.id] > 0).map(p => ({ product_id: p.id, quantity: quantities[p.id] }));
        if (!items.length) {
            Alert.alert('Выберите товары', 'Добавьте хотя бы один товар в заявку.');
            return;
        }
        setSaving(true);
        try {
            await client.post('/api/requests/', { business_client_id: requestClient.id, items });
            setRequestModal(false);
            Alert.alert('Заявка создана', `Заявка для ${requestClient.name} сохранена.`);
            load();
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать заявку');
        } finally {
            setSaving(false);
        }
    };

    // Helper: a stable key across the two different client "kinds" (CRM
    // contacts have their own id sequence, registered Users have theirs —
    // without this, a business_client #4 and a registered client #4 would
    // collide in any id-keyed map).
    const clientKey = (c) => `${c.client_type}-${c.id}`;

    // Per-client stats: how much each client has ordered, how many
    // requests, and when they last ordered. Business (CRM) clients match
    // via request.business_client; registered clients match via request.client.
    const clientStatsMap = useMemo(() => {
        const map = {};
        for (const c of clients) {
            map[clientKey(c)] = { totalSpent: 0, totalRequests: 0, fulfilledCount: 0, lastActivity: null };
        }
        for (const r of requests) {
            const key = r.business_client
                ? `business-${r.business_client}`
                : r.client ? `registered-${r.client}` : null;
            if (!key) continue;
            const entry = map[key];
            if (!entry) continue;
            entry.totalRequests += 1;
            if (r.status === 'fulfilled') {
                entry.fulfilledCount += 1;
                entry.totalSpent += Number(r.total_price || 0);
            }
            if (!entry.lastActivity || new Date(r.created_at) > new Date(entry.lastActivity)) {
                entry.lastActivity = r.created_at;
            }
        }
        return map;
    }, [clients, requests]);

    const formatMoney = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;

    const renderClient = ({ item }) => {
        const isRegistered = item.client_type === 'registered';
        return (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedClient(item)} activeOpacity={0.8}>
                <View style={styles.cardHeader}>
                    {isRegistered && item.profile_picture ? (
                        <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'К'}</Text></View>
                    )}
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.name}>{item.name}</Text>
                            {isRegistered && <Badge label="В приложении" color={colors.purple} />}
                        </View>
                        <Text style={styles.muted}>{item.company_name || 'Частный клиент'}</Text>
                    </View>
                    <View style={styles.count}><Text style={styles.countText}>{item.request_count || 0} заявок</Text></View>
                </View>
                <Text style={styles.detail}>Телефон: {item.phone || '—'}</Text>
                {item.sales_rep_name ? <Text style={styles.assigned}>Ответственный: {item.sales_rep_name}</Text> : null}
                {!isRegistered && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.purple }]}
                        onPress={(e) => { e.stopPropagation(); openRequest(item); }}
                    >
                        <Icon name="plus" size={15} color={colors.primary} />
                        <Text style={styles.actionBtnText}>Создать заявку</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.pageHeader}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={10}>
                    <Icon name="chevronLeft" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.pageHeaderTitle}>Клиенты</Text>
                <View style={styles.backBtn} />
            </View>

            {loading ? (
                <Text style={styles.loading}>Загрузка...</Text>
            ) : (
                <FlatList
                    data={clients}
                    keyExtractor={(item) => clientKey(item)}
                    renderItem={({ item, index }) => (
                        <AnimatedListItem index={index}>
                            {renderClient({ item })}
                        </AnimatedListItem>
                    )}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Icon name="user" size={30} color={colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Клиентов пока нет</Text>
                            <Text style={styles.muted}>Добавьте клиента или дождитесь его первой заявки.</Text>
                        </View>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={openPersonModal}>
                <Icon name="plus" size={20} color="#fff" />
                <Text style={styles.fabText}>Добавить клиента</Text>
            </TouchableOpacity>

            <Modal visible={personModal} transparent animationType="slide">
                <View style={styles.overlay}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
                    <Text style={styles.modalTitle}>Новый клиент</Text>
                    <InputField label="Имя клиента *" value={person.name} onChangeText={v => setPerson(p => ({ ...p, name: v }))} placeholder="Например, Айдана" autoCapitalize="words" />
                    <InputField label="Телефон *" value={person.phone} onChangeText={v => setPerson(p => ({ ...p, phone: v }))} placeholder="+7 700 000 00 00" keyboardType="phone-pad" />
                    <InputField label="Email" value={person.email} onChangeText={v => setPerson(p => ({ ...p, email: v }))} placeholder="mail@example.com" keyboardType="email-address" />
                    <InputField label="Компания" value={person.company_name} onChangeText={v => setPerson(p => ({ ...p, company_name: v }))} placeholder="Название компании" autoCapitalize="words" />
                    <InputField label="Адрес *" value={person.address} onChangeText={v => setPerson(p => ({ ...p, address: v }))} placeholder="Город, улица, дом" multiline numberOfLines={2} autoCapitalize="sentences" />
                    <AddressMap latitude={person.latitude} longitude={person.longitude} />
                    <InputField label="Заметки" value={person.notes} onChangeText={v => setPerson(p => ({ ...p, notes: v }))} placeholder="Дополнительная информация" multiline numberOfLines={2} autoCapitalize="sentences" />
                    <Button label="Добавить клиента" onPress={savePerson} loading={saving} />
                    <Button label="Отмена" onPress={() => setPersonModal(false)} variant="ghost" />
                </ScrollView></KeyboardAvoidingView></View>
            </Modal>

            <Modal visible={requestModal} transparent animationType="slide">
                <View style={styles.overlay}><KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.modal}>
                    <Text style={styles.modalTitle}>Заявка для {requestClient?.name}</Text>
                    <Text style={styles.muted}>Доступные остатки вашей компании</Text>
                    <ScrollView style={{ maxHeight: 380 }}>{products.map(product => (
                        <View key={product.id} style={styles.productRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.name}>{product.name}</Text>
                                <Text style={styles.muted}>{product.stock_quantity} {product.unit} · {Number(product.price).toLocaleString('ru-RU')} ₸</Text>
                            </View>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQuantity(product.id, -1)}><Icon name="minus" size={15} color={colors.primary} /></TouchableOpacity>
                            <Text style={styles.qty}>{quantities[product.id] || 0}</Text>
                            <TouchableOpacity style={styles.qtyBtn} disabled={(quantities[product.id] || 0) >= product.stock_quantity} onPress={() => changeQuantity(product.id, 1)}><Icon name="plus" size={15} color={colors.primary} /></TouchableOpacity>
                        </View>
                    ))}</ScrollView>
                    <Button label="Создать заявку" onPress={createRequest} loading={saving} />
                    <Button label="Отмена" onPress={() => setRequestModal(false)} variant="ghost" />
                </View></KeyboardAvoidingView></View>
            </Modal>

            <Modal
                visible={Boolean(selectedClient)}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedClient(null)}
            >
                <View style={styles.overlay}>
                    <ScrollView style={styles.modal}>
                        {selectedClient && (() => {
                            const stats = clientStatsMap[clientKey(selectedClient)] || { totalSpent: 0, totalRequests: 0, fulfilledCount: 0, lastActivity: null };
                            const isRegistered = selectedClient.client_type === 'registered';
                            return (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                                            {isRegistered && selectedClient.profile_picture ? (
                                                <Image source={{ uri: selectedClient.profile_picture }} style={styles.smallAvatar} />
                                            ) : (
                                                <View style={styles.smallAvatar}>
                                                    <Text style={styles.avatarText}>{selectedClient.name?.[0]?.toUpperCase() || 'К'}</Text>
                                                </View>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.modalTitle}>{selectedClient.name}</Text>
                                                <Text style={styles.muted}>
                                                    {selectedClient.company_name || (isRegistered ? 'Клиент приложения' : 'Частный клиент')}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedClient(null)} hitSlop={10}>
                                            <Icon name="x" size={22} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {isRegistered && (
                                        <View style={styles.verifyRow}>
                                            <View style={[styles.verifyChip, selectedClient.is_phone_verified && styles.verifyChipActive]}>
                                                <Icon name="phone" size={12} color={selectedClient.is_phone_verified ? colors.success : colors.textTertiary} />
                                                <Text style={[styles.verifyChipText, selectedClient.is_phone_verified && { color: colors.success }]}>
                                                    {selectedClient.is_phone_verified ? 'Телефон подтверждён' : 'Телефон не подтверждён'}
                                                </Text>
                                            </View>
                                            <View style={[styles.verifyChip, selectedClient.is_email_verified && styles.verifyChipActive]}>
                                                <Icon name="mail" size={12} color={selectedClient.is_email_verified ? colors.success : colors.textTertiary} />
                                                <Text style={[styles.verifyChipText, selectedClient.is_email_verified && { color: colors.success }]}>
                                                    {selectedClient.is_email_verified ? 'Email подтверждён' : 'Email не подтверждён'}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    <Text style={styles.sectionTitle}>Статистика</Text>
                                    <View style={styles.statsGrid}>
                                        <View style={styles.statCard}><Text style={styles.statValue}>{stats.totalRequests}</Text><Text style={styles.statLabel}>Заявок</Text></View>
                                        <View style={styles.statCard}><Text style={styles.statValue}>{stats.fulfilledCount}</Text><Text style={styles.statLabel}>Выполнено</Text></View>
                                    </View>
                                    <View style={styles.revenueCard}>
                                        <Text style={styles.statLabel}>Всего потрачено</Text>
                                        <Text style={styles.revenueValue}>{formatMoney(stats.totalSpent)}</Text>
                                    </View>

                                    <Text style={styles.sectionTitle}>Контакты</Text>
                                    <View style={styles.contactRow}>
                                        <Icon name="phone" size={14} color={colors.textTertiary} />
                                        <Text style={styles.detail}>{selectedClient.phone || 'Не указан'}</Text>
                                    </View>
                                    {selectedClient.email ? (
                                        <View style={styles.contactRow}>
                                            <Icon name="mail" size={14} color={colors.textTertiary} />
                                            <Text style={styles.detail}>{selectedClient.email}</Text>
                                        </View>
                                    ) : null}
                                    {selectedClient.address ? (
                                        <View style={styles.contactRow}>
                                            <Icon name="map_pin" size={14} color={colors.textTertiary} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.detail}>{selectedClient.address}</Text>
                                                <OpenAddressInMap address={selectedClient.address} />
                                            </View>
                                        </View>
                                    ) : null}
                                    {isRegistered && selectedClient.city_display ? (
                                        <View style={styles.contactRow}>
                                            <Icon name="building" size={14} color={colors.textTertiary} />
                                            <Text style={styles.detail}>{selectedClient.city_display}</Text>
                                        </View>
                                    ) : null}
                                    {isRegistered && selectedClient.date_joined ? (
                                        <View style={styles.contactRow}>
                                            <Icon name="calendar" size={14} color={colors.textTertiary} />
                                            <Text style={styles.detail}>
                                                В приложении с {new Date(selectedClient.date_joined).toLocaleDateString('ru-RU')}
                                            </Text>
                                        </View>
                                    ) : null}
                                    {selectedClient.notes ? (
                                        <>
                                            <Text style={styles.sectionTitle}>Заметки</Text>
                                            <Text style={styles.detail}>{selectedClient.notes}</Text>
                                        </>
                                    ) : null}
                                    {selectedClient.sales_rep_name ? (
                                        <Text style={styles.assigned}>Ответственный сотрудник: {selectedClient.sales_rep_name}</Text>
                                    ) : (
                                        <Text style={styles.muted}>Сотрудник ещё не закреплён за этим клиентом.</Text>
                                    )}

                                    {!isRegistered && (
                                        <Button
                                            label="Создать заявку"
                                            onPress={() => {
                                                const c = selectedClient;
                                                setSelectedClient(null);
                                                openRequest(c);
                                            }}
                                            style={{ marginTop: spacing.lg }}
                                        />
                                    )}
                                </>
                            );
                        })()}
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: STATUS_TOP,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    pageHeaderTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    list: { padding: spacing.md, paddingBottom: 90 },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    smallAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: colors.primary, fontWeight: '800', fontSize: 17 },
    name: { color: colors.text, fontWeight: '700', fontSize: 15 },
    muted: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
    detail: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
    assigned: { color: colors.primary, fontSize: 12, marginTop: spacing.sm },
    count: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    countText: { color: colors.primary, fontWeight: '700', fontSize: 11 },
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl },
    fabText: { color: '#fff', fontWeight: '700' },
    empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
    emptyTitle: { ...typography.h3, color: colors.text },
    loading: { padding: spacing.xl, textAlign: 'center', color: colors.textSecondary },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
    modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
    statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    statCard: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
    statValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
    statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
    revenueCard: { backgroundColor: '#ECFDF5', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
    revenueValue: { color: colors.success, fontSize: 20, fontWeight: '800', marginTop: 3 },
    productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    qty: { width: 28, textAlign: 'center', color: colors.text, fontWeight: '700' },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        marginTop: spacing.sm,
    },
    actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    verifyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    verifyChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.background,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    verifyChipActive: { backgroundColor: '#ECFDF5' },
    verifyChipText: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
});