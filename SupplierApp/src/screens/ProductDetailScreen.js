import React from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Image, Dimensions
} from 'react-native';
import { colors, spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';
import Icon from '../components/Icon';
import { Button } from '../components/UI';

const screenWidth = Dimensions.get('window').width;

export default function ProductDetailScreen({ product, onClose, onAddToCart, onSupplierPress }) {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                    <Icon name="chevronLeft" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
                <View style={styles.headerBtn} />
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
                        <Icon name="image" size={48} color={colors.textTertiary} />
                        <Text style={styles.imagePlaceholderText}>Нет фото</Text>
                    </View>
                )}

                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <Text style={styles.name}>{product.name}</Text>
                        <View style={[
                            styles.availableBadge,
                            { backgroundColor: product.is_available ? '#DCFCE7' : '#FEE2E2' }
                        ]}>
                            <Text style={[
                                styles.availableText,
                                { color: product.is_available ? colors.success : colors.danger }
                            ]}>
                                {product.is_available ? 'В наличии' : 'Нет в наличии'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.priceRow}>
                        <Text style={styles.price}>
                            {parseInt(product.price).toLocaleString('ru-RU')} ₸
                        </Text>
                        <Text style={styles.unit}>/ {product.unit}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.supplierBox}
                        onPress={() => onSupplierPress && onSupplierPress(product.supplier)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.supplierAvatar}>
                            <Text style={styles.supplierAvatarText}>
                                {product.supplier_name?.[0]?.toUpperCase()}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.supplierLabel}>Поставщик</Text>
                            <Text style={styles.supplierName}>{product.supplier_name}</Text>
                        </View>
                        <Icon name="chevronRight" size={18} color={colors.primary} />
                    </TouchableOpacity>

                    {product.description ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Описание</Text>
                            <Text style={styles.description}>{product.description}</Text>
                        </View>
                    ) : null}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Детали товара</Text>
                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Icon name="layers" size={14} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.detailLabel}>Единица измерения</Text>
                            <Text style={styles.detailValue}>{product.unit}</Text>
                        </View>
                        {product.category_name ? (
                            <View style={styles.detailRow}>
                                <View style={styles.detailIcon}>
                                    <Icon name="filter" size={14} color={colors.textTertiary} />
                                </View>
                                <Text style={styles.detailLabel}>Категория</Text>
                                <Text style={styles.detailValue}>{product.category_name}</Text>
                            </View>
                        ) : null}
                        <View style={styles.detailRow}>
                            <View style={styles.detailIcon}>
                                <Icon name="trending_up" size={14} color={colors.textTertiary} />
                            </View>
                            <Text style={styles.detailLabel}>Цена</Text>
                            <Text style={[styles.detailValue, { color: colors.primary }]}>
                                {parseInt(product.price).toLocaleString('ru-RU')} ₸ / {product.unit}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {product.is_available && (
                <View style={styles.footer}>
                    <View style={styles.footerPrice}>
                        <Text style={styles.footerPriceLabel}>Цена за единицу</Text>
                        <Text style={styles.footerPriceValue}>
                            {parseInt(product.price).toLocaleString('ru-RU')} ₸ / {product.unit}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.cartButton}
                        onPress={() => onAddToCart(product)}
                        activeOpacity={0.8}
                    >
                        <Icon name="cart" size={18} color="#fff" />
                        <Text style={styles.cartButtonText}>В корзину</Text>
                    </TouchableOpacity>
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
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },
    image: { width: screenWidth, height: 300 },
    imagePlaceholder: {
        width: screenWidth,
        height: 240,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    imagePlaceholderText: { ...typography.bodySmall },
    body: { padding: spacing.lg },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    name: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1, marginRight: spacing.md },
    availableBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        flexShrink: 0,
    },
    availableText: { fontSize: 12, fontWeight: '600' },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.xl,
        gap: spacing.xs,
    },
    price: { fontSize: 28, fontWeight: '800', color: colors.primary },
    unit: { fontSize: 16, color: colors.textSecondary },
    supplierBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadow.sm,
    },
    supplierAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    supplierAvatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
    supplierLabel: { fontSize: 11, color: colors.textTertiary, marginBottom: 2 },
    supplierName: { fontSize: 15, fontWeight: '600', color: colors.text },
    section: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadow.sm,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    description: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    detailIcon: { width: 24, marginRight: spacing.sm },
    detailLabel: { flex: 1, fontSize: 14, color: colors.textSecondary },
    detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.lg,
        paddingBottom: spacing.xl,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.lg,
    },
    footerPrice: { flex: 1 },
    footerPriceLabel: { fontSize: 11, color: colors.textTertiary },
    footerPriceValue: { fontSize: 15, fontWeight: '700', color: colors.primary },
    cartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        gap: spacing.sm,
    },
    cartButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});