import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Image
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import client from '../api/client';
import { colors, spacing, radius, STATUS_TOP, shadow } from '../styles/theme';
import Icon from '../components/Icon';
import RequestDetailScreen from './RequestDetailScreen';

LocaleConfig.locales['ru'] = {
    monthNames: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
    monthNamesShort: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
    dayNames: ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'],
    dayNamesShort: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
    today: 'Сегодня'
};
LocaleConfig.defaultLocale = 'ru';

export default function SupplierHomeTab({ onRequestPress }) {

    const [products, setProducts] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [markedDates, setMarkedDates] = useState({});
    const [requestsByDate, setRequestsByDate] = useState({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [productsRes, requestsRes] = await Promise.all([
                client.get('/api/catalog/products/'),
                client.get('/api/requests/'),
            ]);
            const prods = productsRes.data.results || productsRes.data;
            const reqs = requestsRes.data.results || requestsRes.data;
            const sorted = [...prods].sort((a, b) => a.stock_quantity - b.stock_quantity);
            setProducts(sorted);
            setRequests(reqs);
            buildCalendarData(reqs);
        } catch (e) {
            console.log('Error loading home data:', e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => ({
        pending: colors.warning,
        accepted: colors.success,
        declined: colors.danger,
        fulfilled: colors.purple,
    }[status] || colors.textSecondary);

    const getStatusConfig = (status) => ({
        pending: { label: 'Ожидает', color: colors.warning, bg: '#FEF3C7', icon: 'clock' },
        accepted: { label: 'Принято', color: colors.success, bg: '#DCFCE7', icon: 'check' },
        declined: { label: 'Отклонено', color: colors.danger, bg: '#FEE2E2', icon: 'x' },
        fulfilled: { label: 'Выполнено', color: colors.purple, bg: '#EDE9FE', icon: 'truck' },
    }[status] || { label: status, color: colors.textSecondary, bg: colors.borderLight, icon: 'info' });

    const buildCalendarData = (data) => {
        const byDate = {};
        const marked = {};

        data.forEach(request => {
            const createdDate = request.created_at?.split('T')[0];
            const deliveryDate = request.desired_delivery_date;
            const displayDate = deliveryDate || createdDate;

            if (displayDate) {
                if (!byDate[displayDate]) byDate[displayDate] = [];
                byDate[displayDate].push({
                    ...request,
                    calendarDateType: deliveryDate ? 'delivery' : 'created'
                });
            }
        });

        Object.keys(byDate).forEach(date => {
            const statuses = [...new Set(byDate[date].map(r => r.status))];
            marked[date] = {
                dots: statuses.slice(0, 3).map(s => ({ key: s, color: getStatusColor(s) })),
                marked: true,
            };
        });

        setRequestsByDate(byDate);
        setMarkedDates(marked);
    };

    const handleDayPress = (day) => {
        const date = day.dateString;
        setSelectedDate(prev => prev === date ? null : date);
        setMarkedDates(prev => {
            const updated = {};
            Object.keys(prev).forEach(d => {
                updated[d] = { ...prev[d], selected: false };
            });
            if (updated[date]) {
                updated[date] = { ...updated[date], selected: true, selectedColor: colors.primary };
            } else {
                updated[date] = { selected: true, selectedColor: colors.primary };
            }
            return updated;
        });
    };

    const getStockStatus = (qty) => {
        if (qty === 0) return { label: 'Нет', color: colors.danger, bg: '#FEE2E2', icon: 'warning' };
        if (qty <= 5) return { label: 'Критично', color: colors.danger, bg: '#FEE2E2', icon: 'warning' };
        if (qty <= 10) return { label: 'Мало', color: colors.warning, bg: '#FEF3C7', icon: 'warning' };
        return { label: 'В норме', color: colors.success, bg: '#DCFCE7', icon: 'check' };
    };

    const selectedDateRequests = selectedDate ? (requestsByDate[selectedDate] || []) : [];
    const lowStockProducts = products.filter(p => p.stock_quantity <= 10);
    const outOfStockCount = products.filter(p => p.stock_quantity === 0).length;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Загрузка...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Stock alerts */}
                {lowStockProducts.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconBox, { backgroundColor: '#FEF3C7' }]}>
                                <Icon name="warning" size={16} color={colors.warning} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>Остатки на складе</Text>
                                <Text style={styles.sectionSub}>
                                    {outOfStockCount > 0
                                        ? `${outOfStockCount} товар(ов) закончилось`
                                        : `${lowStockProducts.length} товар(ов) заканчивается`}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={loadData}>
                                <Icon name="refresh" size={16} color={colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        {lowStockProducts.map((product) => {
                            const stockStatus = getStockStatus(product.stock_quantity);
                            const maxQty = 50;
                            const fillPercent = Math.min((product.stock_quantity / maxQty) * 100, 100);

                            return (
                                <View key={product.id} style={styles.stockItem}>
                                    {product.image ? (
                                        <Image source={{ uri: product.image }} style={styles.stockImage} resizeMode="cover" />
                                    ) : (
                                        <View style={[styles.stockImage, styles.stockImagePlaceholder]}>
                                            <Icon name="image" size={14} color={colors.textTertiary} />
                                        </View>
                                    )}
                                    <View style={styles.stockInfo}>
                                        <View style={styles.stockTopRow}>
                                            <Text style={styles.stockName} numberOfLines={1}>{product.name}</Text>
                                            <View style={[styles.stockBadge, { backgroundColor: stockStatus.bg }]}>
                                                <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
                                                    {product.stock_quantity} {product.unit}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.progressBar}>
                                            <View style={[styles.progressFill, { width: `${fillPercent}%`, backgroundColor: stockStatus.color }]} />
                                        </View>
                                        <Text style={[styles.stockStatusText, { color: stockStatus.color }]}>{stockStatus.label}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* All products sorted by stock */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIconBox, { backgroundColor: colors.primaryLight }]}>
                            <Icon name="layers" size={16} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Все товары по остаткам</Text>
                            <Text style={styles.sectionSub}>{products.length} товаров, по возрастанию</Text>
                        </View>
                    </View>

                    {products.slice(0, 8).map((product) => {
                        const stockStatus = getStockStatus(product.stock_quantity);
                        return (
                            <View key={product.id} style={styles.productRow}>
                                {product.image ? (
                                    <Image source={{ uri: product.image }} style={styles.productRowImage} resizeMode="cover" />
                                ) : (
                                    <View style={[styles.productRowImage, styles.productRowImagePlaceholder]}>
                                        <Icon name="image" size={14} color={colors.textTertiary} />
                                    </View>
                                )}
                                <View style={styles.productRowInfo}>
                                    <Text style={styles.productRowName} numberOfLines={1}>{product.name}</Text>
                                    <Text style={styles.productRowPrice}>
                                        {parseInt(product.price).toLocaleString('ru-RU')} ₸ / {product.unit}
                                    </Text>
                                </View>
                                <View style={[styles.stockQtyBadge, { backgroundColor: stockStatus.bg }]}>
                                    <Icon name={stockStatus.icon} size={11} color={stockStatus.color} />
                                    <Text style={[styles.stockQtyText, { color: stockStatus.color }]}>
                                        {product.stock_quantity}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}

                    {products.length > 8 && (
                        <View style={styles.moreRow}>
                            <Text style={styles.moreText}>
                                Ещё {products.length - 8} товаров — перейдите в «Мои товары»
                            </Text>
                        </View>
                    )}
                </View>

                {/* Calendar */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIconBox, { backgroundColor: '#EDE9FE' }]}>
                            <Icon name="calendar" size={16} color={colors.purple} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>Календарь заявок</Text>
                            <Text style={styles.sectionSub}>Даты доставки · {requests.length} заявок</Text>
                        </View>
                    </View>

                    <View style={styles.calendarWrapper}>
                        <Calendar
                            onDayPress={handleDayPress}
                            markedDates={markedDates}
                            markingType="multi-dot"
                            theme={{
                                backgroundColor: colors.card,
                                calendarBackground: colors.card,
                                textSectionTitleColor: colors.textTertiary,
                                selectedDayBackgroundColor: colors.primary,
                                selectedDayTextColor: '#fff',
                                todayTextColor: colors.primary,
                                dayTextColor: colors.text,
                                textDisabledColor: colors.textTertiary,
                                arrowColor: colors.primary,
                                monthTextColor: colors.text,
                                textDayFontWeight: '500',
                                textMonthFontWeight: '700',
                                textDayHeaderFontWeight: '600',
                                textDayFontSize: 14,
                                textMonthFontSize: 15,
                                textDayHeaderFontSize: 12,
                            }}
                        />
                    </View>

                    <View style={styles.legend}>
                        {[
                            { color: colors.warning, label: 'Ожидает' },
                            { color: colors.success, label: 'Принято' },
                            { color: colors.purple, label: 'Выполнено' },
                            { color: colors.danger, label: 'Отклонено' },
                        ].map(item => (
                            <View key={item.label} style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                                <Text style={styles.legendText}>{item.label}</Text>
                            </View>
                        ))}
                    </View>

                    {selectedDate && (
                        <View style={styles.selectedDateSection}>
                            <View style={styles.selectedDateHeader}>
                                <Icon name="calendar" size={14} color={colors.primary} />
                                <Text style={styles.selectedDateTitle}>{formatDate(selectedDate)}</Text>
                                <Text style={styles.selectedDateCount}>{selectedDateRequests.length} заявок</Text>
                            </View>

                            {selectedDateRequests.length === 0 ? (
                                <View style={styles.emptyDay}>
                                    <Icon name="info" size={16} color={colors.textTertiary} />
                                    <Text style={styles.emptyDayText}>Нет заявок на эту дату</Text>
                                </View>
                            ) : (
                                selectedDateRequests.map(request => {
                                    const sc = getStatusConfig(request.status);
                                    return (
                                        <TouchableOpacity
                                            key={`${request.id}-${request.calendarDateType}`}
                                            style={styles.calendarRequestCard}
                                            onPress={() => onRequestPress(request)}
                                            activeOpacity={0.7}
                                        >
                                            {request.calendarDateType === 'delivery' && (
                                                <View style={styles.deliveryBadge}>
                                                    <Icon name="truck" size={11} color={colors.primary} />
                                                    <Text style={styles.deliveryBadgeText}>Дата доставки</Text>
                                                </View>
                                            )}
                                            <View style={styles.calendarRequestTop}>
                                                <View>
                                                    <Text style={styles.calendarRequestId}>Заявка #{request.id}</Text>
                                                    <View style={styles.calendarRequestMeta}>
                                                        <Icon name="user" size={12} color={colors.textTertiary} />
                                                        <Text style={styles.calendarRequestMetaText}>{request.client_name}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                                                    <Icon name={sc.icon} size={11} color={sc.color} />
                                                    <Text style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</Text>
                                                </View>
                                            </View>
                                            {request.total_price && (
                                                <Text style={styles.calendarRequestTotal}>
                                                    {parseInt(request.total_price).toLocaleString('ru-RU')} ₸
                                                </Text>
                                            )}
                                            <View style={styles.calendarRequestFooter}>
                                                <Text style={styles.tapHint}>Открыть</Text>
                                                <Icon name="chevronRight" size={13} color={colors.primary} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    )}

                    {!selectedDate && (
                        <View style={styles.calendarHint}>
                            <Icon name="info" size={14} color={colors.textTertiary} />
                            <Text style={styles.calendarHintText}>
                                Нажмите на дату с точками, чтобы увидеть заявки
                            </Text>
                        </View>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* {selectedRequest && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <RequestDetailScreen
                        request={selectedRequest}
                        onClose={() => setSelectedRequest(null)}
                        onUpdate={() => { setSelectedRequest(null); loadData(); }}
                    />
                </View>
            )} */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
    loadingText: { fontSize: 14, color: colors.textSecondary },
    section: {
        backgroundColor: colors.card,
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        borderRadius: radius.xl,
        padding: spacing.lg,
        ...shadow.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    sectionIconBox: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    sectionSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    stockItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        gap: spacing.md,
    },
    stockImage: { width: 44, height: 44, borderRadius: radius.md, flexShrink: 0 },
    stockImagePlaceholder: {
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stockInfo: { flex: 1 },
    stockTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    stockName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, marginRight: spacing.sm },
    stockBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
        flexShrink: 0,
    },
    stockBadgeText: { fontSize: 11, fontWeight: '700' },
    progressBar: {
        height: 4,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    progressFill: { height: '100%', borderRadius: 2 },
    stockStatusText: { fontSize: 11, fontWeight: '600' },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        gap: spacing.md,
    },
    productRowImage: { width: 40, height: 40, borderRadius: radius.md, flexShrink: 0 },
    productRowImagePlaceholder: {
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    productRowInfo: { flex: 1 },
    productRowName: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 2 },
    productRowPrice: { fontSize: 12, color: colors.textSecondary },
    stockQtyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        flexShrink: 0,
    },
    stockQtyText: { fontSize: 12, fontWeight: '700' },
    moreRow: { paddingTop: spacing.md, alignItems: 'center' },
    moreText: { fontSize: 12, color: colors.textTertiary, textAlign: 'center' },
    calendarWrapper: {
        borderRadius: radius.lg,
        overflow: 'hidden',
        marginBottom: spacing.lg,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.lg,
        marginBottom: spacing.lg,
        justifyContent: 'center',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.textSecondary },
    selectedDateSection: { marginTop: spacing.sm },
    selectedDateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    selectedDateTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flex: 1 },
    selectedDateCount: { fontSize: 12, color: colors.textTertiary },
    emptyDay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
    },
    emptyDayText: { fontSize: 13, color: colors.textSecondary },
    deliveryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primaryLight,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
        marginBottom: spacing.sm,
    },
    deliveryBadgeText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
    calendarRequestCard: {
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    calendarRequestTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.xs,
    },
    calendarRequestId: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
    calendarRequestMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    calendarRequestMetaText: { fontSize: 12, color: colors.textSecondary },
    calendarRequestTotal: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    calendarRequestFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 2,
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    tapHint: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '600' },
    calendarHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
    },
    calendarHintText: { fontSize: 12, color: colors.textTertiary, flex: 1 },
});