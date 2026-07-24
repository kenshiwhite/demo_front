import React, { useState, useEffect, useMemo } from 'react';
import { useCity } from '../context/CityContext';
import CitySelectScreen from './CitySelectScreen';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, TextInput, ActivityIndicator,
    Alert, Modal, Image, KeyboardAvoidingView,
    Platform, TouchableWithoutFeedback, Keyboard,
    ScrollView, Dimensions
} from 'react-native';
import { getSuppliers, getProducts, getAllProducts, getCategories } from '../api/catalog';
import { getMyRequests } from '../api/requests';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationsScreen from './NotificationsScreen';
import RequestDetailScreen from './RequestDetailScreen';
import CartScreen from './CartScreen';
import ProfileScreen from './ProfileScreen';
import ProductDetailScreen from './ProductDetailScreen';
import { InputField, Button } from '../components/UI';
import { spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';
import client from '../api/client';
import { ScreenOverlay, CrossFade } from '../components/AnimatedPrimitives';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 48) / 2;

export default function ClientHomeScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const { signOut, user } = useAuth();
    const { addToCart, getTotalItems } = useCart();
    const [view, setView] = useState('all');
    const [displayMode, setDisplayMode] = useState('grid');
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [quantityModal, setQuantityModal] = useState(false);
    const [selectedProductForCart, setSelectedProductForCart] = useState(null);
    const [cartQuantity, setCartQuantity] = useState('1');
    const { selectedCity, cityLabel } = useCity();
    const [showCitySelect, setShowCitySelect] = useState(false);

    // Category / price / sort filters
    const [categories, setCategories] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'price_asc' | 'price_desc'
    // Draft state edited inside the modal; only committed to the active
    // filters above when the user taps "Apply".
    const [draftCategories, setDraftCategories] = useState([]);
    const [draftMinPrice, setDraftMinPrice] = useState('');
    const [draftMaxPrice, setDraftMaxPrice] = useState('');
    const [draftSortBy, setDraftSortBy] = useState('newest');

    const activeFilterCount =
        selectedCategories.length +
        (minPrice ? 1 : 0) +
        (maxPrice ? 1 : 0) +
        (sortBy !== 'newest' ? 1 : 0);

    const sortToOrdering = (sort) => {
        if (sort === 'price_asc') return 'price';
        if (sort === 'price_desc') return '-price';
        return '-created_at';
    };

    const currentFilters = () => ({
        categories: selectedCategories,
        minPrice,
        maxPrice,
        ordering: sortToOrdering(sortBy),
    });

    useEffect(() => {
        loadAllProducts();
        loadSuppliers();
    }, [selectedCity]);

    useEffect(() => {
        getCategories().then(setCategories).catch(() => {});
    }, []);

    useEffect(() => {
        if (view === 'requests') loadMyRequests();
    }, [view]);

    const loadSuppliers = async () => {
        try {
            const data = await getSuppliers(selectedCity);
            setSuppliers(data.results || data);
        } catch (e) {
            console.log('Не удалось загрузить поставщиков');
        }
    };

    const loadAllProducts = async (searchText = '', filters = currentFilters()) => {
        setLoading(true);
        try {
            const data = await getAllProducts(searchText, selectedCity, filters);
            setProducts(data.results || data);
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    };


    const loadSupplierProducts = async (supplierId, searchText = '', filters = currentFilters()) => {
        setLoading(true);
        try {
            const data = await getProducts(supplierId, searchText, filters);
            setProducts(data.results || data);
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    };

    const loadMyRequests = async () => {
        setLoading(true);
        try {
            const data = await getMyRequests();
            setMyRequests(data.results || data);
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось загрузить заявки');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearch(text);
        if (view === 'products' && selectedSupplier) {
            loadSupplierProducts(selectedSupplier.id, text);
        } else {
            loadAllProducts(text);
        }
    };

    const handleSupplierPress = (supplier) => {
        setSelectedSupplier(supplier);
        setView('products');
        setSearch('');
        loadSupplierProducts(supplier.id);
    };

    const openFilters = () => {
        setDraftCategories(selectedCategories);
        setDraftMinPrice(minPrice);
        setDraftMaxPrice(maxPrice);
        setDraftSortBy(sortBy);
        setShowFilters(true);
    };

    const toggleDraftCategory = (value) => {
        setDraftCategories((prev) =>
            prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
        );
    };

    const applyFilters = () => {
        setSelectedCategories(draftCategories);
        setMinPrice(draftMinPrice);
        setMaxPrice(draftMaxPrice);
        setSortBy(draftSortBy);
        setShowFilters(false);
        const filters = {
            categories: draftCategories,
            minPrice: draftMinPrice,
            maxPrice: draftMaxPrice,
            ordering: sortToOrdering(draftSortBy),
        };
        if (view === 'products' && selectedSupplier) {
            loadSupplierProducts(selectedSupplier.id, search, filters);
        } else {
            loadAllProducts(search, filters);
        }
    };

    const resetFilters = () => {
        setDraftCategories([]);
        setDraftMinPrice('');
        setDraftMaxPrice('');
        setDraftSortBy('newest');
        setSelectedCategories([]);
        setMinPrice('');
        setMaxPrice('');
        setSortBy('newest');
        setShowFilters(false);
        const filters = { categories: [], minPrice: '', maxPrice: '', ordering: '-created_at' };
        if (view === 'products' && selectedSupplier) {
            loadSupplierProducts(selectedSupplier.id, search, filters);
        } else {
            loadAllProducts(search, filters);
        }
    };

    const handleAddToCart = (item) => {
        setSelectedProductForCart(item);
        setCartQuantity('1');
        setQuantityModal(true);
    };

    const handleConfirmAddToCart = () => {
        const qty = parseInt(cartQuantity);
        if (!qty || qty <= 0) {
            Alert.alert('Ошибка', 'Введите корректное количество');
            return;
        }
        if (qty > selectedProductForCart.stock_quantity) {
            Alert.alert('Ошибка', `Максимальное количество: ${selectedProductForCart.stock_quantity}`);
            return;
        }
        addToCart(selectedProductForCart, qty);
        setQuantityModal(false);
        Alert.alert('Добавлено в корзину', `${selectedProductForCart.name} × ${qty}`);
    };

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

    const renderSupplierHeader = () => {
        if (!selectedSupplier) return null;
        return (
            <View style={styles.supplierProfileCard}>
                <View style={styles.supplierProfileTop}>
                    {selectedSupplier.profile_picture ? (
                        <Image
                            source={{ uri: selectedSupplier.profile_picture }}
                            style={styles.supplierProfileAvatar}
                        />
                    ) : (
                        <View style={styles.supplierProfileAvatar}>
                            <Text style={styles.supplierProfileAvatarText}>
                                {selectedSupplier.company_name?.[0] ||
                                 selectedSupplier.username?.[0]?.toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.supplierProfileInfo}>
                        <Text style={styles.supplierProfileName}>
                            {selectedSupplier.company_name || selectedSupplier.username}
                        </Text>
                        <View style={styles.supplierProfileBadge}>
                            <Icon name="package" size={11} color={colors.primary} />
                            <Text style={styles.supplierProfileBadgeText}>
                                {selectedSupplier.product_count} товаров
                            </Text>
                        </View>
                    </View>
                </View>

                {selectedSupplier.description ? (
                    <Text style={styles.supplierProfileDesc}>
                        {selectedSupplier.description}
                    </Text>
                ) : null}

                <View style={styles.supplierProfileContacts}>
                    {selectedSupplier.phone ? (
                        <View style={styles.supplierContactItem}>
                            <View style={styles.supplierContactIcon}>
                                <Icon name="phone" size={13} color={colors.primary} />
                            </View>
                            <Text style={styles.supplierContactText}>{selectedSupplier.phone}</Text>
                        </View>
                    ) : null}
                    <View style={styles.supplierContactItem}>
                        <View style={styles.supplierContactIcon}>
                            <Icon name="layers" size={13} color={colors.primary} />
                        </View>
                        <Text style={styles.supplierContactText}>
                            {selectedSupplier.product_count} товаров в каталоге
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderSupplier = ({ item }) => (
        <TouchableOpacity
            style={styles.supplierCard}
            onPress={() => handleSupplierPress(item)}
            activeOpacity={0.7}
        >
            {item.profile_picture ? (
                <Image source={{ uri: item.profile_picture }} style={styles.supplierAvatar} />
            ) : (
                <View style={styles.supplierAvatar}>
                    <Text style={styles.supplierAvatarText}>
                        {item.company_name?.[0] || item.username[0].toUpperCase()}
                    </Text>
                </View>
            )}
            <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>
                    {item.company_name || item.username}
                </Text>
                {item.description ? (
                    <Text style={styles.supplierDesc} numberOfLines={1}>
                        {item.description}
                    </Text>
                ) : null}
                <View style={styles.supplierMeta}>
                    <Icon name="package" size={12} color={colors.textTertiary} />
                    <Text style={styles.supplierMetaText}>
                        {item.product_count} товаров
                    </Text>
                </View>
            </View>
            <View style={styles.supplierChevron}>
                <Icon name="chevronRight" size={18} color={colors.textTertiary} />
            </View>
        </TouchableOpacity>
    );

    const renderGridProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setSelectedProduct(item)}
            activeOpacity={0.7}
        >
            {item.image ? (
                <Image
                    source={{ uri: item.image }}
                    style={styles.gridImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.gridImagePlaceholder}>
                    <Icon name="image" size={24} color={colors.textTertiary} />
                </View>
            )}
            <View style={styles.gridBody}>
                <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.gridSupplierRow}>
                    <Icon name="store" size={11} color={colors.primary} />
                    <Text style={styles.gridSupplier} numberOfLines={1}>{item.supplier_name}</Text>
                </View>
                <Text style={styles.gridPrice}>
                    {parseInt(item.price).toLocaleString('ru-RU')} ₸
                </Text>
                <Text style={styles.gridUnit}>/ {item.unit}</Text>
            </View>
            <TouchableOpacity
                style={styles.gridCartBtn}
                onPress={() => handleAddToCart(item)}
                activeOpacity={0.8}
            >
                <Icon name="plus" size={14} color="#fff" />
                <Text style={styles.gridCartBtnText}>В корзину</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderListProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.listCard}
            onPress={() => setSelectedProduct(item)}
            activeOpacity={0.7}
        >
            {item.image ? (
                <Image
                    source={{ uri: item.image }}
                    style={styles.listImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.listImagePlaceholder}>
                    <Icon name="image" size={28} color={colors.textTertiary} />
                </View>
            )}
            <View style={styles.listBody}>
                <Text style={styles.listName}>{item.name}</Text>
                <View style={styles.listSupplierRow}>
                    <Icon name="store" size={12} color={colors.primary} />
                    <Text style={styles.listSupplier}>{item.supplier_name}</Text>
                </View>
                {item.description ? (
                    <Text style={styles.listDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}
                <View style={styles.listBottom}>
                    <View>
                        <Text style={styles.listPrice}>
                            {parseInt(item.price).toLocaleString('ru-RU')} ₸
                        </Text>
                        <Text style={styles.listUnit}>/ {item.unit}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.listCartBtn}
                        onPress={() => handleAddToCart(item)}
                        activeOpacity={0.8}
                    >
                        <Icon name="cart" size={14} color="#fff" />
                        <Text style={styles.listCartBtnText}>В корзину</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderRequest = ({ item }) => {
        const statusConfig = getStatusConfig(item.status);
        return (
            <TouchableOpacity
                style={styles.requestCard}
                onPress={() => setSelectedRequest(item)}
                activeOpacity={0.7}
            >
                <View style={styles.requestTop}>
                    <View style={styles.requestTitleRow}>
                        <Text style={styles.requestTitle}>Заявка #{item.id}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                            <Icon name={statusConfig.icon} size={11} color={statusConfig.color} />
                            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.requestMetaRow}>
                        <Icon name="building" size={13} color={colors.textTertiary} />
                        <Text style={styles.requestMetaText}>{item.supplier_name}</Text>
                    </View>
                    <View style={styles.requestMetaRow}>
                        <Icon name="package" size={13} color={colors.textTertiary} />
                        <Text style={styles.requestMetaText}>{item.items?.length || 0} товар(ов)</Text>
                    </View>
                    {item.total_price && (
                        <Text style={styles.requestTotal}>
                            {parseInt(item.total_price).toLocaleString('ru-RU')} ₸
                        </Text>
                    )}
                    {item.delivery_address ? (
                        <View style={styles.requestMetaRow}>
                            <Icon name="map_pin" size={13} color={colors.textTertiary} />
                            <Text style={styles.requestMetaText} numberOfLines={1}>
                                {item.delivery_address}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {item.status === 'pending' && (
                    <View style={styles.pendingBanner}>
                        <Icon name="clock" size={13} color={colors.warning} />
                        <Text style={styles.pendingText}>Ожидаем ответа поставщика</Text>
                    </View>
                )}

                {item.response && (
                    <View style={styles.responseBanner}>
                        <Icon name="check" size={13} color={colors.success} />
                        <Text style={styles.responsePreviewText} numberOfLines={1}>
                            {item.response.message}
                        </Text>
                    </View>
                )}

                <View style={styles.requestFooter}>
                    <View style={styles.requestDateRow}>
                        <Icon name="clock" size={12} color={colors.textTertiary} />
                        <Text style={styles.requestDate}>
                            {new Date(item.created_at).toLocaleDateString('ru-RU')}
                        </Text>
                    </View>
                    <View style={styles.detailsLink}>
                        <Text style={styles.detailsLinkText}>Подробнее</Text>
                        <Icon name="chevronRight" size={14} color={colors.primary} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const isProductView = view === 'all' || view === 'products';

    return (
        <View style={styles.container}>
            {/* Header */}
            {/* <View style={styles.header}>
                <View>
                    <Text style={styles.headerGreeting}>Добро пожаловать</Text>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {view === 'products' && selectedSupplier
                            ? selectedSupplier.company_name || selectedSupplier.username
                            : view === 'suppliers' ? 'Поставщики'
                            : view === 'requests' ? 'Мои заявки'
                            : 'Все товары'}
                    </Text>
                </View> */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.citySelector}
                    onPress={() => setShowCitySelect(true)}
                    activeOpacity={0.7}
                >
                    <Icon name="map_pin" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.cityLabel} numberOfLines={1}>
                        {cityLabel || 'Выберите город'}
                    </Text>
                    <Icon name="chevronRight" size={12} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowProfile(true)}>
                        <Icon name="user" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowCart(true)}>
                        <Icon name="cart" size={18} color="#fff" />
                        {getTotalItems() > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{getTotalItems()}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowNotifications(true)}>
                        <Icon name="bell" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {[
                    { key: 'all', label: 'Товары', icon: 'layers' },
                    { key: 'suppliers', label: 'Поставщики', icon: 'store' },
                    { key: 'requests', label: 'Мои заявки', icon: 'package' },
                ].map(tab => {
                    const isActive = view === tab.key ||
                        (tab.key === 'suppliers' && view === 'products');
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.tab, isActive && styles.tabActive]}
                            onPress={() => {
                                if (tab.key === 'all') {
                                    setView('all');
                                    setSearch('');
                                    setSelectedSupplier(null);
                                    loadAllProducts();
                                } else if (tab.key === 'suppliers') {
                                    setView('suppliers');
                                    setSearch('');
                                    setSelectedSupplier(null);
                                } else {
                                    setView(tab.key);
                                }
                            }}
                        >
                            <Icon
                                name={tab.icon}
                                size={15}
                                color={isActive ? colors.primary : colors.textTertiary}
                            />
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Back button */}
            {view === 'products' && (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => { setView('suppliers'); setSearch(''); }}
                >
                    <Icon name="chevronLeft" size={16} color={colors.primary} />
                    <Text style={styles.backText}>Все поставщики</Text>
                </TouchableOpacity>
            )}

            {/* Search + toggle */}
            {isProductView && (
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Icon name="search" size={16} color={colors.textTertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={view === 'all' ? 'Поиск по всем товарам...' : 'Поиск товаров...'}
                            placeholderTextColor={colors.placeholder}
                            value={search}
                            onChangeText={handleSearch}
                        />
                    </View>
                    <TouchableOpacity style={styles.toggleBtn} onPress={openFilters}>
                        <Icon name="filter" size={18} color={colors.primary} />
                        {activeFilterCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.toggleBtn}
                        onPress={() => setDisplayMode(d => d === 'grid' ? 'list' : 'grid')}
                    >
                        <Icon
                            name={displayMode === 'grid' ? 'list' : 'grid'}
                            size={18}
                            color={colors.primary}
                        />
                    </TouchableOpacity>
                </View>
            )}

            {/* Content */}
            <CrossFade activeKey={loading ? 'loading' : `${view}-${displayMode}`} style={{ flex: 1 }}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : view === 'suppliers' ? (
                <FlatList
                    data={suppliers}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSupplier}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Icon name="store" size={32} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>Поставщики не найдены</Text>
                            <Text style={styles.emptySubtitle}>Попробуйте позже</Text>
                        </View>
                    }
                />
            ) : view === 'requests' ? (
                <FlatList
                    data={myRequests}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRequest}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Icon name="package" size={32} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>Заявок пока нет</Text>
                            <Text style={styles.emptySubtitle}>
                                Добавьте товары в корзину и оформите заявку
                            </Text>
                        </View>
                    }
                />
            ) : displayMode === 'grid' ? (
                <FlatList
                    key="grid"
                    data={products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderGridProduct}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridList}
                    ListHeaderComponent={view === 'products' ? renderSupplierHeader : null}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Icon name="layers" size={32} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>Товары не найдены</Text>
                            <Text style={styles.emptySubtitle}>Попробуйте изменить поисковый запрос</Text>
                        </View>
                    }
                />
            ) : (
                <FlatList
                    key="list"
                    data={products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderListProduct}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={view === 'products' ? renderSupplierHeader : null}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Icon name="layers" size={32} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.emptyTitle}>Товары не найдены</Text>
                        </View>
                    }
                />
            )}
            </CrossFade>

            {/* Quantity Modal */}
            <Modal visible={quantityModal} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalContent}>
                                <View style={styles.modalHandle} />

                                {selectedProductForCart?.image ? (
                                    <Image
                                        source={{ uri: selectedProductForCart.image }}
                                        style={styles.modalProductImage}
                                        resizeMode="cover"
                                    />
                                ) : null}

                                <Text style={styles.modalTitle}>
                                    {selectedProductForCart?.name}
                                </Text>
                                <View style={styles.modalSupplierRow}>
                                    <Icon name="store" size={13} color={colors.primary} />
                                    <Text style={styles.modalSupplierText}>
                                        {selectedProductForCart?.supplier_name}
                                    </Text>
                                </View>

                                <View style={styles.priceInfoBox}>
                                    <View style={styles.priceInfoItem}>
                                        <Text style={styles.priceInfoLabel}>Цена за единицу</Text>
                                        <Text style={styles.priceInfoValue}>
                                            {parseInt(selectedProductForCart?.price || 0).toLocaleString('ru-RU')} ₸ / {selectedProductForCart?.unit}
                                        </Text>
                                    </View>
                                    <View style={styles.priceInfoDivider} />
                                    <View style={styles.priceInfoItem}>
                                        <Text style={styles.priceInfoLabel}>Доступно</Text>
                                        <Text style={styles.priceInfoValue}>
                                            {selectedProductForCart?.stock_quantity} {selectedProductForCart?.unit}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.qtyLabel}>Количество</Text>
                                <View style={styles.qtyRow}>
                                    <TouchableOpacity
                                        style={styles.qtyBtn}
                                        onPress={() => setCartQuantity(q => Math.max(1, parseInt(q || 1) - 1).toString())}
                                    >
                                        <Icon name="minus" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                    <TextInput
                                        style={styles.qtyInput}
                                        value={cartQuantity}
                                        onChangeText={setCartQuantity}
                                        keyboardType="numeric"
                                        textAlign="center"
                                    />
                                    <TouchableOpacity
                                        style={styles.qtyBtn}
                                        onPress={() => setCartQuantity(q => {
                                            const next = parseInt(q || 0) + 1;
                                            if (next > selectedProductForCart?.stock_quantity) return q;
                                            return next.toString();
                                        })}
                                    >
                                        <Icon name="plus" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>

                                {cartQuantity && parseInt(cartQuantity) > 0 ? (
                                    <View style={styles.totalBox}>
                                        <Text style={styles.totalLabel}>Итого</Text>
                                        <Text style={styles.totalValue}>
                                            {(parseFloat(selectedProductForCart?.price || 0) * parseInt(cartQuantity || 0)).toLocaleString('ru-RU')} ₸
                                        </Text>
                                    </View>
                                ) : null}

                                <Button
                                    label="Добавить в корзину"
                                    onPress={handleConfirmAddToCart}
                                    style={{ marginTop: spacing.md }}
                                />
                                <Button
                                    label="Отмена"
                                    onPress={() => { Keyboard.dismiss(); setQuantityModal(false); }}
                                    variant="ghost"
                                    style={{ marginTop: spacing.sm }}
                                />
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Filters Modal */}
            <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                            <View style={styles.modalHandle} />
                            <View style={styles.filterHeaderRow}>
                                <Text style={styles.modalTitle}>Фильтры</Text>
                                <TouchableOpacity onPress={() => setShowFilters(false)}>
                                    <Icon name="x" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.filterSectionLabel}>Категория</Text>
                                <View style={styles.categoryChipsWrap}>
                                    {categories.map((cat) => {
                                        const active = draftCategories.includes(cat.value);
                                        return (
                                            <TouchableOpacity
                                                key={cat.value}
                                                style={[styles.categoryChip, active && styles.categoryChipActive]}
                                                onPress={() => toggleDraftCategory(cat.value)}
                                            >
                                                <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                                                    {cat.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text style={styles.filterSectionLabel}>Цена, ₸</Text>
                                <View style={styles.priceRangeRow}>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="От"
                                        placeholderTextColor={colors.placeholder}
                                        value={draftMinPrice}
                                        onChangeText={setDraftMinPrice}
                                        keyboardType="numeric"
                                    />
                                    <Text style={styles.priceRangeDash}>—</Text>
                                    <TextInput
                                        style={styles.priceInput}
                                        placeholder="До"
                                        placeholderTextColor={colors.placeholder}
                                        value={draftMaxPrice}
                                        onChangeText={setDraftMaxPrice}
                                        keyboardType="numeric"
                                    />
                                </View>

                                <Text style={styles.filterSectionLabel}>Сортировка</Text>
                                {[
                                    { key: 'newest', label: 'Сначала новые' },
                                    { key: 'price_asc', label: 'Сначала дешевле' },
                                    { key: 'price_desc', label: 'Сначала дороже' },
                                ].map((opt) => {
                                    const active = draftSortBy === opt.key;
                                    return (
                                        <TouchableOpacity
                                            key={opt.key}
                                            style={styles.sortOptionRow}
                                            onPress={() => setDraftSortBy(opt.key)}
                                        >
                                            <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                                                {active && <View style={styles.radioInner} />}
                                            </View>
                                            <Text style={styles.sortOptionText}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <Button
                                label="Показать товары"
                                onPress={applyFilters}
                                style={{ marginTop: spacing.md }}
                            />
                            <Button
                                label="Сбросить фильтры"
                                onPress={resetFilters}
                                variant="ghost"
                                style={{ marginTop: spacing.sm }}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Overlays */}
            <ScreenOverlay visible={!!selectedProduct}>
                <ProductDetailScreen
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onAddToCart={(product) => {
                        setSelectedProduct(null);
                        handleAddToCart(product);
                    }}
                    onSupplierPress={(supplierId) => {
                        setSelectedProduct(null);
                        const supplier = suppliers.find(s => s.id === supplierId);
                        if (supplier) {
                            handleSupplierPress(supplier);
                        } else {
                            client.get(`/api/auth/suppliers/${supplierId}/`)
                                .then(res => handleSupplierPress(res.data))
                                .catch(() => {});
                        }
                    }}
                />
            </ScreenOverlay>

            <ScreenOverlay visible={showCart}>
                <CartScreen onClose={() => setShowCart(false)} />
            </ScreenOverlay>

            <ScreenOverlay visible={!!selectedRequest}>
                <RequestDetailScreen
                    request={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                    onUpdate={() => { loadMyRequests(); setSelectedRequest(null); }}
                />
            </ScreenOverlay>

            <ScreenOverlay visible={showNotifications}>
                <NotificationsScreen onClose={() => setShowNotifications(false)} />
            </ScreenOverlay>

            <ScreenOverlay visible={showProfile}>
                <ProfileScreen onClose={() => setShowProfile(false)} />
            </ScreenOverlay>

            <ScreenOverlay visible={showCitySelect}>
                <CitySelectScreen
                    onClose={() => setShowCitySelect(false)}
                    onSelect={() => {
                        setShowCitySelect(false);
                        loadAllProducts();
                        loadSuppliers();
                    }}
                />
            </ScreenOverlay>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
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
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', maxWidth: 180 },
    headerActions: { flexDirection: 'row', gap: spacing.sm },
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

    // Tabs
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
    tabText: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },
    tabTextActive: { color: colors.primary, fontWeight: '700' },

    // Back button
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        padding: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backText: { color: colors.primary, fontSize: 14, fontWeight: '500' },

    // Supplier profile card
    supplierProfileCard: {
        backgroundColor: colors.card,
        marginBottom: spacing.lg,
        borderRadius: radius.xl,
        padding: spacing.lg,
        ...shadow.sm,
    },
    supplierProfileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    supplierProfileAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        ...shadow.md,
    },
    supplierProfileAvatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
    supplierProfileInfo: { flex: 1 },
    supplierProfileName: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
    supplierProfileBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primaryLight,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
    },
    supplierProfileBadgeText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
    supplierProfileDesc: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: spacing.md,
    },
    supplierProfileContacts: {
        gap: spacing.sm,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    supplierContactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    supplierContactIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    supplierContactText: { fontSize: 13, color: colors.textSecondary },

    // Search
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        height: 44,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        paddingVertical: 0,
    },
    toggleBtn: {
        width: 44,
        height: 44,
        borderRadius: radius.lg,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.primary + '30',
        position: 'relative',
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // Lists
    list: { padding: spacing.lg, paddingBottom: 40 },
    gridList: { padding: spacing.lg, paddingBottom: 40 },
    gridRow: { gap: spacing.md, marginBottom: spacing.md },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.xxxl },
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
    emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center', lineHeight: 20 },

    // Supplier card
    supplierCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadow.sm,
    },
    supplierAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
        flexShrink: 0,
    },
    supplierAvatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
    supplierInfo: { flex: 1 },
    supplierName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
    supplierDesc: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    supplierMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    supplierMetaText: { fontSize: 12, color: colors.textTertiary },
    supplierChevron: { marginLeft: spacing.sm },

    // Grid product card
    gridCard: {
        width: cardWidth,
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...shadow.sm,
    },
    gridImage: { width: '100%', height: 130 },
    gridImagePlaceholder: {
        width: '100%',
        height: 130,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridBody: { padding: spacing.md },
    gridName: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 4, lineHeight: 18 },
    gridSupplierRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
    gridSupplier: { fontSize: 11, color: colors.primary, flex: 1 },
    gridPrice: { fontSize: 15, fontWeight: '800', color: colors.text },
    gridUnit: { fontSize: 11, color: colors.textTertiary },
    gridCartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        padding: spacing.sm,
        gap: spacing.xs,
    },
    gridCartBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // List product card
    listCard: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        marginBottom: spacing.md,
        overflow: 'hidden',
        ...shadow.sm,
    },
    listImage: { width: '100%', height: 180 },
    listImagePlaceholder: {
        width: '100%',
        height: 160,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listBody: { padding: spacing.lg },
    listName: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
    listSupplierRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    listSupplier: { fontSize: 13, color: colors.primary, fontWeight: '500' },
    listDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.md },
    listBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    listPrice: { fontSize: 22, fontWeight: '800', color: colors.primary },
    listUnit: { fontSize: 12, color: colors.textTertiary },
    listCartBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        gap: spacing.xs,
    },
    listCartBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

    // Request card
    requestCard: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadow.sm,
    },
    requestTop: { marginBottom: spacing.sm },
    requestTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    requestTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    statusBadgeText: { fontSize: 12, fontWeight: '600' },
    requestMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: 4,
    },
    requestMetaText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    requestTotal: {
        fontSize: 20,
        fontWeight: '800',
        color: colors.text,
        marginVertical: spacing.sm,
    },
    pendingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: '#FEF3C7',
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    pendingText: { fontSize: 13, color: colors.warning, fontWeight: '500' },
    responseBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: '#DCFCE7',
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
    },
    responsePreviewText: { fontSize: 13, color: colors.success, flex: 1 },
    requestFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    requestDateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    requestDate: { fontSize: 12, color: colors.textTertiary },
    detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    detailsLinkText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    // Quantity modal
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
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        alignSelf: 'center',
        marginBottom: spacing.xl,
    },
    modalProductImage: {
        width: '100%',
        height: 140,
        borderRadius: radius.lg,
        marginBottom: spacing.lg,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
    filterHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    filterSectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    categoryChipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    categoryChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    categoryChipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    categoryChipTextActive: { color: colors.primary, fontWeight: '700' },
    priceRangeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    priceInput: {
        flex: 1,
        height: 44,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.md,
        fontSize: 14,
        color: colors.text,
        backgroundColor: colors.background,
    },
    priceRangeDash: { color: colors.textTertiary },
    sortOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterActive: { borderColor: colors.primary },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    sortOptionText: { fontSize: 14, color: colors.text },
    modalSupplierRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.lg,
    },
    modalSupplierText: { fontSize: 13, color: colors.primary },
    priceInfoBox: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    priceInfoItem: { flex: 1, alignItems: 'center' },
    priceInfoLabel: { fontSize: 11, color: colors.textTertiary, marginBottom: 4 },
    priceInfoValue: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
    priceInfoDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
    qtyLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xl,
        marginBottom: spacing.lg,
    },
    qtyBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyInput: {
        width: 80,
        height: 56,
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: radius.lg,
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        padding: 0,
    },
    totalBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.primaryLight,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        borderWidth: 1.5,
        borderColor: colors.primary + '40',
    },
    totalLabel: { fontSize: 14, fontWeight: '600', color: colors.primary },
    totalValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
    citySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.full,
        maxWidth: 160,
    },
    cityLabel: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '600',
        flex: 1,
    },
});