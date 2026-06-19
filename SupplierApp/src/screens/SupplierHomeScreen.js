import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert,
    Modal, TextInput, ScrollView, Image,
    KeyboardAvoidingView, Platform,
    TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import NotificationsScreen from './NotificationsScreen';
import * as ImagePicker from 'expo-image-picker';

export default function SupplierHomeScreen() {
    const { signOut, user } = useAuth();
    const [view, setView] = useState('requests');
    const [requests, setRequests] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [responseModal, setResponseModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [message, setMessage] = useState('');
    const [offeredPrice, setOfferedPrice] = useState('');
    const [productModal, setProductModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [productImage, setProductImage] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: '',
        unit: '',
        stock_quantity: '',
        is_available: true,
    });

    useEffect(() => {
        if (view === 'requests') loadRequests();
        else loadProducts();
    }, [view]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const response = await client.get('/api/requests/');
            setRequests(response.data.results || response.data);
        } catch (e) {
            Alert.alert('Error', 'Could not load requests');
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
            Alert.alert('Error', 'Could not load products');
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
            Alert.alert('Permission needed', 'Please allow access to your photo library');
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
            Alert.alert('Error', 'Please enter a message');
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
            Alert.alert('Success', 'Response sent to client!');
            loadRequests();
        } catch (e) {
            Alert.alert('Error', 'Could not send response');
        }
    };

    const handleUpdateStatus = async (requestId, status) => {
        try {
            await client.patch(`/api/requests/${requestId}/update_status/`, { status });
            Alert.alert('Success', `Request marked as ${status}`);
            loadRequests();
        } catch (e) {
            Alert.alert('Error', 'Could not update status');
        }
    };

    const handleEditProduct = (product) => {
        setProductForm({
            name: product.name,
            description: product.description || '',
            price: product.price.toString(),
            unit: product.unit,
            stock_quantity: product.stock_quantity.toString(),
            is_available: product.is_available,
        });
        setEditingProduct(product);
        setProductModal(true);
    };

    const handleDeleteProduct = (productId) => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await client.delete(`/api/catalog/products/${productId}/`);
                            Alert.alert('Success', 'Product deleted');
                            loadProducts();
                        } catch (e) {
                            Alert.alert('Error', 'Could not delete product');
                        }
                    }
                }
            ]
        );
    };

    const handleAddProduct = async () => {
        if (!productForm.name || !productForm.price || !productForm.unit) {
            Alert.alert('Error', 'Please fill in name, price and unit');
            return;
        }
        try {
            const formData = new FormData();
            formData.append('name', productForm.name);
            formData.append('description', productForm.description);
            formData.append('price', parseFloat(productForm.price));
            formData.append('unit', productForm.unit);
            formData.append('stock_quantity', parseInt(productForm.stock_quantity) || 0);
            formData.append('is_available', productForm.is_available);

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
                Alert.alert('Success', 'Product updated!');
            } else {
                await client.post('/api/catalog/products/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                Alert.alert('Success', 'Product added!');
            }

            setProductModal(false);
            setProductForm({
                name: '', description: '', price: '',
                unit: '', stock_quantity: '', is_available: true,
            });
            setProductImage(null);
            setEditingProduct(null);
            loadProducts();
        } catch (e) {
            Alert.alert('Error', 'Could not save product');
        }
    };

    const handleToggleAvailability = async (product) => {
        try {
            await client.patch(`/api/catalog/products/${product.id}/`, {
                is_available: !product.is_available,
            });
            loadProducts();
        } catch (e) {
            Alert.alert('Error', 'Could not update product');
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

    const renderRequest = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.product_name}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.badgeText}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.cardSubtitle}>From: {item.client_name}</Text>
            <Text style={styles.cardSubtitle}>Quantity: {item.quantity}</Text>
            {item.note ? (
                <Text style={styles.note}>Note: {item.note}</Text>
            ) : null}

            {item.response && (
                <View style={styles.responseBox}>
                    <Text style={styles.responseTitle}>Your response:</Text>
                    <Text style={styles.responseText}>{item.response.message}</Text>
                    {item.response.offered_price && (
                        <Text style={styles.responseText}>
                            Offered price: ${item.response.offered_price}
                        </Text>
                    )}
                </View>
            )}

            {item.status === 'pending' && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                        onPress={() => handleRespond(item)}
                    >
                        <Text style={styles.actionText}>Respond</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleUpdateStatus(item.id, 'declined')}
                    >
                        <Text style={styles.actionText}>Decline</Text>
                    </TouchableOpacity>
                </View>
            )}

            {item.status === 'accepted' && (
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#6366F1', marginTop: 8 }]}
                    onPress={() => handleUpdateStatus(item.id, 'fulfilled')}
                >
                    <Text style={styles.actionText}>Mark as Fulfilled</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderProduct = ({ item }) => (
        <View style={styles.card}>
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
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <TouchableOpacity
                    style={[
                        styles.badge,
                        { backgroundColor: item.is_available ? '#10B981' : '#EF4444' }
                    ]}
                    onPress={() => handleToggleAvailability(item)}
                >
                    <Text style={styles.badgeText}>
                        {item.is_available ? 'Available' : 'Unavailable'}
                    </Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.cardSubtitle}>{item.description}</Text>
            <Text style={styles.price}>{item.price} тенге / {item.unit}</Text>
            <Text style={styles.cardSubtitle}>Stock: {item.stock_quantity}</Text>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#4F46E5' }]}
                    onPress={() => handleEditProduct(item)}
                >
                    <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleDeleteProduct(item.id)}
                >
                    <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {user?.company_name || user?.username}
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

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, view === 'requests' && styles.tabActive]}
                    onPress={() => setView('requests')}
                >
                    <Text style={[styles.tabText, view === 'requests' && styles.tabTextActive]}>
                        Requests
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, view === 'products' && styles.tabActive]}
                    onPress={() => setView('products')}
                >
                    <Text style={[styles.tabText, view === 'products' && styles.tabTextActive]}>
                        My Products
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator style={styles.loader} size="large" color="#4F46E5" />
            ) : (
                <FlatList
                    data={view === 'requests' ? requests : products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={view === 'requests' ? renderRequest : renderProduct}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>
                            {view === 'requests' ? 'No requests yet' : 'No products yet'}
                        </Text>
                    }
                />
            )}

            {view === 'products' && (
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        setEditingProduct(null);
                        setProductForm({
                            name: '', description: '', price: '',
                            unit: '', stock_quantity: '', is_available: true,
                        });
                        setProductImage(null);
                        setProductModal(true);
                    }}
                >
                    <Text style={styles.fabText}>+ Add Product</Text>
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
                            <Text style={styles.modalTitle}>Respond to request</Text>
                            <Text style={styles.modalSubtitle}>
                                {selectedRequest?.product_name} — qty: {selectedRequest?.quantity}
                            </Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Your message to the client"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                numberOfLines={3}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Offered price (optional)"
                                value={offeredPrice}
                                onChangeText={setOfferedPrice}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleSubmitResponse}
                            >
                                <Text style={styles.buttonText}>Send Response</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    setResponseModal(false);
                                }}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>

            {/* Add/Edit Product Modal */}
            <Modal visible={productModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <ScrollView>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                {editingProduct ? 'Edit Product' : 'Add New Product'}
                            </Text>

                            <TouchableOpacity
                                style={styles.imagePicker}
                                onPress={handlePickImage}
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
                                    <Text style={styles.imagePickerText}>📷 Add Photo</Text>
                                )}
                            </TouchableOpacity>

                            <TextInput
                                style={styles.input}
                                placeholder="Product name *"
                                value={productForm.name}
                                onChangeText={(v) => setProductForm(p => ({ ...p, name: v }))}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Description"
                                value={productForm.description}
                                onChangeText={(v) => setProductForm(p => ({ ...p, description: v }))}
                                multiline
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Price *"
                                value={productForm.price}
                                onChangeText={(v) => setProductForm(p => ({ ...p, price: v }))}
                                keyboardType="numeric"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Unit (kg, piece, box) *"
                                value={productForm.unit}
                                onChangeText={(v) => setProductForm(p => ({ ...p, unit: v }))}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Stock quantity"
                                value={productForm.stock_quantity}
                                onChangeText={(v) => setProductForm(p => ({ ...p, stock_quantity: v }))}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleAddProduct}
                            >
                                <Text style={styles.buttonText}>
                                    {editingProduct ? 'Save Changes' : 'Add Product'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setProductModal(false);
                                    setProductImage(null);
                                    setEditingProduct(null);
                                }}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
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
    tab: { flex: 1, padding: 16, alignItems: 'center' },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#4F46E5',
    },
    tabText: { fontSize: 15, color: '#999' },
    tabTextActive: { color: '#4F46E5', fontWeight: '600' },
    list: { padding: 12 },
    loader: { marginTop: 40 },
    empty: { textAlign: 'center', color: '#999', marginTop: 40 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1 },
    cardSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    note: { fontSize: 13, color: '#888', marginTop: 6, fontStyle: 'italic' },
    price: { fontSize: 15, fontWeight: '600', color: '#4F46E5', marginTop: 6 },
    responseBox: {
        backgroundColor: '#f0f4ff',
        borderRadius: 8,
        padding: 10,
        marginTop: 10,
    },
    responseTitle: { fontSize: 13, fontWeight: '600', color: '#4F46E5' },
    responseText: { fontSize: 13, color: '#444', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
    actionButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: '#4F46E5',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
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
    modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
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
    placeholderText: {
        color: '#999',
        fontSize: 14,
    },
    imagePicker: {
        width: '100%',
        height: 160,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
    },
    imagePreview: {
        width: '100%',
        height: 160,
        borderRadius: 8,
    },
    imagePickerText: {
        color: '#999',
        fontSize: 16,
    },
});