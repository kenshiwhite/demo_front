import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, TextInput, ActivityIndicator,
    Alert, Modal, Image, KeyboardAvoidingView,
    Platform, TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { getSuppliers, getProducts, getAllProducts } from '../api/catalog';
import { createRequest, getMyRequests } from '../api/requests';
import { useAuth } from '../context/AuthContext';
import NotificationsScreen from './NotificationsScreen';

export default function ClientHomeScreen() {
    const { signOut, user } = useAuth();
    const [view, setView] = useState('all');
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState('');
    const [note, setNote] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);

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
            console.log('Could not load suppliers');
        }
    };

    const loadAllProducts = async (searchText = '') => {
        setLoading(true);
        try {
            const data = await getAllProducts(searchText);
            setProducts(data.results || data);
        } catch (e) {
            Alert.alert('Error', 'Could not load products');
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
            Alert.alert('Error', 'Could not load products');
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
            Alert.alert('Error', 'Could not load requests');
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

    const handleRequestPress = (product) => {
        setSelectedProduct(product);
        setModalVisible(true);
    };

    const handleSubmitRequest = async () => {
        if (!quantity) {
            Alert.alert('Error', 'Please enter quantity');
            return;
        }
        const total = (parseFloat(selectedProduct?.price) * parseInt(quantity)).toFixed(2);
        try {
            await createRequest({
                product: selectedProduct.id,
                quantity: parseInt(quantity),
                note,
            });
            setModalVisible(false);
            setQuantity('');
            setNote('');
            Alert.alert(
                'Request Sent',
                `Your request for ${quantity} x ${selectedProduct.name} has been sent.\nTotal: $${total}`
            );
        } catch (e) {
            Alert.alert('Error', 'Could not send request');
        }
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
                <Text style={styles.cardSubtitle}>
                    {item.product_count} products available
                </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
    );

    const renderProduct = ({ item }) => (
        <View style={styles.productCard}>
            {item.image ? (
                <Image
                    source={{ uri: item.image }}
                    style={styles.productImage}
                    resizeMode="cover"
                />
            ) : (
                <View style={styles.productImagePlaceholder}>
                    <Text style={styles.placeholderText}>No image</Text>
                </View>
            )}
            <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.supplierName}>By: {item.supplier_name}</Text>
                <Text style={styles.productDesc} numberOfLines={2}>
                    {item.description}
                </Text>
                <Text style={styles.productPrice}>
                    ${item.price} / {item.unit}
                </Text>
                <Text style={styles.productStock}>
                    Stock: {item.stock_quantity}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.requestButton}
                onPress={() => handleRequestPress(item)}
            >
                <Text style={styles.requestButtonText}>Request</Text>
            </TouchableOpacity>
        </View>
    );

    const renderRequest = ({ item }) => (
        <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
                <Text style={styles.requestProduct}>{item.product_name}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>

            <Text style={styles.requestDetail}>
                Quantity: {item.quantity}
            </Text>
            <Text style={styles.requestDetail}>
                Total: ${item.total_price || (parseFloat(item.quantity) * 0).toFixed(2)}
            </Text>
            {item.note ? (
                <Text style={styles.requestNote}>Note: {item.note}</Text>
            ) : null}
            <Text style={styles.requestDate}>
                {new Date(item.created_at).toLocaleDateString()}
            </Text>

            {item.response && (
                <View style={styles.responseBox}>
                    <Text style={styles.responseTitle}>
                        Supplier response:
                    </Text>
                    <Text style={styles.responseText}>
                        {item.response.message}
                    </Text>
                    {item.response.offered_price && (
                        <Text style={styles.responsePrice}>
                            Offered price: ${item.response.offered_price}
                        </Text>
                    )}
                </View>
            )}

            {item.status === 'pending' && (
                <View style={styles.pendingBox}>
                    <Text style={styles.pendingText}>
                        ⏳ Waiting for supplier response
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {view === 'products' && selectedSupplier
                        ? selectedSupplier.company_name || selectedSupplier.username
                        : view === 'suppliers' ? 'Suppliers'
                        : view === 'requests' ? 'My Requests'
                        : 'All Products'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowNotifications(true)}>
                        <Text style={styles.logout}>🔔</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={signOut}>
                        <Text style={styles.logout}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tabs */}
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
                        Products
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
                        Suppliers
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, view === 'requests' && styles.tabActive]}
                    onPress={() => setView('requests')}
                >
                    <Text style={[styles.tabText, view === 'requests' && styles.tabTextActive]}>
                        My Requests
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Back button */}
            {view === 'products' && (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        setView('suppliers');
                        setSearch('');
                    }}
                >
                    <Text style={styles.backText}>← Back to suppliers</Text>
                </TouchableOpacity>
            )}

            {/* Search bar */}
            {(view === 'all' || view === 'products') && (
                <TextInput
                    style={styles.search}
                    placeholder={view === 'all' ? 'Search all products...' : 'Search products...'}
                    value={search}
                    onChangeText={handleSearch}
                />
            )}

            {/* Content */}
            {loading ? (
                <ActivityIndicator style={styles.loader} size="large" color="#4F46E5" />
            ) : view === 'suppliers' ? (
                <FlatList
                    data={suppliers}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSupplier}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>No suppliers found</Text>
                    }
                />
            ) : view === 'requests' ? (
                <FlatList
                    data={myRequests}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRequest}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>No requests yet</Text>
                    }
                />
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderProduct}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>No products found</Text>
                    }
                />
            )}

            {/* Request Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>
                                    {selectedProduct?.name}
                                </Text>
                                <Text style={styles.modalSubtitle}>
                                    From: {selectedProduct?.supplier_name}
                                </Text>

                                <View style={styles.priceRow}>
                                    <Text style={styles.priceLabel}>Price per unit:</Text>
                                    <Text style={styles.priceValue}>
                                        ${selectedProduct?.price} / {selectedProduct?.unit}
                                    </Text>
                                </View>

                                <TextInput
                                    style={styles.input}
                                    placeholder="Quantity"
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    keyboardType="numeric"
                                />

                                {quantity ? (
                                    <View style={styles.totalBox}>
                                        <Text style={styles.totalLabel}>Total:</Text>
                                        <Text style={styles.totalValue}>
                                            ${(parseFloat(selectedProduct?.price) * parseInt(quantity || 0)).toFixed(2)}
                                        </Text>
                                    </View>
                                ) : null}

                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Note (optional)"
                                    value={note}
                                    onChangeText={setNote}
                                    multiline
                                    numberOfLines={3}
                                />
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleSubmitRequest}
                                >
                                    <Text style={styles.buttonText}>Send Request</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {showNotifications && (
                <View style={StyleSheet.absoluteFill}>
                    <NotificationsScreen onClose={() => setShowNotifications(false)} />
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
    search: {
        margin: 12,
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
    },
    list: { padding: 12 },
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
    cardSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
    arrow: { fontSize: 24, color: '#ccc' },
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
    productStock: { fontSize: 13, color: '#999', marginTop: 2 },
    requestButton: {
        backgroundColor: '#4F46E5',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    requestButtonText: { color: '#fff', fontWeight: '600' },
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
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    requestDetail: { fontSize: 14, color: '#444', marginTop: 2 },
    requestNote: { fontSize: 13, color: '#888', marginTop: 4, fontStyle: 'italic' },
    requestDate: { fontSize: 12, color: '#bbb', marginTop: 6 },
    responseBox: {
        backgroundColor: '#f0f4ff',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
    },
    responseTitle: { fontSize: 13, fontWeight: '600', color: '#4F46E5' },
    responseText: { fontSize: 13, color: '#444', marginTop: 4 },
    responsePrice: { fontSize: 14, fontWeight: '600', color: '#10B981', marginTop: 4 },
    pendingBox: {
        backgroundColor: '#FFF8E7',
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
        alignItems: 'center',
    },
    pendingText: { fontSize: 13, color: '#F59E0B' },
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
    modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 12 },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    priceLabel: { fontSize: 14, color: '#666' },
    priceValue: { fontSize: 15, fontWeight: '600', color: '#4F46E5' },
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
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    textArea: { height: 80, textAlignVertical: 'top' },
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
});