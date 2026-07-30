import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Dimensions
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { STATUS_TOP } from '../styles/theme';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen({ onClose }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30);

    const periods = [
        { label: '7 дней', value: 7 },
        { label: '30 дней', value: 30 },
        { label: '3 месяца', value: 90 },
        { label: 'Всё время', value: 365 },
    ];

    // Status colors intentionally stay on the fixed semantic palette
    // (success/warning/danger/purple) rather than text/background tokens —
    // these are meant to read the same regardless of light/dark mode, same
    // as a traffic light. They're still pulled from `colors` so dark mode's
    // slightly brighter semantic shades apply.
    const statuses = [
        { key: 'pending', label: 'Ожидает', color: colors.warning },
        { key: 'accepted', label: 'Принято', color: colors.success },
        { key: 'fulfilled', label: 'Выполнено', color: colors.purple },
        { key: 'declined', label: 'Отклонено', color: colors.danger },
        { key: 'cancelled', label: 'Отменено', color: colors.danger },
    ];

    useEffect(() => {
        loadAnalytics();
    }, [period]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const response = await client.get(`/api/catalog/analytics/?period=${period}`);
            setData(response.data);
        } catch (e) {
            console.log('Analytics error:', e);
        } finally {
            setLoading(false);
        }
    };

    const hexToRgb = (hex) => {
        const clean = hex.replace('#', '');
        const bigint = parseInt(clean, 16);
        return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
    };

    const chartConfig = {
        backgroundColor: colors.card,
        backgroundGradientFrom: colors.card,
        backgroundGradientTo: colors.card,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(${hexToRgb(colors.textSecondary)}, ${opacity})`,
        style: { borderRadius: 16 },
        propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: colors.primary,
        },
    };

    const getRevenueChartData = () => {
        if (!data?.revenue_by_day?.length) return null;
        const days = data.revenue_by_day.slice(-14);
        return {
            labels: days.map(d => {
                const date = new Date(d.date);
                return `${date.getDate()}.${date.getMonth() + 1}`;
            }),
            datasets: [{
                data: days.map(d => d.revenue),
                color: (opacity = 1) => `rgba(${hexToRgb(colors.primary)}, ${opacity})`,
                strokeWidth: 2,
            }],
        };
    };

    const getTopProductsChartData = () => {
        if (!data?.top_products?.length) return null;
        return {
            labels: data.top_products.map(p =>
                p.name.length > 8 ? p.name.substring(0, 8) + '...' : p.name
            ),
            datasets: [{
                data: data.top_products.map(p => p.revenue),
            }],
        };
    };

    const revenueChartData = getRevenueChartData();
    const topProductsChartData = getTopProductsChartData();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.back}>← Назад</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Аналитика</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Period filter */}
            <View style={styles.periodBar}>
                {periods.map(p => (
                    <TouchableOpacity
                        key={p.value}
                        style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
                        onPress={() => setPeriod(p.value)}
                    >
                        <Text style={[styles.periodBtnText, period === p.value && styles.periodBtnTextActive]}>
                            {p.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Загрузка данных...</Text>
                </View>
            ) : (
                <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

                    {/* Stats cards */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: colors.primary }]}>
                            <Text style={styles.statLabel}>Выручка</Text>
                            <Text style={styles.statValue}>
                                {parseInt(data?.total_revenue || 0).toLocaleString('ru-RU')} ₸
                            </Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.success }]}>
                            <Text style={styles.statLabel}>Заказов</Text>
                            <Text style={styles.statValue}>{data?.total_orders || 0}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.warning }]}>
                            <Text style={styles.statLabel}>Ожидает</Text>
                            <Text style={styles.statValue}>{data?.pending_requests || 0}</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.purple }]}>
                            <Text style={styles.statLabel}>Ср. заказ</Text>
                            <Text style={styles.statValue}>
                                {parseInt(data?.avg_order_value || 0).toLocaleString('ru-RU')} ₸
                            </Text>
                        </View>
                    </View>

                    {/* Revenue chart */}
                    {revenueChartData ? (
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>Выручка по дням</Text>
                            <Text style={styles.chartSubtitle}>
                                Общая выручка: {parseInt(data?.total_revenue || 0).toLocaleString('ru-RU')} ₸
                            </Text>
                            <LineChart
                                data={revenueChartData}
                                width={screenWidth - 48}
                                height={200}
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                                withInnerLines={false}
                                withOuterLines={true}
                                formatYLabel={(val) => `${parseInt(val / 1000)}к`}
                            />
                        </View>
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyChartText}>
                                Нет данных о выручке за этот период
                            </Text>
                        </View>
                    )}

                    {/* Top products chart */}
                    {topProductsChartData ? (
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>Топ товаров по выручке</Text>
                            <BarChart
                                data={topProductsChartData}
                                width={screenWidth - 48}
                                height={200}
                                chartConfig={chartConfig}
                                style={styles.chart}
                                showValuesOnTopOfBars
                                withInnerLines={false}
                                formatYLabel={(val) => `${parseInt(val / 1000)}к`}
                            />
                        </View>
                    ) : (
                        <View style={styles.emptyChart}>
                            <Text style={styles.emptyChartText}>
                                Нет данных о продажах за этот период
                            </Text>
                        </View>
                    )}

                    {/* Orders by status */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Статусы заявок</Text>
                        {statuses.map(s => {
                            const count = data?.status_counts?.[s.key] || 0;
                            const total = Object.values(data?.status_counts || {}).reduce((a, b) => a + b, 0);
                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

                            return (
                                <View key={s.key} style={styles.statusRow}>
                                    <View style={styles.statusLeft}>
                                        <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                                        <Text style={styles.statusLabel}>{s.label}</Text>
                                    </View>
                                    <View style={styles.statusRight}>
                                        <View style={styles.progressBar}>
                                            <View style={[
                                                styles.progressFill,
                                                { width: `${percent}%`, backgroundColor: s.color }
                                            ]} />
                                        </View>
                                        <Text style={styles.statusCount}>{count}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {data?.sales_reps?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Менеджеры по продажам</Text>
                            <Text style={styles.sectionSubtitle}>Результаты за выбранный период</Text>
                            {data.sales_reps.map(rep => (
                                <View key={rep.id} style={styles.salesRepRow}>
                                    <View style={styles.salesRepAvatar}>
                                        <Text style={styles.salesRepAvatarText}>{rep.name?.[0]?.toUpperCase() || 'М'}</Text>
                                    </View>
                                    <View style={styles.salesRepInfo}>
                                        <Text style={styles.salesRepName}>{rep.name}</Text>
                                        <Text style={styles.salesRepDetail}>
                                            {rep.client_count} клиентов · {rep.request_count} заявок · {rep.fulfilled_count} выполнено
                                        </Text>
                                    </View>
                                    <Text style={styles.salesRepRevenue}>
                                        {parseInt(rep.revenue || 0).toLocaleString('ru-RU')} ₸
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Top products list */}
                    {data?.top_products?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Топ продаж</Text>
                            {data.top_products.map((product, index) => (
                                <View key={index} style={styles.productRow}>
                                    <View style={styles.productRank}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.productInfo}>
                                        <Text style={styles.productName}>{product.name}</Text>
                                        <Text style={styles.productDetail}>
                                            Продано: {product.quantity} шт.
                                        </Text>
                                    </View>
                                    <Text style={styles.productRevenue}>
                                        {parseInt(product.revenue).toLocaleString('ru-RU')} ₸
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Total products sold */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Итого за период</Text>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Товаров продано</Text>
                            <Text style={styles.summaryValue}>{data?.total_products_sold || 0} шт.</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Выполненных заказов</Text>
                            <Text style={styles.summaryValue}>{data?.total_orders || 0}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Средний чек</Text>
                            <Text style={styles.summaryValue}>
                                {parseInt(data?.avg_order_value || 0).toLocaleString('ru-RU')} ₸
                            </Text>
                        </View>
                        <View style={[styles.summaryRow, styles.summaryTotal]}>
                            <Text style={styles.summaryTotalLabel}>Общая выручка</Text>
                            <Text style={styles.summaryTotalValue}>
                                {parseInt(data?.total_revenue || 0).toLocaleString('ru-RU')} ₸
                            </Text>
                        </View>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: STATUS_TOP,
        backgroundColor: colors.primary,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    back: { color: '#fff', fontSize: 14 },
    periodBar: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        padding: 8,
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    periodBtn: {
        flex: 1,
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    periodBtnActive: { backgroundColor: colors.primary },
    periodBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    periodBtnTextActive: { color: '#fff' },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: { color: colors.textSecondary, fontSize: 15 },
    body: { flex: 1 },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        gap: 12,
    },
    statCard: {
        width: '47%',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statLabel: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    chartCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    chart: {
        borderRadius: 8,
        marginLeft: -16,
    },
    emptyChart: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 32,
        marginHorizontal: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    emptyChartText: {
        color: colors.textTertiary,
        fontSize: 14,
        textAlign: 'center',
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: -10, marginBottom: 12 },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statusLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 100,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    statusLabel: { fontSize: 14, color: colors.textSecondary },
    statusRight: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 12,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    statusCount: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        minWidth: 24,
        textAlign: 'right',
    },
    salesRepRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 0.5, borderBottomColor: colors.borderLight,
    },
    salesRepAvatar: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight,
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    salesRepAvatarText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
    salesRepInfo: { flex: 1 },
    salesRepName: { fontSize: 14, fontWeight: '700', color: colors.text },
    salesRepDetail: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    salesRepRevenue: { fontSize: 13, fontWeight: '700', color: colors.success, marginLeft: 8 },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderLight,
    },
    productRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rankText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
    productInfo: { flex: 1 },
    productName: { fontSize: 14, fontWeight: '600', color: colors.text },
    productDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    productRevenue: { fontSize: 14, fontWeight: '600', color: colors.primary },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderLight,
    },
    summaryLabel: { fontSize: 14, color: colors.textSecondary },
    summaryValue: { fontSize: 14, fontWeight: '600', color: colors.text },
    summaryTotal: {
        borderBottomWidth: 0,
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    summaryTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
    summaryTotalValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
});