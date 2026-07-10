import React, { useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, Alert, TextInput, ScrollView,
    ActivityIndicator, Image, Modal,
    KeyboardAvoidingView, Platform,
    TouchableWithoutFeedback, Keyboard
} from 'react-native';
import { useCart } from '../context/CartContext';
import client from '../api/client';
import { InputField, Button } from '../components/UI';
import { colors, spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';
import Icon from '../components/Icon';
import { OpenAddressInMap } from '../components/AddressMap';
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

    const getSupplierTotal = (items) =>
        items.reduce((t, i) => t + parseFloat(i.product.price) * i.quantity, 0);

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
            Alert.alert('Заявка отправлена', `Поставщик ${selectedSupplier.supplier.name} получил вашу заявку`);
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
                activeOpacity={0.7}
            >
                {item.product.image ? (
                    <Image
                        source={{ uri: item.product.image }}
                        style={styles.itemImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.itemImagePlaceholder}>
                        <Icon name="image" size={20} color={colors.textTertiary} />
                    </View>
                )}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                    <Text style={styles.itemPrice}>
                        {parseInt(item.product.price).toLocaleString('ru-RU')} ₸ / {item.product.unit}
                    </Text>
                    <Text style={styles.itemTotal}>
                        {(parseInt(item.product.price) * item.quantity).toLocaleString('ru-RU')} ₸
                    </Text>
                </View>
            </TouchableOpacity>
            <View style={styles.quantityControl}>
                <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(supplierId, item.product.id, item.quantity - 1)}
                >
                    <Icon name="minus" size={14} color={colors.primary} />
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
                    <Icon name="plus" size={14} color={colors.primary} />
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
                        style={styles.clearBtn}
                        onPress={() => Alert.alert(
                            'Очистить корзину',
                            `Удалить все товары поставщика ${supplierGroup.supplier.name}?`,
                            [
                                { text: 'Отмена', style: 'cancel' },
                                { text: 'Удалить', style: 'destructive', onPress: () => clearSupplierCart(supplierId) }
                            ]
                        )}
                    >
                        <Icon name="trash" size={16} color={colors.danger} />
                    </TouchableOpacity>
                </View>

                {supplierGroup.items.map(item => renderItem(supplierId, item))}

                <View style={styles.supplierFooter}>
                    <View>
                        <Text style={styles.supplierTotalLabel}>Итого</Text>
                        <Text style={styles.supplierTotal}>
                            {total.toLocaleString('ru-RU')} ₸
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.orderBtn}
                        onPress={() => handleCheckout(supplierGroup)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.orderBtnText}>Оформить заявку</Text>
                        <Icon name="chevronRight" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                    <Icon name="chevronLeft" size={22} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Корзина</Text>
                    {totalItems > 0 && (
                        <Text style={styles.headerSub}>{totalItems} товар(ов)</Text>
                    )}
                </View>
                <View style={styles.headerBtn} />
            </View>

            {supplierGroups.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBox}>
                        <Icon name="cart" size={36} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.emptyTitle}>Корзина пуста</Text>
                    <Text style={styles.emptySubtitle}>
                        Добавьте товары из каталога поставщиков
                    </Text>
                    <TouchableOpacity style={styles.browseBtn} onPress={onClose}>
                        <Text style={styles.browseBtnText}>Перейти к товарам</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={supplierGroups}
                    keyExtractor={(item) => item.supplier.id.toString()}
                    renderItem={renderSupplierGroup}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Checkout Modal */}
            <Modal visible={checkoutModal} transparent animationType="slide">
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                                <View style={styles.modalContent}>
                                    <View style={styles.modalHandle} />
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
                                                <Text style={styles.summaryQty}>×{item.quantity}</Text>
                                                <Text style={styles.summaryPrice}>
                                                    {(parseInt(item.product.price) * item.quantity).toLocaleString('ru-RU')} ₸
                                                </Text>
                                            </View>
                                        ))}
                                        <View style={styles.summaryTotalRow}>
                                            <Text style={styles.summaryTotalLabel}>Итого</Text>
                                            <Text style={styles.summaryTotal}>
                                                {getSupplierTotal(selectedSupplier?.items || []).toLocaleString('ru-RU')} ₸
                                            </Text>
                                        </View>
                                    </View>

                                    <InputField
                                        label="Адрес доставки *"
                                        value={deliveryAddress}
                                        onChangeText={setDeliveryAddress}
                                        placeholder="Введите адрес доставки"
                                        multiline
                                        numberOfLines={2}
                                        autoCapitalize="sentences"
                                        autoCorrect
                                    />
                                    <OpenAddressInMap address={deliveryAddress} />
                                    <InputField
                                        label="Желаемая дата доставки"
                                        value={deliveryDate}
                                        onChangeText={setDeliveryDate}
                                        placeholder="ГГГГ-ММ-ДД"
                                        keyboardType="numeric"
                                    />
                                    <InputField
                                        label="Контактный телефон"
                                        value={contactPhone}
                                        onChangeText={setContactPhone}
                                        placeholder="+7 (___) ___-__-__"
                                        keyboardType="phone-pad"
                                    />
                                    <InputField
                                        label="Заметка для поставщика"
                                        value={note}
                                        onChangeText={setNote}
                                        placeholder="Дополнительные пожелания..."
                                        multiline
                                        numberOfLines={3}
                                        autoCapitalize="sentences"
                                        autoCorrect
                                    />

                                    <Button
                                        label="Отправить заявку"
                                        onPress={handleSubmitOrder}
                                        loading={loading}
                                    />
                                    <Button
                                        label="Отмена"
                                        onPress={() => {
                                            Keyboard.dismiss();
                                            setCheckoutModal(false);
                                        }}
                                        variant="ghost"
                                        style={{ marginTop: spacing.sm }}
                                    />
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
                        onAddToCart={() => setSelectedProduct(null)}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
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
    headerBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
    list: { padding: spacing.lg },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxxl,
    },
    emptyIconBox: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
    emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
    browseBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.md,
        borderRadius: radius.full,
    },
    browseBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    supplierGroup: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        marginBottom: spacing.lg,
        overflow: 'hidden',
        ...shadow.sm,
    },
    supplierHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.primaryLight,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    supplierAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    supplierAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    supplierName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
    clearBtn: { padding: spacing.xs },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    itemClickable: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
    },
    itemImage: {
        width: 64,
        height: 64,
        borderRadius: radius.md,
        marginRight: spacing.md,
    },
    itemImagePlaceholder: {
        width: 64,
        height: 64,
        borderRadius: radius.md,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    itemInfo: { flex: 1 },
    itemName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
    itemPrice: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
    itemTotal: { fontSize: 13, fontWeight: '700', color: colors.primary },
    quantityControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginLeft: spacing.md,
    },
    qtyBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyInput: {
        width: 40,
        height: 32,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.sm,
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        padding: 0,
    },
    supplierFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    supplierTotalLabel: { fontSize: 12, color: colors.textSecondary },
    supplierTotal: { fontSize: 20, fontWeight: '800', color: colors.text },
    orderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        gap: spacing.xs,
    },
    orderBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
    modalTitle: { ...typography.h2, marginBottom: spacing.xs },
    modalSubtitle: { ...typography.bodySmall, color: colors.primary, marginBottom: spacing.xl },
    orderSummary: {
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    summaryName: { flex: 1, fontSize: 13, color: colors.textSecondary },
    summaryQty: { fontSize: 13, color: colors.textTertiary, marginHorizontal: spacing.sm },
    summaryPrice: { fontSize: 13, fontWeight: '600', color: colors.text },
    summaryTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    summaryTotal: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
