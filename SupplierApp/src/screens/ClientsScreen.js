import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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
import BottomSheet from '../components/BottomSheet';
import DatePickerSheet from '../components/DatePickerSheet';
import { cityLabel } from '../constants/cities';

const emptyPerson = { name: '', phone: '', email: '', company_name: '', address: '', notes: '', latitude: null, longitude: null };

export default function ClientsScreen({ onBack, activeCity, serviceCities = [] }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [clients, setClients] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [personModal, setPersonModal] = useState(false);
    const [requestModal, setRequestModal] = useState(false);
    const [person, setPerson] = useState(emptyPerson);
    const [requestClient, setRequestClient] = useState(null);
    const [deliveryDate, setDeliveryDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [quantities, setQuantities] = useState({});
    const [saving, setSaving] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [showRepPicker, setShowRepPicker] = useState(false);
    const [assigningRep, setAssigningRep] = useState(false);

    const hasLoadedOnce = useRef(false);

    const load = useCallback(async () => {
        if (!hasLoadedOnce.current) setLoading(true);
        try {
            const cityParams = activeCity ? { city: activeCity } : {};
            const [clientsRes, productsRes, requestsRes] = await Promise.all([
                client.get('/api/auth/business-clients/', { params: cityParams }),
                client.get('/api/catalog/products/', { params: cityParams }),
                client.get('/api/requests/', { params: cityParams }),
            ]);
            setClients(clientsRes.data.results || clientsRes.data);
            setProducts(productsRes.data.results || productsRes.data);
            setRequests(requestsRes.data.results || requestsRes.data);
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить список клиентов');
        } finally {
            setLoading(false);
            hasLoadedOnce.current = true;
        }
        // Workers are only needed for the rep-assignment picker — fetched
        // separately so a failure here (permissions, network) never blocks
        // the client list itself from showing.
        try {
            const cityParams = activeCity ? { city: activeCity } : {};
            const workersRes = await client.get('/api/auth/workers/', { params: cityParams });
            setWorkers(workersRes.data.results || workersRes.data);
        } catch (error) {
            setWorkers([]);
        }
    }, [activeCity]);

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
            await client.post('/api/auth/business-clients/', { ...person, city: activeCity });
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
        setDeliveryDate('');
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
            await client.post('/api/requests/', {
                business_client_id: requestClient.id,
                items,
                desired_delivery_date: deliveryDate || null,
            });
            setRequestModal(false);
            Alert.alert('Заявка создана', `Заявка для ${requestClient.name} сохранена.`);
            load();
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать заявку');
        } finally {
            setSaving(false);
        }
    };

    const assignRep = async (workerId) => {
        if (!selectedClient) return;
        setAssigningRep(true);
        try {
            const { data } = await client.patch(
                `/api/auth/clients/${selectedClient.client_type}/${selectedClient.id}/assign-rep/`,
                { sales_rep_id: workerId || null }
            );
            setSelectedClient(prev => ({ ...prev, ...data, client_type: prev.client_type }));
            setClients(current => current.map(c =>
                clientKey(c) === clientKey(selectedClient) ? { ...c, ...data, client_type: c.client_type } : c
            ));
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось назначить сотрудника');
        } finally {
            setAssigningRep(false);
            setShowRepPicker(false);
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

    // Photo reports across all of a client's requests, newest first —
    // matched the same way as clientStatsMap above.
    const clientPhotosMap = useMemo(() => {
        const map = {};
        for (const r of requests) {
            if (!r.photo_reports?.length) continue;
            const key = r.business_client
                ? `business-${r.business_client}`
                : r.client ? `registered-${r.client}` : null;
            if (!key) continue;
            if (!map[key]) map[key] = [];
            map[key].push(...r.photo_reports);
        }
        for (const key in map) {
            map[key].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        return map;
    }, [requests]);

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
                        <Icon name="plus" size={15} color={colors.white} />
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
                <Text style={styles.pageHeaderTitle}>
                    Клиенты{serviceCities.length > 1 && activeCity ? ` · ${cityLabel(activeCity)}` : ''}
                </Text>
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

            {!personModal && !requestModal && !selectedClient && !showDatePicker && !showRepPicker && (
                <TouchableOpacity style={styles.fab} onPress={openPersonModal}>
                    <Icon name="plus" size={20} color="#fff" />
                    <Text style={styles.fabText}>Добавить клиента</Text>
                </TouchableOpacity>
            )}

            <BottomSheet visible={personModal} onClose={() => setPersonModal(false)}>
                <ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
                    <View style={styles.modalHandle} />
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
                </ScrollView>
            </BottomSheet>

            <BottomSheet visible={requestModal} onClose={() => setRequestModal(false)}>
                <View style={[styles.modal, styles.requestModal]}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Заявка для {requestClient?.name}</Text>
                    <Text style={styles.muted}>Доступные остатки вашей компании</Text>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.md }} showsVerticalScrollIndicator={false}>{products.map(product => (
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
                    <Text style={styles.fieldLabel}>Желаемая дата доставки</Text>
                    <TouchableOpacity style={styles.dateField} onPress={() => setShowDatePicker(true)}>
                        <Icon name="calendar" size={16} color={colors.primary} />
                        <Text style={[styles.dateFieldText, !deliveryDate && styles.dateFieldPlaceholder]}>
                            {deliveryDate || 'Выберите дату'}
                        </Text>
                    </TouchableOpacity>
                    <Button label="Создать заявку" onPress={createRequest} loading={saving} />
                    <Button label="Отмена" onPress={() => setRequestModal(false)} variant="ghost" />
                </View>
            </BottomSheet>

            <DatePickerSheet
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                value={deliveryDate}
                onSelect={setDeliveryDate}
                title="Дата доставки"
            />

            <BottomSheet
                visible={Boolean(selectedClient)}
                onClose={() => setSelectedClient(null)}
            >
                    <ScrollView style={styles.modal}>
                        <View style={styles.modalHandle} />
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

                                    {(() => {
                                        const photos = clientPhotosMap[clientKey(selectedClient)] || [];
                                        if (photos.length === 0) return null;
                                        return (
                                            <>
                                                <Text style={styles.sectionTitle}>Фотоотчёты ({photos.length})</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                                                    {photos.map(report => (
                                                        <View key={report.id} style={styles.clientPhotoItem}>
                                                            <Image source={{ uri: report.image }} style={styles.clientPhotoImage} />
                                                            <Text style={styles.clientPhotoDate}>
                                                                {new Date(report.created_at).toLocaleDateString('ru-RU')}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </ScrollView>
                                            </>
                                        );
                                    })()}

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
                                    <Text style={styles.sectionTitle}>Ответственный сотрудник</Text>
                                    <TouchableOpacity
                                        style={styles.repRow}
                                        onPress={() => setShowRepPicker(true)}
                                        disabled={assigningRep}
                                    >
                                        <Icon name="team" size={16} color={selectedClient.sales_rep_name ? colors.primary : colors.textTertiary} />
                                        <Text style={[styles.repRowText, !selectedClient.sales_rep_name && styles.muted]}>
                                            {selectedClient.sales_rep_name || 'Сотрудник не закреплён'}
                                        </Text>
                                        <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                                    </TouchableOpacity>

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
            </BottomSheet>

            <BottomSheet visible={showRepPicker} onClose={() => setShowRepPicker(false)}>
                <View style={styles.modal}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Ответственный сотрудник</Text>
                    <ScrollView style={{ maxHeight: 420 }}>
                        <TouchableOpacity
                            style={[styles.repOption, !selectedClient?.sales_rep_name && styles.repOptionActive]}
                            onPress={() => assignRep(null)}
                            disabled={assigningRep}
                        >
                            <Text style={styles.repOptionText}>Не назначен</Text>
                            {!selectedClient?.sales_rep_name && <Icon name="check" size={18} color={colors.primary} />}
                        </TouchableOpacity>
                        {workers.map(worker => {
                            const active = selectedClient?.sales_rep === worker.id;
                            return (
                                <TouchableOpacity
                                    key={worker.id}
                                    style={[styles.repOption, active && styles.repOptionActive]}
                                    onPress={() => assignRep(worker.id)}
                                    disabled={assigningRep}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.repOptionText}>{worker.username}</Text>
                                        {worker.city_display ? <Text style={styles.muted}>{worker.city_display}</Text> : null}
                                    </View>
                                    {active && <Icon name="check" size={18} color={colors.primary} />}
                                </TouchableOpacity>
                            );
                        })}
                        {workers.length === 0 && (
                            <Text style={styles.muted}>В вашей компании пока нет сотрудников.</Text>
                        )}
                    </ScrollView>
                </View>
            </BottomSheet>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    pageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.card,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    pageHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
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
    requestModal: { height: '82%', paddingBottom: spacing.xl },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.xs },
    dateField: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        backgroundColor: colors.card, marginBottom: spacing.md,
    },
    dateFieldText: { fontSize: 15, color: colors.text, fontWeight: '500' },
    dateFieldPlaceholder: { color: colors.placeholder, fontWeight: '400' },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
    modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
    statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    statCard: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
    statValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
    statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
    revenueCard: { backgroundColor: colors.successLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
    revenueValue: { color: colors.success, fontSize: 20, fontWeight: '800', marginTop: 3 },
    clientPhotoItem: { marginRight: spacing.sm, width: 100 },
    clientPhotoImage: { width: 100, height: 100, borderRadius: radius.md, backgroundColor: colors.borderLight },
    clientPhotoDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4, fontWeight: '600' },
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
    verifyChipActive: { backgroundColor: colors.successLight },
    verifyChipText: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    repRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.card,
        marginBottom: spacing.md,
    },
    repRowText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
    repOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.xs,
    },
    repOptionActive: { backgroundColor: colors.primaryLight },
    repOptionText: { fontSize: 15, color: colors.text, fontWeight: '500' },
});