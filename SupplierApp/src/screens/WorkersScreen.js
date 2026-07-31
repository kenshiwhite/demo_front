// SupplierApp/src/screens/WorkersScreen.js
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import client from '../api/client';
import Icon from '../components/Icon';
import { Button, InputField } from '../components/UI';
import { radius, spacing, typography, STATUS_TOP } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { AnimatedListItem } from '../components/AnimatedPrimitives';
import BottomSheet from '../components/BottomSheet';
import { cityLabel } from '../constants/cities';

const emptyPerson = { username: '', phone: '', email: '', password: '' };

export default function WorkersScreen({ onBack, activeCity, serviceCities = [] }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [workers, setWorkers] = useState([]);
    const [clients, setClients] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [personModal, setPersonModal] = useState(false);
    const [person, setPerson] = useState(emptyPerson);
    const [saving, setSaving] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const cityParams = activeCity ? { city: activeCity } : {};
            const [workersRes, clientsRes, requestsRes] = await Promise.all([
                client.get('/api/auth/workers/', { params: cityParams }),
                client.get('/api/auth/business-clients/', { params: cityParams }),
                client.get('/api/requests/', { params: cityParams }),
            ]);
            setWorkers(workersRes.data.results || workersRes.data);
            setClients(clientsRes.data.results || clientsRes.data);
            setRequests(requestsRes.data.results || requestsRes.data);
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить список сотрудников');
        } finally {
            setLoading(false);
        }
    }, [activeCity]);

    useEffect(() => { load(); }, [load]);

    const openPersonModal = () => {
        setPerson(emptyPerson);
        setPersonModal(true);
    };

    const savePerson = async () => {
        if (!person.username?.trim() || !person.phone.trim() || person.password?.length < 8) {
            Alert.alert('Проверьте данные', 'Укажите имя, телефон и пароль не короче 8 символов.');
            return;
        }
        setSaving(true);
        try {
            await client.post('/api/auth/workers/', { ...person, city: activeCity });
            setPersonModal(false);
            await load();
            Alert.alert('Готово', 'Учётная запись сотрудника создана.');
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать учётную запись');
        } finally {
            setSaving(false);
        }
    };

    // Helper: matches the same key scheme ClientsScreen uses, so a worker's
    // assigned-clients count lines up with what the Clients screen shows.
    const clientKey = (c) => `${c.client_type}-${c.id}`;

    const clientStatsMap = useMemo(() => {
        const map = {};
        for (const c of clients) {
            map[clientKey(c)] = { totalRequests: 0 };
        }
        for (const r of requests) {
            const key = r.business_client
                ? `business-${r.business_client}`
                : r.client ? `registered-${r.client}` : null;
            if (!key || !map[key]) continue;
            map[key].totalRequests += 1;
        }
        return map;
    }, [clients, requests]);

    // Per-worker stats: their assigned clients, request volume, fulfilled
    // revenue, and conversion rate. Keyed by User id.
    const workerStatsMap = useMemo(() => {
        const map = {};
        for (const w of workers) {
            const workerClients = clients.filter(c => c.sales_rep === w.id);
            const workerRequests = requests.filter(r => r.sales_rep === w.id);
            const completedRequests = workerRequests.filter(r => r.status === 'fulfilled');
            const revenue = completedRequests.reduce((sum, r) => sum + Number(r.total_price || 0), 0);
            map[w.id] = {
                clients: workerClients,
                requestCount: workerRequests.length,
                completedCount: completedRequests.length,
                revenue,
                conversionRate: workerRequests.length ? Math.round((completedRequests.length / workerRequests.length) * 100) : 0,
                avgOrderValue: completedRequests.length ? revenue / completedRequests.length : 0,
            };
        }
        return map;
    }, [workers, clients, requests]);

    const workerStats = selectedWorker ? workerStatsMap[selectedWorker.id] : null;

    const formatMoney = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;

    const renderWorker = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedWorker(item)}
            activeOpacity={0.75}
        >
            <View style={styles.cardHeader}>
                {item.profile_picture ? (
                    <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: colors.purpleLight }]}><Icon name="user" size={18} color={colors.purple} /></View>
                )}
                <View style={{ flex: 1 }}><Text style={styles.name}>{item.username}</Text><Text style={styles.muted}>{item.phone}</Text></View>
                <Icon name="chevronRight" size={18} color={colors.textTertiary} />
            </View>
            {item.email ? <Text style={styles.detail}>Email: {item.email}</Text> : null}
            <Text style={styles.assigned}>Нажмите, чтобы посмотреть клиентов и продажи.</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.pageHeader}>
                <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={10}>
                    <Icon name="chevronLeft" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.pageHeaderTitle}>
                    Сотрудники{serviceCities.length > 1 && activeCity ? ` · ${cityLabel(activeCity)}` : ''}
                </Text>
                <View style={styles.backBtn} />
            </View>

            {loading ? (
                <Text style={styles.loading}>Загрузка...</Text>
            ) : (
                <FlatList
                    data={workers}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item, index }) => (
                        <AnimatedListItem index={index}>
                            {renderWorker({ item })}
                        </AnimatedListItem>
                    )}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Icon name="user" size={30} color={colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Сотрудников пока нет</Text>
                            <Text style={styles.muted}>Добавьте продавца, чтобы он работал от имени компании.</Text>
                        </View>
                    }
                />
            )}

            {!personModal && !selectedWorker && (
                <TouchableOpacity style={styles.fab} onPress={openPersonModal}>
                    <Icon name="plus" size={20} color="#fff" />
                    <Text style={styles.fabText}>Добавить сотрудника</Text>
                </TouchableOpacity>
            )}

            <BottomSheet visible={personModal} onClose={() => setPersonModal(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Новый сотрудник</Text>
                    <InputField label="Имя / логин *" value={person.username} onChangeText={v => setPerson(p => ({ ...p, username: v }))} placeholder="Например, Айдана" autoCapitalize="words" />
                    <InputField label="Телефон *" value={person.phone} onChangeText={v => setPerson(p => ({ ...p, phone: v }))} placeholder="+7 700 000 00 00" keyboardType="phone-pad" />
                    <InputField label="Email" value={person.email} onChangeText={v => setPerson(p => ({ ...p, email: v }))} placeholder="mail@example.com" keyboardType="email-address" />
                    <InputField label="Временный пароль *" value={person.password} onChangeText={v => setPerson(p => ({ ...p, password: v }))} placeholder="Не менее 8 символов" secureTextEntry />
                    <Button label="Создать учётную запись" onPress={savePerson} loading={saving} />
                    <Button label="Отмена" onPress={() => setPersonModal(false)} variant="ghost" />
                </ScrollView></KeyboardAvoidingView>
            </BottomSheet>

            <BottomSheet
                visible={Boolean(selectedWorker)}
                onClose={() => setSelectedWorker(null)}
            >
                    <ScrollView style={styles.modal}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                                {selectedWorker?.profile_picture ? (
                                    <Image source={{ uri: selectedWorker.profile_picture }} style={styles.smallAvatar} />
                                ) : (
                                    <View style={[styles.smallAvatar, { backgroundColor: colors.purpleLight }]}>
                                        <Icon name="user" size={16} color={colors.purple} />
                                    </View>
                                )}
                                <View>
                                    <Text style={styles.modalTitle}>{selectedWorker?.username}</Text>
                                    <Text style={styles.muted}>{selectedWorker?.phone || 'Телефон не указан'}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedWorker(null)} hitSlop={10}>
                                <Icon name="x" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Статистика продаж</Text>
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}><Text style={styles.statValue}>{workerStats?.clients.length || 0}</Text><Text style={styles.statLabel}>Клиентов</Text></View>
                            <View style={styles.statCard}><Text style={styles.statValue}>{workerStats?.requestCount || 0}</Text><Text style={styles.statLabel}>Заявок</Text></View>
                            <View style={styles.statCard}><Text style={styles.statValue}>{workerStats?.completedCount || 0}</Text><Text style={styles.statLabel}>Выполнено</Text></View>
                        </View>
                        <View style={styles.statsGrid}>
                            <View style={styles.statCard}><Text style={styles.statValue}>{workerStats?.conversionRate || 0}%</Text><Text style={styles.statLabel}>Конверсия</Text></View>
                            <View style={styles.statCard}><Text style={styles.statValue}>{formatMoney(workerStats?.avgOrderValue || 0)}</Text><Text style={styles.statLabel}>Средний чек</Text></View>
                        </View>
                        <View style={styles.revenueCard}>
                            <Text style={styles.statLabel}>Продажи по выполненным заявкам</Text>
                            <Text style={styles.revenueValue}>{formatMoney(workerStats?.revenue || 0)}</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Клиенты сотрудника</Text>
                        <ScrollView style={styles.workerClients} contentContainerStyle={styles.workerClientsContent}>
                            {workerStats?.clients.length ? workerStats.clients.map(customer => (
                                <View key={customer.id} style={styles.workerClientRow}>
                                    <View style={styles.smallAvatar}><Text style={styles.avatarText}>{customer.name?.[0]?.toUpperCase() || 'К'}</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.name}>{customer.name}</Text>
                                        <Text style={styles.muted}>{customer.company_name || customer.phone || 'Частный клиент'}</Text>
                                    </View>
                                    <Text style={styles.clientRequestCount}>{clientStatsMap[clientKey(customer)]?.totalRequests ?? customer.request_count ?? 0} заявок</Text>
                                </View>
                            )) : <Text style={styles.muted}>У сотрудника пока нет закреплённых клиентов.</Text>}
                        </ScrollView>
                    </ScrollView>
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
    fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl },
    fabText: { color: '#fff', fontWeight: '700' },
    empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
    emptyTitle: { ...typography.h3, color: colors.text },
    loading: { padding: spacing.xl, textAlign: 'center', color: colors.textSecondary },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modal: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg },
    modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
    statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    statCard: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
    statValue: { color: colors.primary, fontSize: 20, fontWeight: '800' },
    statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
    revenueCard: { backgroundColor: colors.successLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
    revenueValue: { color: colors.success, fontSize: 20, fontWeight: '800', marginTop: 3 },
    workerClients: { maxHeight: 260 },
    workerClientsContent: { gap: spacing.sm, paddingBottom: spacing.sm },
    workerClientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md },
    clientRequestCount: { color: colors.textSecondary, fontSize: 11 },
});