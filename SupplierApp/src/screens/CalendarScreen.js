import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator,
    TouchableOpacity, ScrollView, Modal
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import client from '../api/client';
import { colors, spacing, radius, typography, STATUS_TOP, shadow } from '../styles/theme';
import Icon from '../components/Icon';
import RequestDetailScreen from './RequestDetailScreen';

// Russian locale
LocaleConfig.locales['ru'] = {
    monthNames: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    monthNamesShort: [
        'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
        'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
    ],
    dayNames: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
    dayNamesShort: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    today: 'Сегодня'
};
LocaleConfig.defaultLocale = 'ru';

export default function CalendarScreen({ onClose, userRole }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [markedDates, setMarkedDates] = useState({});
    const [requestsByDate, setRequestsByDate] = useState({});

    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        try {
            const response = await client.get('/api/requests/');
            const data = response.data.results || response.data;
            setRequests(data);
            buildCalendarData(data);
        } catch (e) {
            console.log('Could not load requests');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors_map = {
            pending: colors.warning,
            accepted: colors.success,
            declined: colors.danger,
            fulfilled: colors.purple,
        };
        return colors_map[status] || colors.textSecondary;
    };

    const buildCalendarData = (data) => {
        const byDate = {};
        const marked = {};

        data.forEach(request => {
            // use created_at date as primary
            const date = request.created_at?.split('T')[0];
            const deliveryDate = request.desired_delivery_date;

            if (date) {
                if (!byDate[date]) byDate[date] = [];
                byDate[date].push({ ...request, calendarDateType: 'created' });
            }

            // also mark delivery date if exists and different
            if (deliveryDate && deliveryDate !== date) {
                if (!byDate[deliveryDate]) byDate[deliveryDate] = [];
                // avoid duplicates
                if (!byDate[deliveryDate].find(r => r.id === request.id)) {
                    byDate[deliveryDate].push({ ...request, calendarDateType: 'delivery' });
                }
            }
        });

        // build marked dates for calendar
        Object.keys(byDate).forEach(date => {
            const dateRequests = byDate[date];
            const statuses = [...new Set(dateRequests.map(r => r.status))];

            // pick dominant color — priority: pending > accepted > fulfilled > declined
            let dotColor = colors.textTertiary;
            if (statuses.includes('pending')) dotColor = colors.warning;
            else if (statuses.includes('accepted')) dotColor = colors.success;
            else if (statuses.includes('fulfilled')) dotColor = colors.purple;
            else if (statuses.includes('declined')) dotColor = colors.danger;

            const dots = statuses.slice(0, 3).map(s => ({
                key: s,
                color: getStatusColor(s),
            }));

            marked[date] = {
                dots,
                marked: true,
                selected: date === selectedDate,
                selectedColor: colors.primary,
            };
        });

        setRequestsByDate(byDate);
        setMarkedDates(marked);
    };

    const handleDayPress = (day) => {
        const date = day.dateString;
        setSelectedDate(date);

        // rebuild marked dates with new selection
        setMarkedDates(prev => {
            const updated = { ...prev };
            // remove old selection
            Object.keys(updated).forEach(d => {
                if (updated[d].selected) {
                    updated[d] = { ...updated[d], selected: false };
                }
            });
            // set new selection
            if (updated[date]) {
                updated[date] = { ...updated[date], selected: true, selectedColor: colors.primary };
            } else {
                updated[date] = { selected: true, selectedColor: colors.primary };
            }
            return updated;
        });
    };

    const getStatusConfig = (status) => {
        const configs = {
            pending: { label: 'Ожидает', color: colors.warning, bg: '#FEF3C7', icon: 'clock' },
            accepted: { label: 'Принято', color: colors.success, bg: '#DCFCE7', icon: 'check' },
            declined: { label: 'Отклонено', color: colors.danger, bg: '#FEE2E2', icon: 'x' },
            fulfilled: { label: 'Выполнено', color: colors.purple, bg: '#EDE9FE', icon: 'truck' },
        };
        return configs[status] || { label: status, color: colors.textSecondary, bg: colors.borderLight, icon: 'info' };
    };

    const selectedDateRequests = selectedDate ? (requestsByDate[selectedDate] || []) : [];

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    // Stats
    const totalRequests = requests.length;
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const fulfilledCount = requests.filter(r => r.status === 'fulfilled').length;

    if (selectedRequest) {
        return (
            <RequestDetailScreen
                request={selectedRequest}
                onClose={() => setSelectedRequest(null)}
                onUpdate={() => {
                    setSelectedRequest(null);
                    loadRequests();
                }}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                    <Icon name="chevronLeft" size={22} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Календарь заявок</Text>
                    <Text style={styles.headerSub}>{totalRequests} всего</Text>
                </View>
                <TouchableOpacity onPress={loadRequests} style={styles.headerBtn}>
                    <Icon name="refresh" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Загрузка заявок...</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Stats strip */}
                    <View style={styles.statsStrip}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{totalRequests}</Text>
                            <Text style={styles.statLabel}>Всего</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.warning }]}>
                                {pendingCount}
                            </Text>
                            <Text style={styles.statLabel}>Ожидает</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.purple }]}>
                                {fulfilledCount}
                            </Text>
                            <Text style={styles.statLabel}>Выполнено</Text>
                        </View>
                    </View>

                    {/* Calendar */}
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
                                dotColor: colors.primary,
                                selectedDotColor: '#fff',
                                arrowColor: colors.primary,
                                disabledArrowColor: colors.border,
                                monthTextColor: colors.text,
                                indicatorColor: colors.primary,
                                textDayFontWeight: '500',
                                textMonthFontWeight: '700',
                                textDayHeaderFontWeight: '600',
                                textDayFontSize: 14,
                                textMonthFontSize: 16,
                                textDayHeaderFontSize: 12,
                            }}
                        />
                    </View>

                    {/* Legend */}
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

                    {/* Selected date requests */}
                    {selectedDate && (
                        <View style={styles.selectedSection}>
                            <View style={styles.selectedDateHeader}>
                                <View style={styles.selectedDateIconBox}>
                                    <Icon name="calendar" size={16} color={colors.primary} />
                                </View>
                                <View>
                                    <Text style={styles.selectedDateTitle}>
                                        {formatDate(selectedDate)}
                                    </Text>
                                    <Text style={styles.selectedDateSub}>
                                        {selectedDateRequests.length > 0
                                            ? `${selectedDateRequests.length} заявок`
                                            : 'Нет заявок'}
                                    </Text>
                                </View>
                            </View>

                            {selectedDateRequests.length === 0 ? (
                                <View style={styles.emptyDay}>
                                    <Icon name="info" size={20} color={colors.textTertiary} />
                                    <Text style={styles.emptyDayText}>
                                        На этот день нет заявок
                                    </Text>
                                </View>
                            ) : (
                                selectedDateRequests.map(request => {
                                    const statusConfig = getStatusConfig(request.status);
                                    return (
                                        <TouchableOpacity
                                            key={`${request.id}-${request.calendarDateType}`}
                                            style={styles.requestCard}
                                            onPress={() => setSelectedRequest(request)}
                                            activeOpacity={0.7}
                                        >
                                            {/* Date type badge */}
                                            {request.calendarDateType === 'delivery' && (
                                                <View style={styles.deliveryBadge}>
                                                    <Icon name="truck" size={11} color={colors.primary} />
                                                    <Text style={styles.deliveryBadgeText}>
                                                        Дата доставки
                                                    </Text>
                                                </View>
                                            )}
                                            {request.calendarDateType === 'created' && (
                                                <View style={styles.createdBadge}>
                                                    <Icon name="clock" size={11} color={colors.textTertiary} />
                                                    <Text style={styles.createdBadgeText}>
                                                        Дата создания
                                                    </Text>
                                                </View>
                                            )}

                                            <View style={styles.requestCardTop}>
                                                <Text style={styles.requestId}>
                                                    Заявка #{request.id}
                                                </Text>
                                                <View style={[
                                                    styles.statusBadge,
                                                    { backgroundColor: statusConfig.bg }
                                                ]}>
                                                    <Icon
                                                        name={statusConfig.icon}
                                                        size={11}
                                                        color={statusConfig.color}
                                                    />
                                                    <Text style={[
                                                        styles.statusText,
                                                        { color: statusConfig.color }
                                                    ]}>
                                                        {statusConfig.label}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.requestMeta}>
                                                {userRole === 'supplier' ? (
                                                    <View style={styles.metaRow}>
                                                        <Icon name="user" size={13} color={colors.textTertiary} />
                                                        <Text style={styles.metaText}>
                                                            {request.client_name}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View style={styles.metaRow}>
                                                        <Icon name="building" size={13} color={colors.textTertiary} />
                                                        <Text style={styles.metaText}>
                                                            {request.supplier_name}
                                                        </Text>
                                                    </View>
                                                )}
                                                <View style={styles.metaRow}>
                                                    <Icon name="package" size={13} color={colors.textTertiary} />
                                                    <Text style={styles.metaText}>
                                                        {request.items?.length || 0} товар(ов)
                                                    </Text>
                                                </View>
                                                {request.total_price && (
                                                    <View style={styles.metaRow}>
                                                        <Icon name="trending_up" size={13} color={colors.textTertiary} />
                                                        <Text style={styles.metaText}>
                                                            {parseInt(request.total_price).toLocaleString('ru-RU')} ₸
                                                        </Text>
                                                    </View>
                                                )}
                                                {request.delivery_address && (
                                                    <View style={styles.metaRow}>
                                                        <Icon name="map_pin" size={13} color={colors.textTertiary} />
                                                        <Text style={styles.metaText} numberOfLines={1}>
                                                            {request.delivery_address}
                                                        </Text>
                                                    </View>
                                                )}
                                                {request.desired_delivery_date && (
                                                    <View style={styles.metaRow}>
                                                        <Icon name="truck" size={13} color={colors.textTertiary} />
                                                        <Text style={styles.metaText}>
                                                            Доставка: {new Date(request.desired_delivery_date).toLocaleDateString('ru-RU')}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.requestCardFooter}>
                                                <Text style={styles.tapHint}>Открыть детали</Text>
                                                <Icon name="chevronRight" size={14} color={colors.primary} />
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    )}

                    {/* If nothing selected, show hint */}
                    {!selectedDate && (
                        <View style={styles.hintBox}>
                            <Icon name="calendar" size={20} color={colors.textTertiary} />
                            <Text style={styles.hintText}>
                                Нажмите на дату с точками, чтобы увидеть заявки
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.md,
    },
    loadingText: { fontSize: 14, color: colors.textSecondary },

    // Stats
    statsStrip: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        marginHorizontal: spacing.lg,
        marginTop: spacing.lg,
        borderRadius: radius.xl,
        padding: spacing.lg,
        ...shadow.sm,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 2 },
    statLabel: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },
    statDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },

    // Calendar
    calendarWrapper: {
        margin: spacing.lg,
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...shadow.sm,
    },

    // Legend
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: colors.textSecondary },

    // Selected section
    selectedSection: {
        paddingHorizontal: spacing.lg,
    },
    selectedDateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    selectedDateIconBox: {
        width: 40,
        height: 40,
        borderRadius: radius.md,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedDateTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    selectedDateSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    emptyDay: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        ...shadow.sm,
    },
    emptyDayText: { fontSize: 14, color: colors.textSecondary },

    // Request card
    requestCard: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadow.sm,
    },
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
    createdBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.borderLight,
        alignSelf: 'flex-start',
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radius.full,
        marginBottom: spacing.sm,
    },
    createdBadgeText: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
    requestCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    requestId: { fontSize: 15, fontWeight: '700', color: colors.text },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
    },
    statusText: { fontSize: 12, fontWeight: '600' },
    requestMeta: { gap: spacing.xs, marginBottom: spacing.md },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    metaText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    requestCardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 2,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    tapHint: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    // Hint
    hintBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginHorizontal: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        ...shadow.sm,
    },
    hintText: { fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 },
});