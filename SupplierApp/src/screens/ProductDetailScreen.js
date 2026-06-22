import React from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Image, Dimensions
} from 'react-native';
import { useCart } from '../context/CartContext';

const screenWidth = Dimensions.get('window').width;

export default function ProductDetailScreen({ product, onClose, onAddToCart }) {
    const { addToCart } = useCart();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.back}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Товар</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {product.image ? (
                    <Image
                        source={{ uri: product.image }}
                        style={styles.image}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderText}>Нет фото</Text>
                    </View>
                )}

                <View style={styles.body}>
                    {/* Name and price */}
                    <View style={styles.titleRow}>
                        <Text style={styles.name}>{product.name}</Text>
                        <View style={[
                            styles.availableBadge,
                            { backgroundColor: product.is_available ? '#10B981' : '#EF4444' }
                        ]}>
                            <Text style={styles.availableText}>
                                {product.is_available ? 'В наличии' : 'Нет в наличии'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.price}>
                        {parseInt(product.price).toLocaleString('ru-RU')} ₸
                        <Text style={styles.unit}> / {product.unit}</Text>
                    </Text>

                    {/* Supplier */}
                    <View style={styles.supplierBox}>
                        <View style={styles.supplierAvatar}>
                            <Text style={styles.supplierAvatarText}>
                                {product.supplier_name?.[0]?.toUpperCase()}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.supplierLabel}>Поставщик</Text>
                            <Text style={styles.supplierName}>{product.supplier_name}</Text>
                        </View>
                    </View>

                    {/* Description */}
                    {product.description ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Описание</Text>
                            <Text style={styles.description}>{product.description}</Text>
                        </View>
                    ) : null}

                    {/* Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Детали</Text>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Единица измерения</Text>
                            <Text style={styles.detailValue}>{product.unit}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Категория</Text>
                            <Text style={styles.detailValue}>
                                {product.category_name || '—'}
                            </Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Цена</Text>
                            <Text style={styles.detailValue}>
                                {parseInt(product.price).toLocaleString('ru-RU')} ₸ / {product.unit}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Add to cart button */}
            {product.is_available && (
                <View style={styles.footer}>
                    <View style={styles.footerPrice}>
                        <Text style={styles.footerPriceLabel}>Цена</Text>
                        <Text style={styles.footerPriceValue}>
                            {parseInt(product.price).toLocaleString('ru-RU')} ₸ / {product.unit}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => onAddToCart(product)}
                    >
                        <Text style={styles.cartButtonText}>В корзину</Text>
                    </TouchableOpacity>
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
    image: {
        width: screenWidth,
        height: 280,
    },
    imagePlaceholder: {
        width: screenWidth,
        height: 280,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePlaceholderText: { color: '#999', fontSize: 16 },
    body: { padding: 16 },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
        flex: 1,
        marginRight: 12,
    },
    availableBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    availableText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    price: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4F46E5',
        marginBottom: 16,
    },
    unit: {
        fontSize: 16,
        fontWeight: '400',
        color: '#666',
    },
    supplierBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    supplierAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    supplierAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    supplierLabel: { fontSize: 12, color: '#999' },
    supplierName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4F46E5',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    detailLabel: { fontSize: 14, color: '#666' },
    detailValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 12,
    },
    footerPrice: { flex: 1 },
    footerPriceLabel: { fontSize: 12, color: '#999' },
    footerPriceValue: { fontSize: 16, fontWeight: 'bold', color: '#4F46E5' },
    cartButton: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    cartButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});