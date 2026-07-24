import React, { useState, useEffect, useRef, useMemo } from 'react';
import CitySelectScreen from "../screens/CitySelectScreen"
import { useCity } from '../context/CityContext';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert,
    Modal, TextInput, ScrollView, Image,
    KeyboardAvoidingView, Platform,
    TouchableWithoutFeedback, Keyboard,
    Animated
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import SupplierHomeTab from './SupplierHomeTab';
import NotificationsScreen from './NotificationsScreen';
import RequestDetailScreen from './RequestDetailScreen';
import ProfileScreen from './ProfileScreen';
import AnalyticsScreen from './AnalyticsScreen';
import { InputField, Button, SectionTitle } from '../components/UI';
import { spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import * as ImagePicker from 'expo-image-picker';
import CalendarScreen from './CalendarScreen';
import BusinessDirectoryScreen from './BusinessDirectoryScreen';
import { ScreenOverlay, CrossFade } from '../components/AnimatedPrimitives';


export default function SupplierHomeScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { signOut, user } = useAuth();
    const [view, setView] = useState('home');
    const [requestsSubTab, setRequestsSubTab] = useState('list'); // 'list' | 'clients' — sales_rep only
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [requestFilter, setRequestFilter] = useState('active');
    const [responseModal, setResponseModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedRequestDetail, setSelectedRequestDetail] = useState(null);
    const [message, setMessage] = useState('');
    const [offeredPrice, setOfferedPrice] = useState('');
    const [productModal, setProductModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [productImage, setProductImage] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarSelectedRequest, setCalendarSelectedRequest] = useState(null);
    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: '',
        unit: '',
        stock_quantity: '',
        is_available: true,
        category: '',
    });
    const [categories, setCategories] = useState([]);
    const [categoryModal, setCategoryModal] = useState(false);  
    const [unreadCount, setUnreadCount] = useState(0);
    const { selectedCity, cityLabel, selectCity } = useCity();    
    const [showCitySelect, setShowCitySelect] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadUnreadCount();
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const response = await client.get('/api/catalog/categories/');
            const data = response.data.results || response.data;
            setCategories(Array.isArray(data) ? data : []);
        } catch (e) {
            console.log('Could not load categories', e?.response?.data || e.message);
        }
    };

    useEffect(() => {
        if (view === 'requests') loadRequests();
        else if (view === 'products') loadProducts();
    }, [view]);

    useEffect(() => {
        loadUnreadCount();
    }, []);

    const loadUnreadCount = async () => {
        try {
            const res = await client.get('/api/notifications/unread_count/');
            setUnreadCount(res.data.unread_count);
        } catch (e) {}
    };

    const filteredRequests = requests.filter(r => {
        if (requestFilter === 'active') return ['pending', 'accepted'].includes(r.status);
        if (requestFilter === 'history') return ['fulfilled', 'declined', 'cancelled'].includes(r.status);
        return true;
    });

    const loadRequests = async () => {
        setLoading(true);
        try {
            const response = await client.get('/api/requests/');
            setRequests(response.data.results || response.data);
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось загрузить заявки');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const response = await client.get('/api/catalog/products/');
            setProducts(response.data.results || response.data);
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = (request) => {
        setSelectedRequest(request);
        setResponseModal(true);
    };

    const handlePickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Нет доступа', 'Разрешите доступ к фото в настройках');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled) {
            setProductImage(result.assets[0]);
        }
    };

    const handleSubmitResponse = async () => {
        if (!message) {
            Alert.alert('Ошибка', 'Введите сообщение для клиента');
            return;
        }
        try {
            await client.post(`/api/requests/${selectedRequest.id}/respond/`, {
                message,
                offered_price: offeredPrice || null,
            });
            setResponseModal(false);
            setMessage('');
            setOfferedPrice('');
            Alert.alert('Отправлено', 'Ответ отправлен клиенту');
            loadRequests();
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось отправить ответ');
        }
    };

    const handleUpdateStatus = async (requestId, newStatus) => {
        const label = newStatus === 'fulfilled' ? 'выполнена' : 'отклонена';
        try {
            await client.patch(`/api/requests/${requestId}/update_status/`, { status: newStatus });
            Alert.alert('Обновлено', `Заявка отмечена как ${label}`);
            loadRequests();
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось обновить статус');
        }
    };

    const openProductModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setProductForm({
                name: product.name,
                description: product.description || '',
                price: product.price.toString(),
                unit: product.unit,
                stock_quantity: product.stock_quantity.toString(),
                is_available: product.is_available,
                category: product.category || '',
            });
        } else {
            setEditingProduct(null);
            setProductForm({
                name: '', description: '', price: '',
                unit: '', stock_quantity: '', is_available: true, category: '',
            });
        }
        setProductImage(null);
        setProductModal(true);
    };

    const handleDeleteProduct = (product) => {
        Alert.alert(
            'Удалить товар',
            `Удалить "${product.name}"? Это действие нельзя отменить.`,
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await client.delete(`/api/catalog/products/${product.id}/`);
                            loadProducts();
                        } catch (e) {
                            Alert.alert('Ошибка', 'Не удалось удалить товар');
                        }
                    }
                }
            ]
        );
    };

    const handleSaveProduct = async () => {
        if (!productForm.name.trim()) {
            Alert.alert('Ошибка', 'Введите название товара');
            return;
        }
        if (!productForm.price || isNaN(parseFloat(productForm.price))) {
            Alert.alert('Ошибка', 'Введите корректную цену');
            return;
        }
        if (!productForm.unit.trim()) {
            Alert.alert('Ошибка', 'Введите единицу измерения');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('name', productForm.name.trim());
            formData.append('description', productForm.description);
            formData.append('price', parseFloat(productForm.price));
            formData.append('unit', productForm.unit.trim());
            formData.append('stock_quantity', parseInt(productForm.stock_quantity) || 0);
            formData.append('is_available', productForm.is_available);
            formData.append('category', productForm.category || 'other');

            if (productImage) {
                formData.append('image', {
                    uri: productImage.uri,
                    type: 'image/jpeg',
                    name: 'product.jpg',
                });
            }

            if (editingProduct) {
                await client.patch(`/api/catalog/products/${editingProduct.id}/`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            } else {
                await client.post('/api/catalog/products/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            }

            setProductModal(false);
            setProductImage(null);
            setEditingProduct(null);
            loadProducts();
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось сохранить товар');
        }
    };

    const handleToggleAvailability = async (product) => {
        try {
            await client.patch(`/api/catalog/products/${product.id}/`, {
                is_available: !product.is_available,
            });
            loadProducts();
        } catch (e) {}
    };

    const getStatusConfig = (status) => {
        const configs = {
            pending: { label: 'Ожидает', color: colors.warning, bg: '#FEF3C7', icon: 'clock' },
            accepted: { label: 'Принято', color: colors.success, bg: '#DCFCE7', icon: 'check' },
            declined: { label: 'Отклонено', color: colors.danger, bg: '#FEE2E2', icon: 'x' },
            fulfilled: { label: 'Выполнено', color: colors.purple, bg: '#EDE9FE', icon: 'truck' },
            cancelled: { label: 'Отменено', color: colors.danger, bg: '#FEE2E2', icon: 'x' },
        };
        return configs[status] || { label: status, color: colors.textSecondary, bg: colors.borderLight };
    };

    const renderRequest = ({ item }) => {
        const statusConfig = getStatusConfig(item.status);
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => setSelectedRequestDetail(item)}
                activeOpacity={0.7}
            >
                <View style={styles.cardTop}>
                    <View style={styles.requestNumberRow}>
                        <Text style={styles.requestNumber}>Заявка #{item.id}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.requestMeta}>
                        <View style={styles.metaItem}>
                            <Icon name="user" size={13} color={colors.textTertiary} />
                            <Text style={styles.metaText}>{item.client_name}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Icon name="package" size={13} color={colors.textTertiary} />
                            <Text style={styles.metaText}>{item.items?.length || 0} товар(ов)</Text>
                        </View>
                    </View>
                    {item.total_price && (
                        <Text style={styles.requestTotal}>
                            {parseInt(item.total_price).toLocaleString('ru-RU')} ₸
                        </Text>
                    )}
                    {item.delivery_address ? (
                        <View style={styles.metaItem}>
                            <Icon name="map_pin" size={13} color={colors.textTertiary} />
                            <Text style={styles.metaText} numberOfLines={1}>{item.delivery_address}</Text>
                        </View>
                    ) : null}
                    {item.desired_delivery_date ? (
                        <View style={styles.metaItem}>
                            <Icon name="calendar" size={13} color={colors.textTertiary} />
                            <Text style={styles.metaText}>
                                {new Date(item.desired_delivery_date).toLocaleDateString('ru-RU')}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {item.response && (
                    <View style={styles.responsePreview}>
                        <Icon name="check" size={12} color={colors.success} />
                        <Text style={styles.responsePreviewText} numberOfLines={1}>
                            {item.response.message}
                        </Text>
                    </View>
                )}

                {item.status === 'pending' && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.success }]}
                            onPress={(e) => { e.stopPropagation(); handleRespond(item); }}
                        >
                            <Icon name="mail" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Ответить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: colors.danger }]}
                            onPress={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, 'declined'); }}
                        >
                            <Icon name="x" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Отклонить</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {item.status === 'accepted' && (
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { flex: 1, backgroundColor: colors.purple }]}
                            onPress={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, 'fulfilled'); }}
                        >
                            <Icon name="truck" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}>Отметить как выполнено</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.tapHintRow}>
                    <Text style={styles.tapHint}>Подробнее</Text>
                    <Icon name="chevronRight" size={14} color={colors.primary} />
                </View>
            </TouchableOpacity>
        );
    };

    const renderProduct = ({ item }) => {
        const isLowStock = item.stock_quantity > 0 && item.stock_quantity <= 10;
        const isOutOfStock = item.stock_quantity === 0;

        return (
            <View style={styles.productCard}>
                <View style={styles.productImageContainer}>
                    {item.image ? (
                        <Image
                            source={{ uri: item.image }}
                            style={styles.productImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={styles.productImagePlaceholder}>
                            <Icon name="image" size={28} color={colors.textTertiary} />
                        </View>
                    )}
                    <TouchableOpacity
                        disabled={user?.role !== 'supplier'}
                        style={[
                            styles.availabilityToggle,
                            { backgroundColor: item.is_available ? colors.success : colors.danger }
                        ]}
                        onPress={() => handleToggleAvailability(item)}
                    >
                        <Text style={styles.availabilityText}>
                            {item.is_available ? 'В наличии' : 'Нет в наличии'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.productBody}>
                    <Text style={styles.productName}>{item.name}</Text>
                    {item.description ? (
                        <Text style={styles.productDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    ) : null}
                    <Text style={styles.productPrice}>
                        {parseInt(item.price).toLocaleString('ru-RU')} ₸
                        <Text style={styles.productUnit}> / {item.unit}</Text>
                    </Text>

                    <View style={styles.stockRow}>
                        <Icon
                            name={isOutOfStock ? 'warning' : 'package'}
                            size={14}
                            color={isOutOfStock ? colors.danger : isLowStock ? colors.warning : colors.success}
                        />
                        <Text style={[
                            styles.stockText,
                            isOutOfStock && { color: colors.danger },
                            isLowStock && { color: colors.warning },
                            !isOutOfStock && !isLowStock && { color: colors.success },
                        ]}>
                            {isOutOfStock ? 'Нет на складе' : `${item.stock_quantity} ${item.unit}`}
                        </Text>
                    </View>

                    {user?.role === 'supplier' && <View style={styles.productActions}>
                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => openProductModal(item)}
                        >
                            <Icon name="edit" size={15} color={colors.primary} />
                            <Text style={styles.editBtnText}>Изменить</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => handleDeleteProduct(item)}
                        >
                            <Icon name="trash" size={15} color={colors.danger} />
                        </TouchableOpacity>
                    </View>}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            {/* <View style={styles.header}>
                <View style={styles.headerIdentity}>
                    <Text style={styles.headerGreeting}>Добро пожаловать</Text>
                    <Text style={styles.headerName} numberOfLines={1}>
                        {user?.company_name || user?.username}
                    </Text>
                </View>
                <View style={styles.headerActions}> */}
                    {/* <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => setShowCalendar(true)}
                    >
                        <Icon name="calendar" size={20} color="#fff" />
                    </TouchableOpacity> */}
                    {/* <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => setShowAnalytics(true)}
                    >
                        <Icon name="bar_chart" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => {
                            setShowNotifications(true);
                            loadUnreadCount();
                        }}
                    >
                        <Icon name="bell" size={20} color="#fff" />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => setShowProfile(true)}
                    >
                        <Icon name="user" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View> */}
            <View style={styles.header}>
                <View style={styles.headerIdentity}>
                    <TouchableOpacity
                        style={styles.citySelector}
                        onPress={() => setShowCitySelect(true)}
                        activeOpacity={0.7}
                    >
                        <Icon name="map_pin" size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.cityLabel} numberOfLines={1}>
                            {cityLabel || 'Выберите город'}
                        </Text>
                        <Icon name="chevronRight" size={11} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                    <Text style={styles.headerName} numberOfLines={1}>
                        {user?.company_name || user?.username}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    {user?.role === 'supplier' && (
                        <TouchableOpacity
                            style={styles.headerBusinessBtn}
                            onPress={() => setView('business')}
                            activeOpacity={0.8}
                            accessibilityLabel="Клиенты и сотрудники"
                        >
                            <Icon name="team" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                    {user?.role === 'supplier' && <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowAnalytics(true)}>
                        <Icon name="bar_chart" size={20} color="#fff" />
                    </TouchableOpacity>}
                    <TouchableOpacity
                        style={styles.headerIconBtn}
                        onPress={() => { setShowNotifications(true); loadUnreadCount(); }}
                    >
                        <Icon name="bell" size={20} color="#fff" />
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowProfile(true)}>
                        <Icon name="user" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, view === 'home' && styles.tabActive]}
                    onPress={() => setView('home')}
                >
                    <Icon name="store" size={16} color={view === 'home' ? colors.primary : colors.textTertiary} />
                    <Text style={[styles.tabText, view === 'home' && styles.tabTextActive]}>Главная</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, view === 'requests' && styles.tabActive]}
                    onPress={() => setView('requests')}
                >
                    <Icon name="package" size={16} color={view === 'requests' ? colors.primary : colors.textTertiary} />
                    <Text style={[styles.tabText, view === 'requests' && styles.tabTextActive]}>Заявки</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, view === 'products' && styles.tabActive]}
                    onPress={() => setView('products')}
                >
                    <Icon name="layers" size={16} color={view === 'products' ? colors.primary : colors.textTertiary} />
                    <Text style={[styles.tabText, view === 'products' && styles.tabTextActive]}>Товары</Text>
                </TouchableOpacity>
            </View>

            {/* For sales reps, the Requests tab hosts two sub-tabs: the request
                list, and their own clients (replacing the separate directory
                access suppliers get via the header team button). */}
            {view === 'requests' && user?.role === 'sales_rep' && (
                <View style={styles.subTabBar}>
                    <TouchableOpacity
                        style={[styles.subTab, requestsSubTab === 'list' && styles.subTabActive]}
                        onPress={() => setRequestsSubTab('list')}
                    >
                        <Text style={[styles.subTabText, requestsSubTab === 'list' && styles.subTabTextActive]}>
                            Заявки
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.subTab, requestsSubTab === 'clients' && styles.subTabActive]}
                        onPress={() => setRequestsSubTab('clients')}
                    >
                        <Text style={[styles.subTabText, requestsSubTab === 'clients' && styles.subTabTextActive]}>
                            Клиенты
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Request filter */}
            {view === 'requests' && (user?.role !== 'sales_rep' || requestsSubTab === 'list') && (
                <View style={styles.filterBar}>
                    {[
                        { key: 'active', label: 'Активные' },
                        { key: 'all', label: 'Все' },
                        { key: 'history', label: 'История' },
                    ].map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filterBtn, requestFilter === f.key && styles.filterBtnActive]}
                            onPress={() => setRequestFilter(f.key)}
                        >
                            <Text style={[styles.filterBtnText, requestFilter === f.key && styles.filterBtnTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <CrossFade activeKey={loading ? 'loading' : `${view}-${requestsSubTab}`} style={{ flex: 1 }}>
            {view === 'business' ? (
                <BusinessDirectoryScreen isSupplier={user?.role === 'supplier'} />
            ) : view === 'requests' && user?.role === 'sales_rep' && requestsSubTab === 'clients' ? (
                <BusinessDirectoryScreen isSupplier={false} />
            ) : view === 'home' ? (
                <SupplierHomeTab
                    onRequestPress={(request) => setCalendarSelectedRequest(request)}
                />
            ) : loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={view === 'requests' ? filteredRequests : products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={view === 'requests' ? renderRequest : renderProduct}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Icon
                                    name={view === 'requests' ? 'package' : 'layers'}
                                    size={32}
                                    color={colors.textTertiary}
                                />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {view === 'requests'
                                    ? requestFilter === 'history' ? 'История пуста'
                                    : requestFilter === 'active' ? 'Нет активных заявок'
                                    : 'Заявок пока нет'
                                    : 'Товаров пока нет'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {view === 'requests'
                                    ? 'Заявки от клиентов появятся здесь'
                                    : 'Добавьте первый товар кнопкой ниже'}
                            </Text>
                        </View>
                    }
                />
            )}
            </CrossFade>

            {/* FAB */}
            {view === 'products' && user?.role === 'supplier' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => openProductModal()}
                    activeOpacity={0.8}
                >
                    <Icon name="plus" size={22} color="#fff" />
                    <Text style={styles.fabText}>Добавить товар</Text>
                </TouchableOpacity>
            )}

            {/* Response Modal */}
            <Modal visible={responseModal} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHandle} />
                                <Text style={styles.modalTitle}>Ответить на заявку</Text>
                                <View style={styles.modalInfoBox}>
                                    <View style={styles.modalInfoRow}>
                                        <Icon name="package" size={14} color={colors.textTertiary} />
                                        <Text style={styles.modalInfoText}>
                                            Заявка #{selectedRequest?.id} · {selectedRequest?.items?.length || 0} товар(ов)
                                        </Text>
                                    </View>
                                    {selectedRequest?.total_price && (
                                        <View style={styles.modalInfoRow}>
                                            <Icon name="trending_up" size={14} color={colors.textTertiary} />
                                            <Text style={styles.modalInfoText}>
                                                Сумма: {parseInt(selectedRequest.total_price).toLocaleString('ru-RU')} ₸
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <InputField
                                    label="Сообщение клиенту *"
                                    value={message}
                                    onChangeText={setMessage}
                                    placeholder="Напишите ответ на заявку..."
                                    multiline
                                    numberOfLines={3}
                                    autoCapitalize="sentences"
                                    autoCorrect
                                />
                                <InputField
                                    label="Предложить другую цену (необязательно)"
                                    value={offeredPrice}
                                    onChangeText={setOfferedPrice}
                                    placeholder="0 ₸"
                                    keyboardType="numeric"
                                />
                                <Button label="Отправить ответ" onPress={handleSubmitResponse} />
                                <Button
                                    label="Отмена"
                                    onPress={() => {
                                        setProductModal(false);
                                        setCategoryModal(false);
                                        setProductImage(null);
                                        setEditingProduct(null);
                                    }}
                                    variant="ghost"
                                    style={{ marginTop: spacing.sm }}
                                />
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Add/Edit Product Modal */}
            <Modal visible={productModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={{ flex: 1, justifyContent: 'flex-end' }}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <ScrollView
                            bounces={false}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <View style={styles.productModalContent}>
                                <View style={styles.modalHandle} />

                                <View style={styles.productModalHeader}>
                                    <Text style={styles.modalTitle}>
                                        {editingProduct ? 'Редактировать товар' : 'Новый товар'}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setProductModal(false);
                                            setCategoryModal(false); // also close category picker
                                            setProductImage(null);
                                            setEditingProduct(null);
                                        }}
                                    >
                                        <Icon name="x" size={22} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Image picker */}
                                <TouchableOpacity
                                    style={styles.imagePicker}
                                    onPress={handlePickImage}
                                    activeOpacity={0.7}
                                >
                                    {productImage ? (
                                        <Image
                                            source={{ uri: productImage.uri }}
                                            style={styles.imagePreview}
                                            resizeMode="cover"
                                        />
                                    ) : editingProduct?.image ? (
                                        <Image
                                            source={{ uri: editingProduct.image }}
                                            style={styles.imagePreview}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={styles.imagePickerEmpty}>
                                            <Icon name="image" size={28} color={colors.textTertiary} />
                                            <Text style={styles.imagePickerText}>Добавить фото</Text>
                                            <Text style={styles.imagePickerSub}>Нажмите чтобы выбрать</Text>
                                        </View>
                                    )}
                                    {(productImage || editingProduct?.image) && (
                                        <View style={styles.imageChangeOverlay}>
                                            <Icon name="edit" size={16} color="#fff" />
                                            <Text style={styles.imageChangeText}>Изменить</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <SectionTitle label="Основная информация" />

                                <InputField
                                    label="Название товара *"
                                    value={productForm.name}
                                    onChangeText={(v) => setProductForm(p => ({ ...p, name: v }))}
                                    placeholder="Например: Сахар-песок ГОСТ"
                                    autoCapitalize="sentences"
                                    autoCorrect
                                />
                                <InputField
                                    label="Описание"
                                    value={productForm.description}
                                    onChangeText={(v) => setProductForm(p => ({ ...p, description: v }))}
                                    placeholder="Состав, характеристики, особенности..."
                                    multiline
                                    numberOfLines={3}
                                    autoCapitalize="sentences"
                                    autoCorrect
                                />

                                <SectionTitle label="Категория" />

                                <TouchableOpacity
                                    style={styles.categoryPicker}
                                    onPress={() => {
                                        console.log('Category pressed');
                                        setCategoryModal(true);
                                    }}
                                >
                                    <View style={styles.categoryPickerLeft}>
                                        <Icon name="filter" size={16} color={colors.primary} />
                                        <Text style={[
                                            styles.categoryPickerText,
                                            !productForm.category && { color: colors.placeholder }
                                        ]}>
                                            {productForm.category
                                                ? categories.find(c => c.value === productForm.category)?.label || 'Выберите категорию'
                                                : 'Выберите категорию'}
                                        </Text>
                                    </View>
                                    <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                                </TouchableOpacity>

                                <SectionTitle label="Цена и наличие" />

                                <View style={styles.rowInputs}>
                                    <View style={{ flex: 1.5 }}>
                                        <InputField
                                            label="Цена (₸) *"
                                            value={productForm.price}
                                            onChangeText={(v) => setProductForm(p => ({ ...p, price: v }))}
                                            placeholder="0"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                                        <InputField
                                            label="Единица *"
                                            value={productForm.unit}
                                            onChangeText={(v) => setProductForm(p => ({ ...p, unit: v }))}
                                            placeholder="кг / шт"
                                            autoCapitalize="none"
                                        />
                                    </View>
                                </View>

                                <InputField
                                    label="Количество на складе"
                                    value={productForm.stock_quantity}
                                    onChangeText={(v) => setProductForm(p => ({ ...p, stock_quantity: v }))}
                                    placeholder="0"
                                    keyboardType="numeric"
                                />

                                <View style={styles.availabilityRow}>
                                    <View>
                                        <Text style={styles.availabilityLabel}>Доступен для заказа</Text>
                                        <Text style={styles.availabilityDesc}>
                                            {productForm.is_available ? 'Клиенты могут заказать' : 'Скрыт от клиентов'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[
                                            styles.toggle,
                                            productForm.is_available && styles.toggleActive
                                        ]}
                                        onPress={() => setProductForm(p => ({ ...p, is_available: !p.is_available }))}
                                    >
                                        <View style={[
                                            styles.toggleThumb,
                                            productForm.is_available && styles.toggleThumbActive
                                        ]} />
                                    </TouchableOpacity>
                                </View>

                                <Button
                                    label={editingProduct ? 'Сохранить изменения' : 'Добавить товар'}
                                    onPress={handleSaveProduct}
                                    style={{ marginTop: spacing.md }}
                                />

                                <View style={{ height: spacing.xxxl }} />
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>

                    {categoryModal && (
                        <View style={StyleSheet.absoluteFill}>
                            <TouchableOpacity
                                style={StyleSheet.absoluteFill}
                                activeOpacity={1}
                                onPress={() => setCategoryModal(false)}
                            />
                            <View style={[styles.categoryModalContent, { position: 'absolute', left: 0, right: 0, bottom: 0 }]}>
                                <View style={styles.modalHandle} />
                                <View style={styles.categoryModalHeader}>
                                    <Text style={styles.modalTitle}>Категория товара</Text>
                                    <TouchableOpacity onPress={() => setCategoryModal(false)}>
                                        <Icon name="x" size={22} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {categories.length === 0 && (
                                        <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.lg }}>
                                            Категории не найдены
                                        </Text>
                                    )}
                                    {categories.map(cat => (
                                        <TouchableOpacity
                                            key={cat.value}
                                            style={[
                                                styles.categoryOption,
                                                productForm.category === cat.value && styles.categoryOptionActive
                                            ]}
                                            onPress={() => {
                                                setProductForm(p => ({ ...p, category: cat.value }));
                                                setCategoryModal(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[
                                                styles.categoryOptionText,
                                                productForm.category === cat.value && styles.categoryOptionTextActive
                                            ]}>
                                                {cat.label}
                                            </Text>
                                            {productForm.category === cat.value && (
                                                <Icon name="check" size={16} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                    <View style={{ height: 32 }} />
                                </ScrollView>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>


            <ScreenOverlay visible={!!calendarSelectedRequest}>
                <RequestDetailScreen
                    request={calendarSelectedRequest}
                    onClose={() => setCalendarSelectedRequest(null)}
                    onUpdate={() => {
                        setCalendarSelectedRequest(null);
                        loadRequests();
                    }}
                />
            </ScreenOverlay>

            <ScreenOverlay visible={showCalendar}>
                <CalendarScreen
                    onClose={() => setShowCalendar(false)}
                    userRole="supplier"
                />
            </ScreenOverlay>

            <ScreenOverlay visible={!!selectedRequestDetail}>
                <RequestDetailScreen
                    request={selectedRequestDetail}
                    onClose={() => setSelectedRequestDetail(null)}
                    onUpdate={() => { loadRequests(); setSelectedRequestDetail(null); }}
                />
            </ScreenOverlay>

            <ScreenOverlay visible={showNotifications}>
                <NotificationsScreen onClose={() => { setShowNotifications(false); loadUnreadCount(); }} />
            </ScreenOverlay>

            <ScreenOverlay visible={showProfile}>
                <ProfileScreen onClose={() => setShowProfile(false)} />
            </ScreenOverlay>

            <ScreenOverlay visible={showAnalytics}>
                <AnalyticsScreen onClose={() => setShowAnalytics(false)} />
            </ScreenOverlay>

            <ScreenOverlay visible={showCitySelect}>
                <CitySelectScreen
                    onClose={() => setShowCitySelect(false)}
                />
            </ScreenOverlay>
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
    headerGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
    headerIdentity: { flex: 1, minWidth: 0, marginRight: spacing.sm },
    headerName: { fontSize: 18, fontWeight: '700', color: '#fff', maxWidth: 180 },
    headerActions: { flexDirection: 'row', gap: spacing.sm },
    headerBusinessBtn: {
        width: 38, height: 38, borderRadius: 19,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    headerIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: colors.danger,
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
    tabs: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
    },
    tabText: { fontSize: 14, color: colors.textTertiary, fontWeight: '500' },
    tabTextActive: { color: colors.primary, fontWeight: '700' },
    subTabBar: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        gap: spacing.sm,
    },
    subTab: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.background,
    },
    subTabActive: { backgroundColor: colors.primaryLight },
    subTabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    subTabTextActive: { color: colors.primary },
    filterBar: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        padding: spacing.sm,
        gap: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    filterBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    filterBtnActive: { backgroundColor: colors.primaryLight },
    filterBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    filterBtnTextActive: { color: colors.primary, fontWeight: '700' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: spacing.lg, paddingBottom: 100 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
    emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },

    // Request card
    card: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadow.sm,
    },
    cardTop: { marginBottom: spacing.sm },
    requestNumberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    requestNumber: { fontSize: 15, fontWeight: '700', color: colors.text },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    statusBadgeText: { fontSize: 12, fontWeight: '600' },
    requestMeta: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xs },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
    metaText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    requestTotal: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.text,
        marginVertical: spacing.sm,
    },
    responsePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: '#DCFCE7',
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    responsePreviewText: { fontSize: 12, color: colors.success, flex: 1 },
    cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
    },
    actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    tapHintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: spacing.sm,
        gap: 2,
    },
    tapHint: { fontSize: 12, color: colors.primary },

    // Product card
    productCard: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        marginBottom: spacing.md,
        overflow: 'hidden',
        ...shadow.sm,
    },
    productImageContainer: { position: 'relative' },
    productImage: { width: '100%', height: 180 },
    productImagePlaceholder: {
        width: '100%',
        height: 160,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    availabilityToggle: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    availabilityText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    productBody: { padding: spacing.lg },
    productName: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
    productDescription: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 18 },
    productPrice: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: spacing.sm },
    productUnit: { fontSize: 14, fontWeight: '400', color: colors.textSecondary },
    stockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    stockText: { fontSize: 13, fontWeight: '600' },
    productActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    editBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        backgroundColor: colors.primaryLight,
        borderRadius: radius.lg,
    },
    editBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
    deleteBtn: {
        width: 44,
        height: 44,
        borderRadius: radius.lg,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: spacing.xxl,
        right: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
        gap: spacing.sm,
        ...shadow.lg,
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.xxl,
        paddingTop: spacing.lg,
    },
    productModalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.xxl,
        paddingTop: spacing.lg,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: spacing.xl,
    },
    productModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    modalInfoBox: {
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        gap: spacing.sm,
    },
    modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    modalInfoText: { fontSize: 14, color: colors.textSecondary },

    // Image picker
    imagePicker: {
        width: '100%',
        height: 180,
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginBottom: spacing.xl,
        backgroundColor: colors.background,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },
    imagePreview: { width: '100%', height: '100%' },
    imagePickerEmpty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
    },
    imagePickerText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
    imagePickerSub: { fontSize: 12, color: colors.textTertiary },
    imageChangeOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.sm,
        gap: spacing.xs,
    },
    imageChangeText: { color: '#fff', fontSize: 13, fontWeight: '600' },

    // Row inputs
    rowInputs: { flexDirection: 'row' },

    // Availability toggle
    availabilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    availabilityLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
    availabilityDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    toggle: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.border,
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    toggleActive: { backgroundColor: colors.primary },
    toggleThumb: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fff',
        ...shadow.sm,
    },
    toggleThumbActive: { transform: [{ translateX: 22 }] },
    categoryPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        marginBottom: spacing.md,
        minHeight: 50,
    },
    categoryPickerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    categoryPickerText: {
        fontSize: 15,
        color: colors.text,
        flex: 1,
    },
    categoryModalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.xxl,
        paddingTop: spacing.lg,
        maxHeight: '80%',
    },
    categoryModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        marginBottom: spacing.xs,
        backgroundColor: colors.background,
    },
    categoryOptionActive: {
        backgroundColor: colors.primaryLight,
        borderWidth: 1,
        borderColor: colors.primary + '40',
    },
    categoryOptionText: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '500',
    },
    categoryOptionTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    citySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    cityLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
        maxWidth: 120,
    },
});