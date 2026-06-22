import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
import RequestDetailScreen from './RequestDetailScreen';
import ProfileScreen from './ProfileScreen';
import * as ImagePicker from 'expo-image-picker';
import AnalyticsScreen from './AnalyticsScreen';

export default function SupplierHomeScreen() {
    const { signOut, user } = useAuth();
    const [view, setView] = useState('requests');
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
    const [showAnalytics, setShowAnalytics] = useState(false);

    useEffect(() => {
        if (view === 'requests') loadRequests();
        else loadProducts();
    }, [view]);

    const filteredRequests = requests.filter(r => {
        if (requestFilter === 'active') return ['pending', 'accepted'].includes(r.status);
        if (requestFilter === 'history') return ['fulfilled', 'declined'].includes(r.status);
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
            Alert.alert('Нет доступа', 'Пожалуйста, разрешите доступ к фото');
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
            Alert.alert('Ошибка', 'Пожалуйста, введите сообщение');
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
            Alert.alert('Успешно', 'Ответ отправлен клиенту!');
            loadRequests();
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось отправить ответ');
        }
    };

    const handleUpdateStatus = async (requestId, newStatus) => {
        const statusText = newStatus === 'fulfilled' ? 'выполнено' : 'отклонено';
        try {
            await client.patch(`/api/requests/${requestId}/update_status/`, { status: newStatus });
            Alert.alert('Успешно', `Заявка отмечена как ${statusText}`);
            loadRequests();
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
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
            'Удалить товар',
            'Вы уверены, что хотите удалить этот товар?',
            [
                { text: 'Отмена', style: 'cancel' },
                {
                    text: 'Удалить',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await client.delete(`/api/catalog/products/${productId}/`);
                            Alert.alert('Успешно', 'Товар удалён');
                            loadProducts();
                        } catch (e) {
                            Alert.alert('Ошибка', 'Не удалось удалить товар');
                        }
                    }
                }
            ]
        );
    };

    const handleAddProduct = async () => {
        if (!productForm.name || !productForm.price || !productForm.unit) {
            Alert.alert('Ошибка', 'Заполните название, цену и единицу измерения');
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
                Alert.alert('Успешно', 'Товар обновлён!');
            } else {
                await client.post('/api/catalog/products/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                Alert.alert('Успешно', 'Товар добавлен!');
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
            Alert.alert('Ошибка', 'Не удалось сохранить товар');
        }
    };

    const handleToggleAvailability = async (product) => {
        try {
            await client.patch(`/api/catalog/products/${product.id}/`, {
                is_available: !product.is_available,
            });
            loadProducts();
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось обновить товар');
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

    const getStatusText = (status) => {
        const texts = {
            pending: 'Ожидает',
            accepted: 'Принято',
            declined: 'Отклонено',
            fulfilled: 'Выполнено',
        };
        return texts[status] || status;
    };

    const renderRequest = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedRequestDetail(item)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Заявка #{item.id}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.badgeText}>{getStatusText(item.status)}</Text>
                </View>
            </View>
            <Text style={styles.cardSubtitle}>От: {item.client_name}</Text>
            <Text style={styles.cardSubtitle}>Товаров: {item.items?.length || 0}</Text>
            {item.total_price && (
                <Text style={styles.cardSubtitle}>
                    Итого: {parseInt(item.total_price).toLocaleString('ru-RU')} ₸
                </Text>
            )}
            {item.delivery_address ? (
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                    Адрес: {item.delivery_address}
                </Text>
            ) : null}
            {item.desired_delivery_date ? (
                <Text style={styles.cardSubtitle}>
                    Дата: {new Date(item.desired_delivery_date).toLocaleDateString('ru-RU')}
                </Text>
            ) : null}
            {item.note ? (
                <Text style={styles.note}>Заметка: {item.note}</Text>
            ) : null}

            {item.response && (
                <View style={styles.responseBox}>
                    <Text style={styles.responseTitle}>Ваш ответ:</Text>
                    <Text style={styles.responseText} numberOfLines={2}>
                        {item.response.message}
                    </Text>
                </View>
            )}

            {item.status === 'pending' && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleRespond(item);
                        }}
                    >
                        <Text style={styles.actionText}>Ответить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(item.id, 'declined');
                        }}
                    >
                        <Text style={styles.actionText}>Отклонить</Text>
                    </TouchableOpacity>
                </View>
            )}

            {item.status === 'accepted' && (
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#6366F1', marginTop: 8 }]}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleUpdateStatus(item.id, 'fulfilled');
                    }}
                >
                    <Text style={styles.actionText}>Отметить как выполнено</Text>
                </TouchableOpacity>
            )}
            <Text style={styles.tapHint}>Нажмите для подробностей →</Text>
        </TouchableOpacity>
    );

    const renderProduct = ({ item }) => {
        const isLowStock = item.stock_quantity <= 10;
        const isOutOfStock = item.stock_quantity === 0;

        return (
            <View style={styles.card}>
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
                            {item.is_available ? 'В наличии' : 'Нет в наличии'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.cardSubtitle}>{item.description}</Text>
                <Text style={styles.price}>
                    {parseInt(item.price).toLocaleString('ru-RU')} ₸ / {item.unit}
                </Text>
                <View style={styles.stockRow}>
                    <Text style={styles.stockLabel}>Остаток:</Text>
                    <Text style={[
                        styles.stockValue,
                        isOutOfStock && styles.stockOut,
                        isLowStock && !isOutOfStock && styles.stockLow,
                        !isLowStock && styles.stockOk,
                    ]}>
                        {item.stock_quantity} {item.unit}
                    </Text>
                </View>
                {isOutOfStock && (
                    <View style={styles.stockWarning}>
                        <Text style={styles.stockWarningText}>⚠️ Товар закончился</Text>
                    </View>
                )}
                {isLowStock && !isOutOfStock && (
                    <View style={[styles.stockWarning, { backgroundColor: '#FFF8E7' }]}>
                        <Text style={[styles.stockWarningText, { color: '#F59E0B' }]}>
                            ⚠️ Мало товара
                        </Text>
                    </View>
                )}
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#4F46E5' }]}
                        onPress={() => handleEditProduct(item)}
                    >
                        <Text style={styles.actionText}>Изменить</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                        onPress={() => handleDeleteProduct(item.id)}
                    >
                        <Text style={styles.actionText}>Удалить</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {user?.company_name || user?.username}
                </Text>
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setShowProfile(true)}>
                        <Ionicons name="person-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowAnalytics(true)}>
                        <Ionicons name="bar-chart-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowNotifications(true)}>
                        <Ionicons name="notifications-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, view === 'requests' && styles.tabActive]}
                    onPress={() => setView('requests')}
                >
                    <Text style={[styles.tabText, view === 'requests' && styles.tabTextActive]}>
                        Заявки
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, view === 'products' && styles.tabActive]}
                    onPress={() => setView('products')}
                >
                    <Text style={[styles.tabText, view === 'products' && styles.tabTextActive]}>
                        Мои товары
                    </Text>
                </TouchableOpacity>
            </View>

            {view === 'requests' && (
                <View style={styles.filterBar}>
                    <TouchableOpacity
                        style={[styles.filterBtn, requestFilter === 'active' && styles.filterBtnActive]}
                        onPress={() => setRequestFilter('active')}
                    >
                        <Text style={[styles.filterBtnText, requestFilter === 'active' && styles.filterBtnTextActive]}>
                            Активные
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtn, requestFilter === 'all' && styles.filterBtnActive]}
                        onPress={() => setRequestFilter('all')}
                    >
                        <Text style={[styles.filterBtnText, requestFilter === 'all' && styles.filterBtnTextActive]}>
                            Все
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterBtn, requestFilter === 'history' && styles.filterBtnActive]}
                        onPress={() => setRequestFilter('history')}
                    >
                        <Text style={[styles.filterBtnText, requestFilter === 'history' && styles.filterBtnTextActive]}>
                            История
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <ActivityIndicator style={styles.loader} size="large" color="#4F46E5" />
            ) : (
                <FlatList
                    data={view === 'requests' ? filteredRequests : products}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={view === 'requests' ? renderRequest : renderProduct}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>
                            {view === 'requests'
                                ? requestFilter === 'history'
                                    ? 'История заявок пуста'
                                    : requestFilter === 'active'
                                    ? 'Нет активных заявок'
                                    : 'Заявок пока нет'
                                : 'Товаров пока нет'}
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
                    <Text style={styles.fabText}>+ Добавить товар</Text>
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
                                <Text style={styles.modalTitle}>Ответить на заявку</Text>
                                <Text style={styles.modalSubtitle}>
                                    Заявка #{selectedRequest?.id} — {selectedRequest?.items?.length || 0} товаров
                                </Text>
                                {selectedRequest?.total_price && (
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Сумма заявки:</Text>
                                        <Text style={styles.totalValue}>
                                            {parseInt(selectedRequest.total_price).toLocaleString('ru-RU')} ₸
                                        </Text>
                                    </View>
                                )}
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Ваше сообщение клиенту"
                                    value={message}
                                    onChangeText={setMessage}
                                    multiline
                                    numberOfLines={3}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Предложить цену (необязательно)"
                                    value={offeredPrice}
                                    onChangeText={setOfferedPrice}
                                    keyboardType="numeric"
                                />
                                <TouchableOpacity
                                    style={styles.button}
                                    onPress={handleSubmitResponse}
                                >
                                    <Text style={styles.buttonText}>Отправить ответ</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        setResponseModal(false);
                                    }}
                                >
                                    <Text style={styles.cancelText}>Отмена</Text>
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
                                {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
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
                                    <Text style={styles.imagePickerText}>📷 Добавить фото</Text>
                                )}
                            </TouchableOpacity>
                            <TextInput
                                style={styles.input}
                                placeholder="Название товара *"
                                value={productForm.name}
                                onChangeText={(v) => setProductForm(p => ({ ...p, name: v }))}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Описание"
                                value={productForm.description}
                                onChangeText={(v) => setProductForm(p => ({ ...p, description: v }))}
                                multiline
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Цена (₸) *"
                                value={productForm.price}
                                onChangeText={(v) => setProductForm(p => ({ ...p, price: v }))}
                                keyboardType="numeric"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Единица (кг, шт, упак) *"
                                value={productForm.unit}
                                onChangeText={(v) => setProductForm(p => ({ ...p, unit: v }))}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Количество на складе"
                                value={productForm.stock_quantity}
                                onChangeText={(v) => setProductForm(p => ({ ...p, stock_quantity: v }))}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleAddProduct}
                            >
                                <Text style={styles.buttonText}>
                                    {editingProduct ? 'Сохранить изменения' : 'Добавить товар'}
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
                                <Text style={styles.cancelText}>Отмена</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {selectedRequestDetail && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <RequestDetailScreen
                        request={selectedRequestDetail}
                        onClose={() => setSelectedRequestDetail(null)}
                        onUpdate={() => {
                            loadRequests();
                            setSelectedRequestDetail(null);
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

            {showAnalytics && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <AnalyticsScreen onClose={() => setShowAnalytics(false)} />
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
    filterBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 8,
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    filterBtn: {
        flex: 1,
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    filterBtnActive: { backgroundColor: '#4F46E5' },
    filterBtnText: { fontSize: 13, color: '#666', fontWeight: '600' },
    filterBtnTextActive: { color: '#fff' },
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
    tapHint: {
        fontSize: 12,
        color: '#4F46E5',
        marginTop: 10,
        textAlign: 'right',
    },
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
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f0f4ff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    totalLabel: { fontSize: 14, color: '#666' },
    totalValue: { fontSize: 15, fontWeight: '600', color: '#4F46E5' },
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
    placeholderText: { color: '#999', fontSize: 14 },
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
    imagePickerText: { color: '#999', fontSize: 16 },
    stockRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    stockLabel: { fontSize: 13, color: '#666' },
    stockValue: { fontSize: 15, fontWeight: '700' },
    stockOk: { color: '#10B981' },
    stockLow: { color: '#F59E0B' },
    stockOut: { color: '#EF4444' },
    stockWarning: {
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        padding: 8,
        marginTop: 6,
        alignItems: 'center',
    },
    stockWarningText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
});