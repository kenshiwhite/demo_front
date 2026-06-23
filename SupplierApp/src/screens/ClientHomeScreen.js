import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../components/Icon';
import { colors, spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';
import { Button, InputField } from '../components/UI';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, TextInput, ActivityIndicator,
    Alert, Modal, Image, KeyboardAvoidingView,
    Platform, TouchableWithoutFeedback, Keyboard,
    ScrollView, Dimensions
} from 'react-native';
import { getSuppliers, getProducts, getAllProducts } from '../api/catalog';
import { getMyRequests } from '../api/requests';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationsScreen from './NotificationsScreen';
import RequestDetailScreen from './RequestDetailScreen';
import CartScreen from './CartScreen';
import ProfileScreen from './ProfileScreen';
import ProductDetailScreen from './ProductDetailScreen';
import client from '../api/client';

const screenWidth = Dimensions.get('window').width;
const cardWidth = (screenWidth - 48) / 2;

export default function ClientHomeScreen() {
    const { signOut, user } = useAuth();
    const { addToCart, getTotalItems } = useCart();
    const [view, setView] = useState('all');
    const [displayMode, setDisplayMode] = useState('grid'); // grid | list
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

    useEffect(() => {
        loadAllProducts();
        loadSuppliers();
    }, []);

    useEffect(() => {
        if (view === 'requests') loadMyRequests();
    }, [view]);

    const loadSuppliers = async () => {
        try {
            const data = await getSuppliers();
            setSuppliers(data.results || data);
        } catch (e) {
            console.log('Не удалось загрузить поставщиков');
        }
    };

    const loadAllProducts = async (searchText = '') => {
        setLoading(true);
        try {
            const data = await getAllProducts(searchText);
            setProducts(data.results || data);
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось загрузить товары');
        } finally {
            setLoading(false);
        }
    };

    const loadSupplierProducts = async (supplierId, searchText = '') => {
        setLoading(true);
        try {
            const data = await getProducts(supplierId, searchText);
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
        Alert.alert('Добавлено', `${selectedProductForCart.name} x${qty} добавлен в корзину`);
    };

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

    const renderSupplierHeader = () => {
        if (!selectedSupplier) return null;
        return (
            <View style={styles.supplierHeader}>
                <View style={styles.supplierHeaderAvatar}>
                    <Text style={styles.supplierHeaderAvatarText}>
                        {selectedSupplier.company_name?.[0] ||
                         selectedSupplier.username?.[0]?.toUpperCase()}
                    </Text>
                </View>
                <View style={styles.supplierHeaderInfo}>
                    <Text style={styles.supplierHeaderName}>
                        {selectedSupplier.company_name || selectedSupplier.username}
                    </Text>
                    {selectedSupplier.description ? (
                        <Text style={styles.supplierHeaderDesc} numberOfLines={2}>
                            {selectedSupplier.description}
                        </Text>
                    ) : null}
                    {selectedSupplier.phone ? (
                        <Text style={styles.supplierHeaderPhone}>
                            📞 {selectedSupplier.phone}
                        </Text>
                    ) : null}
                    <Text style={styles.supplierHeaderProducts}>
                        {selectedSupplier.product_count} товаров
                    </Text>
                </View>
            </View>
        );
    };

    const renderSupplier = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleSupplierPress(item)}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {item.company_name?.[0] || item.username[0].toUpperCase()}
                </Text>
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>
                    {item.company_name || item.username}
                </Text>
                {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={1}>
                        {item.description}
                    </Text>
                ) : null}
                <Text style={styles.cardSubtitle}>
                    {item.product_count} товаров доступно
                </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
    );

    // GRID product card (small, 2 per row)
    const renderGridProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setSelectedProduct(item)}
        >
            {item.image ? (
                <Image
                    source={{ uri: item.image }}
                    style={styles.gridImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.gridImagePlaceholder}>
                    <Text style={styles.placeholderText}>Нет фото</Text>
                </View>
            )}
            <View style={styles.gridInfo}>
                <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.gridSupplier} numberOfLines={1}>
                    {item.supplier_name}
                </Text>
                <Text style={styles.gridPrice}>
                    {parseInt(item.price).toLocaleString('ru-RU')} ₸
                </Text>
                <Text style={styles.gridUnit}>/{item.unit}</Text>
            </View>
            <TouchableOpacity
                style={styles.gridCartBtn}
                onPress={() => handleAddToCart(item)}
            >
                <Text style={styles.gridCartBtnText}>+ В корзину</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    // LIST product card (big, 1 per row)
    const renderListProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => setSelectedProduct(item)}
        >
            {item.image ? (
                <Image
                    source={{ uri: item.image }}
                    style={styles.productImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.productImagePlaceholder}>
                    <Text style={styles.placeholderText}>Нет фото</Text>
                </View>
            )}
            <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.supplierName}>От: {item.supplier_name}</Text>
                <Text style={styles.productDesc} numberOfLines={2}>
                    {item.description}
                </Text>
                <Text style={styles.productPrice}>
                    {parseInt(item.price).toLocaleString('ru-RU')} ₸ / {item.unit}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.requestButton}
                onPress={() => handleAddToCart(item)}
            >
                <Text style={styles.requestButtonText}>В корзину</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderRequest = ({ item }) => (
        <TouchableOpacity
            style={styles.requestCard}
            onPress={() => setSelectedRequest(item)}
        >
            <View style={styles.requestHeader}>
                <Text style={styles.requestProduct}>Заявка #{item.id}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.badgeText}>{getStatusText(item.status)}</Text>
                </View>
            </View>
            <Text style={styles.requestDetail}>Поставщик: {item.supplier_name}</Text>
            <Text style={styles.requestDetail}>Товаров: {item.items?.length || 0}</Text>
            {item.total_price && (
                <Text style={styles.requestDetail}>
                    Итого: {parseInt(item.total_price).toLocaleString('ru-RU')} ₸
                </Text>
            )}
            {item.delivery_address ? (
                <Text style={styles.requestDetail} numberOfLines={1}>
                    Адрес: {item.delivery_address}
                </Text>
            ) : null}
            <Text style={styles.requestDate}>
                {new Date(item.created_at).toLocaleDateString('ru-RU')}
            </Text>
            {item.status === 'pending' && (
                <View style={styles.pendingBox}>
                    <Text style={styles.pendingText}>⏳ Ожидаем ответа поставщика</Text>
                </View>
            )}
            {item.response && (
                <View style={styles.responseBox}>
                    <Text style={styles.responseTitle}>Ответ поставщика:</Text>
                    <Text style={styles.responseText} numberOfLines={2}>
                        {item.response.message}
                    </Text>
                </View>
            )}
            <Text style={styles.tapHint}>Нажмите для подробностей →</Text>
        </TouchableOpacity>
    );

    const isProductView = view === 'all' || view === 'products';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {view === 'products' && selectedSupplier
                        ? selectedSupplier.company_name || selectedSupplier.username
                        : view === 'suppliers' ? 'Поставщики'
                        : view === 'requests' ? 'Мои заявки'
                        : 'Все товары'}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowProfile(true)}>
                        <Icon name="user" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowCart(true)}>
                        <Icon name="cart" size={18} color="#fff" />
                        {getTotalItems() > 0 && (
                            <View style={styles.cartBadge}>
                                <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowNotifications(true)}>
                        <Icon name="bell" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, view === 'all' && styles.tabActive]}
                    onPress={() => {
                        setView('all');
                        setSearch('');
                        setSelectedSupplier(null);
                        loadAllProducts();
                    }}
                >
                    <Text style={[styles.tabText, view === 'all' && styles.tabTextActive]}>
                        Товары
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, (view === 'suppliers' || view === 'products') && styles.tabActive]}
                    onPress={() => {
                        setView('suppliers');
                        setSearch('');
                        setSelectedSupplier(null);
                    }}
                >
                    <Text style={[styles.tabText, (view === 'suppliers' || view === 'products') && styles.tabTextActive]}>
                        Поставщики
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, view === 'requests' && styles.tabActive]}
                    onPress={() => setView('requests')}
                >
                    <Text style={[styles.tabText, view === 'requests' && styles.tabTextActive]}>
                        Мои заявки
                    </Text>
                </TouchableOpacity>
            </View>

            {view === 'products' && (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        setView('suppliers');
                        setSearch('');
                    }}
                >
                    <Text style={styles.backText}>← Назад к поставщикам</Text>
                </TouchableOpacity>
            )}

            {view === 'products' && renderSupplierHeader()}

            {isProductView && (
                <View style={styles.searchRow}>
                    <TextInput
                        style={styles.search}
                        placeholder={view === 'all' ? 'Поиск по всем товарам...' : 'Поиск товаров...'}
                        value={search}
                        onChangeText={handleSearch}
                    />
                    <TouchableOpacity
                        style={styles.toggleBtn}
                        onPress={() => setDisplayMode(d => d === 'grid' ? 'list' : 'grid')}
                    >
                        <Icon name={displayMode === 'grid' ? 'list' : 'grid'} size={18} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <ActivityIndicator style={styles.loader} size="large" color="#4F46E5" />
            ) : view === 'suppliers' ? (
                <FlatList
                    data={suppliers}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSupplier}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>Поставщики не найдены</Text>
                    }
                />
            ) : view === 'requests' ? (
                <FlatList
                    data={myRequests}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRequest}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>Заявок пока нет</Text>
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
                    ListEmptyComponent={
                        <Text style={styles.empty}>Товары не найдены</Text>
                    }
                />
            ) : (
                <FlatList
                    key="list"
                    data={products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderListProduct}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>Товары не найдены</Text>
                    }
                />
            )}

            {/* Quantity Modal */}
            <Modal visible={quantityModal} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>
                                    {selectedProductForCart?.name}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    {parseInt(selectedProductForCart?.price).toLocaleString('ru-RU')} ₸ / {selectedProductForCart?.unit}
                                </Text>
                                <View style={styles.qtyRow}>
                                    <TouchableOpacity
                                        style={styles.qtyBtn}
                                        onPress={() => setCartQuantity(q => Math.max(1, parseInt(q || 1) - 1).toString())}
                                    >
                                        <Text style={styles.qtyBtnText}>−</Text>
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
                                        <Text style={styles.qtyBtnText}>+</Text>
                                    </TouchableOpacity>
                                </View>
                                {cartQuantity ? (
                                    <View style={styles.totalBox}>
                                        <Text style={styles.totalLabel}>Итого:</Text>
                                        <Text style={styles.totalValue}>
                                            {(parseFloat(selectedProductForCart?.price) * parseInt(cartQuantity || 0)).toLocaleString('ru-RU')} ₸
                                        </Text>
                                    </View>
                                ) : null}
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleConfirmAddToCart}
                                >
                                    <Text style={styles.buttonText}>Добавить в корзину</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setQuantityModal(false);
                                    }}
                                >
                                    <Text style={styles.cancelText}>Отмена</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {selectedProduct && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <ProductDetailScreen
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                        onAddToCart={(product) => {
                            setSelectedProduct(null);
                            handleAddToCart(product);
                        }}
                        onSupplierPress={(supplierId) => {
                            setSelectedProduct(null);
                            // find supplier and navigate to their products
                            const supplier = suppliers.find(s => s.id === supplierId);
                            if (supplier) {
                                handleSupplierPress(supplier);
                            } else {
                                // fetch supplier if not in list
                                client.get(`/api/auth/suppliers/${supplierId}/`)
                                    .then(res => handleSupplierPress(res.data))
                                    .catch(() => Alert.alert('Ошибка', 'Не удалось загрузить поставщика'));
                            }
                        }}
                    />
                </View>
            )}

            {showCart && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <CartScreen onClose={() => setShowCart(false)} />
                </View>
            )}

            {selectedRequest && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <RequestDetailScreen
                        request={selectedRequest}
                        onClose={() => setSelectedRequest(null)}
                        onUpdate={() => {
                            loadMyRequests();
                            setSelectedRequest(null);
                        }}
                    />
                </View>
            )}

            {showNotifications && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <NotificationsScreen onClose={() => setShowNotifications(false)} />
                </View>
            )}

            {showProfile && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <ProfileScreen onClose={() => setShowProfile(false)} />
                </View>
            )}
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
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    logout: { color: '#fff', fontSize: 14 },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tab: { flex: 1, padding: 14, alignItems: 'center' },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#4F46E5',
    },
    tabText: { fontSize: 13, color: '#999' },
    tabTextActive: { color: '#4F46E5', fontWeight: '600' },
    backButton: { padding: 12, backgroundColor: '#fff' },
    backText: { color: '#4F46E5', fontSize: 14 },
    supplierHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f4ff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e8ff',
        alignItems: 'flex-start',
    },
    supplierHeaderAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    supplierHeaderAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    supplierHeaderInfo: { flex: 1 },
    supplierHeaderName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
    supplierHeaderDesc: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
    supplierHeaderPhone: { fontSize: 13, color: '#4F46E5', marginBottom: 4 },
    supplierHeaderProducts: { fontSize: 12, color: '#999' },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
    },
    search: {
        flex: 1,
        margin: 12,
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
    },
    toggleBtn: {
        width: 44,
        height: 44,
        backgroundColor: '#4F46E5',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleBtnText: { color: '#fff', fontSize: 20 },
    list: { padding: 12 },
    gridList: { padding: 12 },
    gridRow: { gap: 12, marginBottom: 12 },
    loader: { marginTop: 40 },
    empty: { textAlign: 'center', color: '#999', marginTop: 40 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
    cardDesc: { fontSize: 12, color: '#888', marginTop: 2 },
    cardSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
    arrow: { fontSize: 24, color: '#ccc' },

    // Grid card styles
    gridCard: {
        width: cardWidth,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    gridImage: {
        width: '100%',
        height: 120,
    },
    gridImagePlaceholder: {
        width: '100%',
        height: 120,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridInfo: { padding: 8 },
    gridName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
    gridSupplier: { fontSize: 11, color: '#4F46E5', marginBottom: 4 },
    gridPrice: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a' },
    gridUnit: { fontSize: 11, color: '#999' },
    gridCartBtn: {
        backgroundColor: '#4F46E5',
        padding: 8,
        alignItems: 'center',
    },
    gridCartBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    // List card styles
    productCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    productImage: {
        width: '100%',
        height: 160,
        borderRadius: 8,
        marginBottom: 12,
    },
    productImagePlaceholder: {
        width: '100%',
        height: 160,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    placeholderText: { color: '#999', fontSize: 14 },
    productInfo: { marginBottom: 12 },
    productName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
    supplierName: { fontSize: 13, color: '#4F46E5', marginTop: 2 },
    productDesc: { fontSize: 13, color: '#666', marginTop: 4 },
    productPrice: { fontSize: 15, fontWeight: '600', color: '#4F46E5', marginTop: 8 },
    requestButton: {
        backgroundColor: '#4F46E5',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    requestButtonText: { color: '#fff', fontWeight: '600' },

    // Request card
    requestCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    requestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    requestProduct: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    requestDetail: { fontSize: 14, color: '#444', marginTop: 2 },
    requestDate: { fontSize: 12, color: '#bbb', marginTop: 6 },
    responseBox: {
        backgroundColor: '#f0f4ff',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
    },
    responseTitle: { fontSize: 13, fontWeight: '600', color: '#4F46E5' },
    responseText: { fontSize: 13, color: '#444', marginTop: 4 },
    pendingBox: {
        backgroundColor: '#FFF8E7',
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
        alignItems: 'center',
    },
    pendingText: { fontSize: 13, color: '#F59E0B' },
    tapHint: { fontSize: 12, color: '#4F46E5', marginTop: 10, textAlign: 'right' },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    modalSubtitle: { fontSize: 14, color: '#4F46E5', marginBottom: 20 },
    qtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 16,
    },
    qtyBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyBtnText: { color: '#fff', fontSize: 24, fontWeight: '600', lineHeight: 26 },
    qtyInput: {
        borderWidth: 2,
        borderColor: '#4F46E5',
        borderRadius: 8,
        width: 80,
        height: 48,
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
        textAlign: 'center',
    },
    totalBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f4ff',
        padding: 14,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#4F46E5',
    },
    totalLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
    totalValue: { fontSize: 20, fontWeight: 'bold', color: '#4F46E5' },
    stockHint: { textAlign: 'center', color: '#999', fontSize: 13, marginBottom: 16 },
    button: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    cancelButton: { alignItems: 'center', padding: 12 },
    cancelText: { color: '#666', fontSize: 16 },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cartBadge: {
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
    cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});