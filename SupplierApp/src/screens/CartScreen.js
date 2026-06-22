import React, { useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, Alert, TextInput, ScrollView,
    ActivityIndicator, Image,
    KeyboardAvoidingView, Platform,
    TouchableWithoutFeedback, Keyboard, Modal
} from 'react-native';
import { useCart } from '../context/CartContext';
import client from '../api/client';
import ProductDetailScreen from './ProductDetailScreen';

export default function CartScreen({ onClose }) {
    const { cart, removeFromCart, updateQuantity, clearSupplierCart } = useCart();
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [checkoutModal, setCheckoutModal] = useState(false);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const supplierGroups = Object.values(cart);
    const totalItems = supplierGroups.reduce((t, s) => t + s.items.length, 0);

    const getSupplierTotal = (items) => {
        return items.reduce((t, i) => t + parseFloat(i.product.price) * i.quantity, 0);
    };

    const handleCheckout = (supplierGroup) => {
        setSelectedSupplier(supplierGroup);
        setCheckoutModal(true);
    };

    const handleSubmitOrder = async () => {
        if (!deliveryAddress) {
            Alert.alert('Ошибка', 'Введите адрес доставки');
            return;
        }
        setLoading(true);
        try {
            await client.post('/api/requests/', {
                items: selectedSupplier.items.map(i => ({
                    product_id: i.product.id,
                    quantity: i.quantity,
                })),
                delivery_address: deliveryAddress,
                desired_delivery_date: deliveryDate || null,
                contact_phone: contactPhone,
                note,
            });

            clearSupplierCart(selectedSupplier.supplier.id.toString());
            setCheckoutModal(false);
            setDeliveryAddress('');
            setDeliveryDate('');
            setContactPhone('');
            setNote('');
            Alert.alert(
                'Заявка отправлена!',
                `Ваша заявка поставщику ${selectedSupplier.supplier.name} успешно отправлена.`
            );
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось отправить заявку');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = (supplierId, item) => (
        <View key={item.product.id} style={styles.cartItem}>
            <TouchableOpacity
                style={styles.itemClickable}
                onPress={() => setSelectedProduct(item.product)}
            >
                {item.product.image ? (
                    <Image
                        source={{ uri: item.product.image }}
                        style={styles.itemImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.itemImagePlaceholder}>
                        <Text style={styles.placeholderText}>Нет фото</Text>
                    </View>
                )}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product.name}</Text>
                    <Text style={styles.itemPrice}>
                        {parseInt(item.product.price).toLocaleString('ru-RU')} ₸ / {item.product.unit}
                    </Text>
                    <Text style={styles.itemTotal}>
                        Итого: {(parseInt(item.product.price) * item.quantity).toLocaleString('ru-RU')} ₸
                    </Text>
                </View>
            </TouchableOpacity>
            <View style={styles.quantityControl}>
                <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(supplierId, item.product.id, item.quantity - 1)}
                >
                    <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <TextInput
                    style={styles.qtyInput}
                    value={item.quantity.toString()}
                    onChangeText={(v) => {
                        const num = parseInt(v);
                        if (!isNaN(num) && num > 0) {
                            updateQuantity(supplierId, item.product.id, num);
                        } else if (v === '') {
                            updateQuantity(supplierId, item.product.id, 1);
                        }
                    }}
                    keyboardType="numeric"
                    textAlign="center"
                />
                <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(supplierId, item.product.id, item.quantity + 1)}
                >
                    <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSupplierGroup = ({ item: supplierGroup }) => {
        const supplierId = supplierGroup.supplier.id.toString();
        const total = getSupplierTotal(supplierGroup.items);

        return (
            <View style={styles.supplierGroup}>
                <View style={styles.supplierHeader}>
                    <View style={styles.supplierAvatar}>
                        <Text style={styles.supplierAvatarText}>
                            {supplierGroup.supplier.name?.[0]?.toUpperCase() || 'П'}
                        </Text>
                    </View>
                    <Text style={styles.supplierName}>{supplierGroup.supplier.name}</Text>
                    <TouchableOpacity
                        onPress={() => Alert.alert(
                            'Очистить',
                            `Удалить все товары поставщика ${supplierGroup.supplier.name}?`,
                            [
                                { text: 'Отмена', style: 'cancel' },
                                { text: 'Удалить', style: 'destructive', onPress: () => clearSupplierCart(supplierId) }
                            ]
                        )}
                    >
                        <Text style={styles.clearText}>Очистить</Text>
                    </TouchableOpacity>
                </View>

                {supplierGroup.items.map(item => renderItem(supplierId, item))}

                <View style={styles.supplierFooter}>
                    <View>
                        <Text style={styles.supplierTotalLabel}>Итого по заявке:</Text>
                        <Text style={styles.supplierTotal}>
                            {total.toLocaleString('ru-RU')} ₸
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.orderBtn}
                        onPress={() => handleCheckout(supplierGroup)}
                    >
                        <Text style={styles.orderBtnText}>Оформить заявку</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.back}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    Корзина {totalItems > 0 ? `(${totalItems})` : ''}
                </Text>
                <View style={{ width: 60 }} />
            </View>

            {supplierGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>🛒</Text>
                    <Text style={styles.emptyTitle}>Корзина пуста</Text>
                    <Text style={styles.emptySubtitle}>
                        Добавьте товары из каталога
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={supplierGroups}
                    keyExtractor={(item) => item.supplier.id.toString()}
                    renderItem={renderSupplierGroup}
                    contentContainerStyle={styles.list}
                />
            )}

            {/* Checkout Modal */}
            <Modal visible={checkoutModal} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <ScrollView>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>Оформление заявки</Text>
                                    <Text style={styles.modalSubtitle}>
                                        {selectedSupplier?.supplier.name}
                                    </Text>

                                    <View style={styles.orderSummary}>
                                        {selectedSupplier?.items.map(item => (
                                            <View key={item.product.id} style={styles.summaryRow}>
                                                <Text style={styles.summaryName} numberOfLines={1}>
                                                    {item.product.name}
                                                </Text>
                                                <Text style={styles.summaryQty}>x{item.quantity}</Text>
                                                <Text style={styles.summaryPrice}>
                                                    {(parseInt(item.product.price) * item.quantity).toLocaleString('ru-RU')} ₸
                                                </Text>
                                            </View>
                                        ))}
                                        <View style={styles.summaryTotalRow}>
                                            <Text style={styles.summaryTotalLabel}>Итого:</Text>
                                            <Text style={styles.summaryTotal}>
                                                {getSupplierTotal(selectedSupplier?.items || []).toLocaleString('ru-RU')} ₸
                                            </Text>
                                        </View>
                                    </View>

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Адрес доставки *"
                                        value={deliveryAddress}
                                        onChangeText={setDeliveryAddress}
                                        multiline
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Желаемая дата доставки (ГГГГ-ММ-ДД)"
                                        value={deliveryDate}
                                        onChangeText={setDeliveryDate}
                                    />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Контактный телефон"
                                        value={contactPhone}
                                        onChangeText={setContactPhone}
                                        keyboardType="phone-pad"
                                    />
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Заметка (необязательно)"
                                        value={note}
                                        onChangeText={setNote}
                                        multiline
                                        numberOfLines={3}
                                    />

                                    <TouchableOpacity
                                        style={styles.submitBtn}
                                        onPress={handleSubmitOrder}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text style={styles.submitBtnText}>Отправить заявку</Text>
                                        }
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setCheckoutModal(false);
                                        }}
                                    >
                                        <Text style={styles.cancelText}>Отмена</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
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
                        }}
                    />
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
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    back: { color: '#fff', fontSize: 14 },
    list: { padding: 12 },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#999', textAlign: 'center' },
    supplierGroup: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    supplierHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#f0f4ff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e8ff',
    },
    supplierAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    supplierAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    supplierName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
    clearText: { color: '#EF4444', fontSize: 13 },
    cartItem: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    itemImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    itemImagePlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    placeholderText: { fontSize: 10, color: '#999' },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    itemPrice: { fontSize: 12, color: '#666', marginTop: 2 },
    itemTotal: { fontSize: 13, fontWeight: '600', color: '#4F46E5', marginTop: 2 },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    qtyBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyBtnText: { color: '#fff', fontSize: 18, fontWeight: '600', lineHeight: 20 },
    qtyValue: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center' },
    supplierFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#f9f9f9',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    qtyInput: {
        borderWidth: 1,
        borderColor: '#4F46E5',
        borderRadius: 6,
        width: 48,
        height: 32,
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        textAlign: 'center',
        padding: 0,
    },
    supplierTotalLabel: { fontSize: 13, color: '#666' },
    supplierTotal: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    orderBtn: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    orderBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
    modalSubtitle: { fontSize: 14, color: '#4F46E5', marginBottom: 16 },
    orderSummary: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    summaryName: { flex: 1, fontSize: 13, color: '#444' },
    summaryQty: { fontSize: 13, color: '#666', marginHorizontal: 8 },
    summaryPrice: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
    summaryTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    summaryTotalLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
    summaryTotal: { fontSize: 15, fontWeight: 'bold', color: '#4F46E5' },
    input: {
        borderWidth: 1,
        borderColor: '#c4c4c4',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    submitBtn: {
        backgroundColor: '#4F46E5',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    submitBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    cancelButton: { alignItems: 'center', padding: 12 },
    cancelText: { color: '#666', fontSize: 16 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    itemClickable: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
    },
});