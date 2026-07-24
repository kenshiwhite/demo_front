// SupplierApp/src/screens/BusinessDirectoryScreen.js
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
    Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import client from '../api/client';
import Icon from '../components/Icon';
import { AddressMap, OpenAddressInMap } from '../components/AddressMap';
import { Button, InputField } from '../components/UI';
import { radius, spacing, typography } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import { CrossFade, AnimatedListItem } from '../components/AnimatedPrimitives';

const emptyPerson = { name: '', phone: '', email: '', company_name: '', address: '', notes: '', latitude: null, longitude: null };

function SortChip({ label, active, onPress }) {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radius.full,
                backgroundColor: active ? colors.primary : colors.background,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                marginRight: spacing.sm,
            }}
        >
            <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : colors.textSecondary }}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

export default function BusinessDirectoryScreen({ isSupplier }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [section, setSection] = useState('clients');
    const [clients, setClients] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [personModal, setPersonModal] = useState(false);
    const [requestModal, setRequestModal] = useState(false);
    const [person, setPerson] = useState(emptyPerson);
    const [requestClient, setRequestClient] = useState(null);
    const [quantities, setQuantities] = useState({});
    const [saving, setSaving] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [clientSort, setClientSort] = useState('default'); // 'default' | 'revenue' | 'requests' | 'recent'
    const [workerSort, setWorkerSort] = useState('default'); // 'default' | 'revenue' | 'requests'

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const jobs = [client.get('/api/auth/business-clients/'), client.get('/api/catalog/products/')];
            if (isSupplier) {
                jobs.push(client.get('/api/auth/workers/'));
                jobs.push(client.get('/api/requests/'));
            }
            const result = await Promise.all(jobs);
            setClients(result[0].data.results || result[0].data);
            setProducts(result[1].data.results || result[1].data);
            if (isSupplier) {
                setWorkers(result[2].data.results || result[2].data);
                setRequests(result[3].data.results || result[3].data);
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить список компании');
        } finally {
            setLoading(false);
        }
    }, [isSupplier]);

    useEffect(() => { load(); }, [load]);

    const openPersonModal = () => {
        setPerson(emptyPerson);
        setPersonModal(true);
    };

    const savePerson = async () => {
        if (section === 'workers' && (!person.username?.trim() || !person.phone.trim() || person.password?.length < 8)) {
            Alert.alert('Проверьте данные', 'Укажите имя, телефон и пароль не короче 8 символов.');
            return;
        }
        if (section === 'clients' && (!person.name.trim() || !person.address.trim())) {
            Alert.alert('Проверьте данные', 'Укажите имя клиента и адрес.');
            return;
        }
        setSaving(true);
        try {
            await client.post(section === 'workers' ? '/api/auth/workers/' : '/api/auth/business-clients/', person);
            setPersonModal(false);
            await load();
            Alert.alert('Готово', section === 'workers' ? 'Учётная запись сотрудника создана.' : 'Клиент добавлен в вашу базу.');
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.detail || 'Не удалось создать учётную запись');
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

    // --- KPIs -----------------------------------------------------------
    // Per-client stats: how much each business_client has ordered, how many
    // requests, and when they last ordered. Keyed by BusinessClient id.
    const clientStatsMap = useMemo(() => {
        const map = {};
        for (const c of clients) {
            map[c.id] = { totalSpent: 0, totalRequests: 0, fulfilledCount: 0, lastActivity: null };
        }
        for (const r of requests) {
            if (!r.business_client) continue;
            const entry = map[r.business_client];
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

    // Per-worker (sales rep) stats: their assigned clients, request volume,
    // fulfilled revenue, and conversion rate. Keyed by User id.
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

    // Business-wide summary shown at the top of the screen.
    const businessKPIs = useMemo(() => {
        const fulfilled = requests.filter(r => r.status === 'fulfilled');
        const pending = requests.filter(r => r.status === 'pending');
        const totalRevenue = fulfilled.reduce((sum, r) => sum + Number(r.total_price || 0), 0);
        const decidable = requests.filter(r => ['fulfilled', 'declined', 'cancelled'].includes(r.status));
        return {
            totalRevenue,
            totalClients: clients.length,
            totalWorkers: workers.length,
            totalRequests: requests.length,
            pendingCount: pending.length,
            fulfilledCount: fulfilled.length,
            avgOrderValue: fulfilled.length ? totalRevenue / fulfilled.length : 0,
            conversionRate: decidable.length ? Math.round((fulfilled.length / decidable.length) * 100) : 0,
            topWorker: workers.reduce((best, w) => {
                const rev = workerStatsMap[w.id]?.revenue || 0;
                return !best || rev > best.revenue ? { name: w.username, revenue: rev } : best;
            }, null),
        };
    }, [requests, clients, workers, workerStatsMap]);

    const workerStats = selectedWorker ? workerStatsMap[selectedWorker.id] : null;

    const sortedClients = useMemo(() => {
        const list = [...clients];
        if (clientSort === 'revenue') {
            list.sort((a, b) => (clientStatsMap[b.id]?.totalSpent || 0) - (clientStatsMap[a.id]?.totalSpent || 0));
        } else if (clientSort === 'requests') {
            list.sort((a, b) => (clientStatsMap[b.id]?.totalRequests || 0) - (clientStatsMap[a.id]?.totalRequests || 0));
        } else if (clientSort === 'recent') {
            list.sort((a, b) => new Date(clientStatsMap[b.id]?.lastActivity || 0) - new Date(clientStatsMap[a.id]?.lastActivity || 0));
        }
        return list;
    }, [clients, clientSort, clientStatsMap]);

    const sortedWorkers = useMemo(() => {
        const list = [...workers];
        if (workerSort === 'revenue') {
            list.sort((a, b) => (workerStatsMap[b.id]?.revenue || 0) - (workerStatsMap[a.id]?.revenue || 0));
        } else if (workerSort === 'requests') {
            list.sort((a, b) => (workerStatsMap[b.id]?.requestCount || 0) - (workerStatsMap[a.id]?.requestCount || 0));
        }
        return list;
    }, [workers, workerSort, workerStatsMap]);

    const formatMoney = (n) => `${Math.round(n).toLocaleString('ru-RU')} ₸`;

    const renderClient = ({ item }) => {
        const stats = clientStatsMap[item.id] || { totalSpent: 0, totalRequests: 0, lastActivity: null };
        return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'К'}</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.muted}>{item.company_name || 'Частный клиент'}</Text>
                </View>
                <View style={styles.count}><Text style={styles.countText}>{stats.totalRequests || item.request_count || 0} заявок</Text></View>
            </View>

            {isSupplier && (
                <View style={styles.kpiRow}>
                    <View style={styles.kpiChip}>
                        <Icon name="trending_up" size={12} color={colors.success} />
                        <Text style={styles.kpiChipText}>{formatMoney(stats.totalSpent)}</Text>
                    </View>
                    <View style={styles.kpiChip}>
                        <Icon name="clock" size={12} color={colors.textTertiary} />
                        <Text style={styles.kpiChipText}>
                            {stats.lastActivity
                                ? `Заказ: ${new Date(stats.lastActivity).toLocaleDateString('ru-RU')}`
                                : 'Заказов ещё не было'}
                        </Text>
                    </View>
                </View>
            )}

            <Text style={styles.detail}>Телефон: {item.phone || '—'}</Text>
            {item.email ? <Text style={styles.detail}>Email: {item.email}</Text> : null}
            <Text style={styles.detail}>Адрес: {item.address}</Text>
            <OpenAddressInMap address={item.address} />
            {item.sales_rep_name ? <Text style={styles.assigned}>Ответственный: {item.sales_rep_name}</Text> : null}
            <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: colors.purple }]} onPress={() => openRequest(item)}>
                <Icon name="plus" size={15} color={colors.primary} />
                <Text style={[styles.actionBtnText]}>Создать заявку</Text>
            </TouchableOpacity>
        </View>
        );
    };

    const renderWorker = ({ item }) => {
        const stats = workerStatsMap[item.id] || { revenue: 0, requestCount: 0, conversionRate: 0 };
        return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedWorker(item)}
            activeOpacity={0.75}
        >
            <View style={styles.cardHeader}>
                {item.profile_picture ? (
                    <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, { backgroundColor: '#EDE9FE' }]}><Icon name="user" size={18} color={colors.purple} /></View>
                )}
                <View style={{ flex: 1 }}><Text style={styles.name}>{item.username}</Text><Text style={styles.muted}>{item.phone}</Text></View>
                <Icon name="chevronRight" size={18} color={colors.textTertiary} />
            </View>

            <View style={styles.kpiRow}>
                <View style={styles.kpiChip}>
                    <Icon name="trending_up" size={12} color={colors.success} />
                    <Text style={styles.kpiChipText}>{formatMoney(stats.revenue)}</Text>
                </View>
                <View style={styles.kpiChip}>
                    <Icon name="package" size={12} color={colors.textTertiary} />
                    <Text style={styles.kpiChipText}>{stats.requestCount} заявок</Text>
                </View>
                <View style={styles.kpiChip}>
                    <Icon name="check" size={12} color={colors.primary} />
                    <Text style={styles.kpiChipText}>{stats.conversionRate}% успех</Text>
                </View>
            </View>

            {item.email ? <Text style={styles.detail}>Email: {item.email}</Text> : null}
            <Text style={styles.assigned}>Нажмите, чтобы посмотреть клиентов и продажи.</Text>
        </TouchableOpacity>
        );
    };

    const data = section === 'workers' ? sortedWorkers : sortedClients;
    return <View style={styles.container}>
        <View style={styles.switcher}>
            <TouchableOpacity style={[styles.switch, section === 'clients' && styles.switchActive]} onPress={() => setSection('clients')}><Text style={[styles.switchText, section === 'clients' && styles.switchTextActive]}>Клиенты</Text></TouchableOpacity>
            {isSupplier && <TouchableOpacity style={[styles.switch, section === 'workers' && styles.switchActive]} onPress={() => setSection('workers')}><Text style={[styles.switchText, section === 'workers' && styles.switchTextActive]}>Сотрудники</Text></TouchableOpacity>}
        </View>

        {isSupplier && !loading && (
            <View style={styles.kpiDashboard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiDashboardScroll}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiCardLabel}>Выручка</Text>
                        <Text style={styles.kpiCardValue}>{formatMoney(businessKPIs.totalRevenue)}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiCardLabel}>Ср. чек</Text>
                        <Text style={styles.kpiCardValue}>{formatMoney(businessKPIs.avgOrderValue)}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiCardLabel}>Конверсия</Text>
                        <Text style={styles.kpiCardValue}>{businessKPIs.conversionRate}%</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiCardLabel}>В ожидании</Text>
                        <Text style={styles.kpiCardValue}>{businessKPIs.pendingCount}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiCardLabel}>Клиентов</Text>
                        <Text style={styles.kpiCardValue}>{businessKPIs.totalClients}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiCardLabel}>Сотрудников</Text>
                        <Text style={styles.kpiCardValue}>{businessKPIs.totalWorkers}</Text>
                    </View>
                </ScrollView>
                {businessKPIs.topWorker && businessKPIs.topWorker.revenue > 0 && (
                    <View style={styles.topWorkerBanner}>
                        <Text style={styles.topWorkerBannerIcon}>🏆</Text>
                        <Text style={styles.topWorkerBannerText}>
                            Лучший сотрудник: <Text style={{ fontWeight: '800' }}>{businessKPIs.topWorker.name}</Text> — {formatMoney(businessKPIs.topWorker.revenue)}
                        </Text>
                    </View>
                )}
            </View>
        )}

        {isSupplier && !loading && (
            <View style={styles.sortRow}>
                <Text style={styles.sortLabel}>Сортировать:</Text>
                {section === 'clients' ? (
                    <>
                        <SortChip label="По умолчанию" active={clientSort === 'default'} onPress={() => setClientSort('default')} />
                        <SortChip label="По выручке" active={clientSort === 'revenue'} onPress={() => setClientSort('revenue')} />
                        <SortChip label="По заявкам" active={clientSort === 'requests'} onPress={() => setClientSort('requests')} />
                        <SortChip label="Недавние" active={clientSort === 'recent'} onPress={() => setClientSort('recent')} />
                    </>
                ) : (
                    <>
                        <SortChip label="По умолчанию" active={workerSort === 'default'} onPress={() => setWorkerSort('default')} />
                        <SortChip label="По выручке" active={workerSort === 'revenue'} onPress={() => setWorkerSort('revenue')} />
                        <SortChip label="По заявкам" active={workerSort === 'requests'} onPress={() => setWorkerSort('requests')} />
                    </>
                )}
            </View>
        )}

        <CrossFade activeKey={loading ? 'loading' : section} style={{ flex: 1 }}>
        {loading ? <Text style={styles.loading}>Загрузка...</Text> : <FlatList
            data={data}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
                <AnimatedListItem index={index}>
                    {section === 'workers' ? renderWorker({ item }) : renderClient({ item })}
                </AnimatedListItem>
            )}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<View style={styles.empty}><Icon name="user" size={30} color={colors.textTertiary} /><Text style={styles.emptyTitle}>{section === 'workers' ? 'Сотрудников пока нет' : 'Клиентов пока нет'}</Text><Text style={styles.muted}>{section === 'workers' ? 'Добавьте продавца, чтобы он работал от имени компании.' : 'Добавьте клиента или дождитесь его первой заявки.'}</Text></View>}
        />}
        </CrossFade>
        <TouchableOpacity style={styles.fab} onPress={openPersonModal}><Icon name="plus" size={20} color="#fff" /><Text style={styles.fabText}>{section === 'workers' ? 'Добавить сотрудника' : 'Добавить клиента'}</Text></TouchableOpacity>

        <Modal visible={personModal} transparent animationType="slide">
            <View style={styles.overlay}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView style={styles.modal} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>{section === 'workers' ? 'Новый сотрудник' : 'Новый клиент'}</Text>
                <InputField label={section === 'workers' ? 'Имя / логин *' : 'Имя клиента *'} value={section === 'workers' ? person.username : person.name} onChangeText={v => setPerson(p => ({ ...p, [section === 'workers' ? 'username' : 'name']: v }))} placeholder="Например, Айдана" autoCapitalize="words" />
                <InputField label="Телефон *" value={person.phone} onChangeText={v => setPerson(p => ({ ...p, phone: v }))} placeholder="+7 700 000 00 00" keyboardType="phone-pad" />
                <InputField label="Email" value={person.email} onChangeText={v => setPerson(p => ({ ...p, email: v }))} placeholder="mail@example.com" keyboardType="email-address" />
                {section === 'clients' && <InputField label="Компания" value={person.company_name} onChangeText={v => setPerson(p => ({ ...p, company_name: v }))} placeholder="Название компании" autoCapitalize="words" />}
                {section === 'clients' && <InputField label="Адрес *" value={person.address} onChangeText={v => setPerson(p => ({ ...p, address: v }))} placeholder="Город, улица, дом" multiline numberOfLines={2} autoCapitalize="sentences" />}
                {section === 'clients' && <AddressMap latitude={person.latitude} longitude={person.longitude} />}
                {section === 'clients' && <InputField label="Заметки" value={person.notes} onChangeText={v => setPerson(p => ({ ...p, notes: v }))} placeholder="Дополнительная информация" multiline numberOfLines={2} autoCapitalize="sentences" />}
                {section === 'workers' && <InputField label="Временный пароль *" value={person.password || ''} onChangeText={v => setPerson(p => ({ ...p, password: v }))} placeholder="Не менее 8 символов" secureTextEntry />}
                <Button label={section === 'workers' ? 'Создать учётную запись' : 'Добавить клиента'} onPress={savePerson} loading={saving} />
                <Button label="Отмена" onPress={() => setPersonModal(false)} variant="ghost" />
            </ScrollView></KeyboardAvoidingView></View>
        </Modal>

        <Modal visible={requestModal} transparent animationType="slide">
            <View style={styles.overlay}><KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={styles.modal}>
                <Text style={styles.modalTitle}>Заявка для {requestClient?.name}</Text><Text style={styles.muted}>Доступные остатки вашей компании</Text>
                <ScrollView style={{ maxHeight: 380 }}>{products.map(product => <View key={product.id} style={styles.productRow}>
                    <View style={{ flex: 1 }}><Text style={styles.name}>{product.name}</Text><Text style={styles.muted}>{product.stock_quantity} {product.unit} · {Number(product.price).toLocaleString('ru-RU')} ₸</Text></View>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => changeQuantity(product.id, -1)}><Icon name="minus" size={15} color={colors.primary} /></TouchableOpacity><Text style={styles.qty}>{quantities[product.id] || 0}</Text><TouchableOpacity style={styles.qtyBtn} disabled={(quantities[product.id] || 0) >= product.stock_quantity} onPress={() => changeQuantity(product.id, 1)}><Icon name="plus" size={15} color={colors.primary} /></TouchableOpacity>
                </View>)}</ScrollView>
                <Button label="Создать заявку" onPress={createRequest} loading={saving} /><Button label="Отмена" onPress={() => setRequestModal(false)} variant="ghost" />
            </View></KeyboardAvoidingView></View>
        </Modal>

        <Modal
            visible={Boolean(selectedWorker)}
            transparent
            animationType="slide"
            onRequestClose={() => setSelectedWorker(null)}
        >
            <View style={styles.overlay}>
                <ScrollView style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                            {selectedWorker?.profile_picture ? (
                                <Image source={{ uri: selectedWorker.profile_picture }} style={styles.smallAvatar} />
                            ) : (
                                <View style={[styles.smallAvatar, { backgroundColor: '#EDE9FE' }]}>
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
                                <Text style={styles.clientRequestCount}>{clientStatsMap[customer.id]?.totalRequests ?? customer.request_count ?? 0} заявок</Text>
                            </View>
                        )) : <Text style={styles.muted}>У сотрудника пока нет закреплённых клиентов.</Text>}
                    </ScrollView>
                </ScrollView>
            </View>
        </Modal>
    </View>;
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background }, switcher: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm, backgroundColor: colors.card }, switch: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md }, switchActive: { backgroundColor: colors.primaryLight }, switchText: { color: colors.textSecondary, fontWeight: '600' }, switchTextActive: { color: colors.primary }, list: { padding: spacing.md, paddingBottom: 90 }, card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight }, cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, smallAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary, fontWeight: '800', fontSize: 17 }, name: { color: colors.text, fontWeight: '700', fontSize: 15 }, muted: { color: colors.textSecondary, fontSize: 13, marginTop: 2 }, detail: { color: colors.textSecondary, fontSize: 13, marginTop: 3 }, assigned: { color: colors.primary, fontSize: 12, marginTop: spacing.sm }, count: { backgroundColor: colors.primaryLight, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 }, countText: { color: colors.primary, fontWeight: '700', fontSize: 11 }, requestButton: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.md, alignSelf: 'flex-start' }, requestButtonText: { color: colors.primary, fontWeight: '700', fontSize: 13 }, fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.xl }, fabText: { color: '#fff', fontWeight: '700' }, empty: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm }, emptyTitle: { ...typography.h3, color: colors.text }, loading: { padding: spacing.xl, textAlign: 'center', color: colors.textSecondary }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }, modal: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%' }, modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.lg }, modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm }, sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm }, statsGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }, statCard: { flex: 1, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' }, statValue: { color: colors.primary, fontSize: 20, fontWeight: '800' }, statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3 }, revenueCard: { backgroundColor: '#ECFDF5', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg }, revenueValue: { color: colors.success, fontSize: 20, fontWeight: '800', marginTop: 3 }, workerClients: { maxHeight: 260 }, workerClientsContent: { gap: spacing.sm, paddingBottom: spacing.sm }, workerClientRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md }, clientRequestCount: { color: colors.textSecondary, fontSize: 11 }, productRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight }, qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }, qty: { width: 28, textAlign: 'center', color: colors.text, fontWeight: '700' }, 
    actionBtn: { flex: 1,
        marginTop: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
    },
    actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

    // KPI dashboard
    kpiDashboard: { paddingTop: spacing.md, backgroundColor: colors.card },
    kpiDashboardScroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
    kpiCard: {
        minWidth: 110,
        backgroundColor: colors.background,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        marginRight: spacing.sm,
    },
    kpiCardLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 3 },
    kpiCardValue: { fontSize: 15, fontWeight: '800', color: colors.text },
    topWorkerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginHorizontal: spacing.md,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        backgroundColor: '#FFFBEB',
        borderRadius: radius.md,
    },
    topWorkerBannerIcon: { fontSize: 14 },
    topWorkerBannerText: { fontSize: 12, color: '#92400E', flex: 1 },

    // Sort row
    sortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.card,
        flexWrap: 'wrap',
        gap: spacing.xs,
    },
    sortLabel: { fontSize: 12, color: colors.textTertiary, marginRight: spacing.xs },

    // Per-card KPI chips
    kpiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    kpiChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.background,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    kpiChipText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
});