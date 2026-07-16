// src/screens/BusinessDirectoryScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView,
    StyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import client from '../api/client';
import Icon from '../components/Icon';
import { AddressMap, OpenAddressInMap } from '../components/AddressMap';
import { Button, InputField } from '../components/UI';
import { colors, radius, spacing, typography } from '../styles/theme';

const emptyPerson = { name: '', phone: '', email: '', company_name: '', address: '', notes: '', latitude: null, longitude: null };

export default function BusinessDirectoryScreen({ isSupplier }) {
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

    const workerStats = selectedWorker ? (() => {
        const workerClients = clients.filter(item => item.sales_rep === selectedWorker.id);
        const workerRequests = requests.filter(item => item.sales_rep === selectedWorker.id);
        const completedRequests = workerRequests.filter(item => item.status === 'fulfilled');
        const revenue = completedRequests.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

        return {
            clients: workerClients,
            requestCount: workerRequests.length,
            completedCount: completedRequests.length,
            revenue,
        };
    })() : null;

    const renderClient = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase() || 'К'}</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.muted}>{item.company_name || 'Частный клиент'}</Text>
                </View>
                <View style={styles.count}><Text style={styles.countText}>{item.request_count || 0} заявок</Text></View>
            </View>
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
                    <View style={[styles.avatar, { backgroundColor: '#EDE9FE' }]}><Icon name="user" size={18} color={colors.purple} /></View>
                )}
                <View style={{ flex: 1 }}><Text style={styles.name}>{item.username}</Text><Text style={styles.muted}>{item.phone}</Text></View>
                <Icon name="chevronRight" size={18} color={colors.textTertiary} />
            </View>
            {item.email ? <Text style={styles.detail}>Email: {item.email}</Text> : null}
            <Text style={styles.assigned}>Нажмите, чтобы посмотреть клиентов и продажи.</Text>
        </TouchableOpacity>
    );

    const data = section === 'workers' ? workers : clients;
    return <View style={styles.container}>
        <View style={styles.switcher}>
            <TouchableOpacity style={[styles.switch, section === 'clients' && styles.switchActive]} onPress={() => setSection('clients')}><Text style={[styles.switchText, section === 'clients' && styles.switchTextActive]}>Клиенты</Text></TouchableOpacity>
            {isSupplier && <TouchableOpacity style={[styles.switch, section === 'workers' && styles.switchActive]} onPress={() => setSection('workers')}><Text style={[styles.switchText, section === 'workers' && styles.switchTextActive]}>Сотрудники</Text></TouchableOpacity>}
        </View>
        {loading ? <Text style={styles.loading}>Загрузка...</Text> : <FlatList
            data={data}
            keyExtractor={(item) => String(item.id)}
            renderItem={section === 'workers' ? renderWorker : renderClient}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<View style={styles.empty}><Icon name="user" size={30} color={colors.textTertiary} /><Text style={styles.emptyTitle}>{section === 'workers' ? 'Сотрудников пока нет' : 'Клиентов пока нет'}</Text><Text style={styles.muted}>{section === 'workers' ? 'Добавьте продавца, чтобы он работал от имени компании.' : 'Добавьте клиента или дождитесь его первой заявки.'}</Text></View>}
        />}
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
                    <View style={styles.revenueCard}>
                        <Text style={styles.statLabel}>Продажи по выполненным заявкам</Text>
                        <Text style={styles.revenueValue}>{Math.round(workerStats?.revenue || 0).toLocaleString('ru-RU')} ₸</Text>
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
                                <Text style={styles.clientRequestCount}>{customer.request_count || 0} заявок</Text>
                            </View>
                        )) : <Text style={styles.muted}>У сотрудника пока нет закреплённых клиентов.</Text>}
                    </ScrollView>
                </ScrollView>
            </View>
        </Modal>
    </View>;
}

const styles = StyleSheet.create({
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
});