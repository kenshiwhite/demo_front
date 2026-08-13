import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, Switch, KeyboardAvoidingView, Platform
} from 'react-native';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../styles/theme';
import Icon from '../components/Icon';
import { InputField, Button } from '../components/UI';
import BottomSheet from '../components/BottomSheet';
import DatePickerSheet from '../components/DatePickerSheet';

const CATEGORIES = [
    { value: 'rent', label: 'Аренда' },
    { value: 'logistics', label: 'Логистика и доставка' },
    { value: 'utilities', label: 'Коммунальные услуги' },
    { value: 'marketing', label: 'Реклама и маркетинг' },
    { value: 'equipment', label: 'Оборудование' },
    { value: 'taxes', label: 'Налоги и сборы' },
    { value: 'other', label: 'Прочее' },
];

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyExpense = { amount: '', category: 'other', description: '', date: todayStr() };
const emptyBonus = { worker: null, amount: '', reason: '', date: todayStr() };

// Supplier-only expense & profit dashboard. Not embedded in any other
// screen's data flow — fetches its own summary/expenses/workers directly
// so it stays correct regardless of what's loaded elsewhere.
export default function FinanceScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [period, setPeriod] = useState('month'); // 'day' | 'month'
    const [includeBonuses, setIncludeBonuses] = useState(true);
    const [summary, setSummary] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [expenseModal, setExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState(emptyExpense);
    const [showExpenseDate, setShowExpenseDate] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [savingExpense, setSavingExpense] = useState(false);

    const [bonusModal, setBonusModal] = useState(false);
    const [bonusForm, setBonusForm] = useState(emptyBonus);
    const [showBonusDate, setShowBonusDate] = useState(false);
    const [showWorkerPicker, setShowWorkerPicker] = useState(false);
    const [savingBonus, setSavingBonus] = useState(false);

    const hasLoadedOnce = useRef(false);

    const load = useCallback(async () => {
        if (!hasLoadedOnce.current) setLoading(true);
        try {
            const [summaryRes, expensesRes, workersRes] = await Promise.all([
                client.get('/api/finance/summary/', { params: { period, include_bonuses: includeBonuses } }),
                client.get('/api/finance/expenses/', { params: { period } }),
                client.get('/api/auth/workers/'),
            ]);
            setSummary(summaryRes.data);
            setExpenses(expensesRes.data);
            setWorkers(workersRes.data.results || workersRes.data);
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось загрузить финансовые данные');
        } finally {
            setLoading(false);
            hasLoadedOnce.current = true;
        }
    }, [period, includeBonuses]);

    useEffect(() => { load(); }, [load]);

    const money = (val) => `${parseInt(val || 0).toLocaleString('ru-RU')} ₸`;

    const saveExpense = async () => {
        const amount = parseFloat(expenseForm.amount);
        if (!amount || amount <= 0) {
            Alert.alert('Проверьте данные', 'Укажите сумму расхода.');
            return;
        }
        setSavingExpense(true);
        try {
            await client.post('/api/finance/expenses/', {
                amount, category: expenseForm.category,
                description: expenseForm.description, date: expenseForm.date,
            });
            setExpenseModal(false);
            setExpenseForm(emptyExpense);
            await load();
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось добавить расход');
        } finally {
            setSavingExpense(false);
        }
    };

    const deleteExpense = (expense) => {
        Alert.alert('Удалить расход?', `${expense.category_display} — ${money(expense.amount)}`, [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить', style: 'destructive', onPress: async () => {
                    try {
                        await client.delete(`/api/finance/expenses/${expense.id}/`);
                        await load();
                    } catch (e) {
                        Alert.alert('Ошибка', 'Не удалось удалить расход');
                    }
                }
            },
        ]);
    };

    const saveBonus = async () => {
        const amount = parseFloat(bonusForm.amount);
        if (!bonusForm.worker) {
            Alert.alert('Проверьте данные', 'Выберите сотрудника.');
            return;
        }
        if (!amount || amount <= 0) {
            Alert.alert('Проверьте данные', 'Укажите сумму бонуса.');
            return;
        }
        setSavingBonus(true);
        try {
            await client.post('/api/finance/bonuses/', {
                worker: bonusForm.worker, amount, reason: bonusForm.reason, date: bonusForm.date,
            });
            setBonusModal(false);
            setBonusForm(emptyBonus);
            await load();
        } catch (e) {
            Alert.alert('Ошибка', e.response?.data?.detail || 'Не удалось добавить бонус');
        } finally {
            setSavingBonus(false);
        }
    };

    const selectedWorkerName = workers.find(w => w.id === bonusForm.worker)?.username;
    const selectedCategoryLabel = CATEGORIES.find(c => c.value === expenseForm.category)?.label;

    return (
        <View style={styles.container}>
            <View style={styles.periodBar}>
                <TouchableOpacity
                    style={[styles.periodBtn, period === 'day' && styles.periodBtnActive]}
                    onPress={() => setPeriod('day')}
                >
                    <Text style={[styles.periodBtnText, period === 'day' && styles.periodBtnTextActive]}>Сегодня</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.periodBtn, period === 'month' && styles.periodBtnActive]}
                    onPress={() => setPeriod('month')}
                >
                    <Text style={[styles.periodBtnText, period === 'month' && styles.periodBtnTextActive]}>Этот месяц</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                    {/* Net profit — the headline number */}
                    <View style={[
                        styles.profitCard,
                        { backgroundColor: (summary?.net_profit || 0) >= 0 ? colors.success : colors.danger }
                    ]}>
                        <Text style={styles.profitLabel}>Чистая прибыль</Text>
                        <Text style={styles.profitValue}>{money(summary?.net_profit)}</Text>
                        <Text style={styles.profitSub}>
                            Выручка {money(summary?.revenue)} · Маржа {summary?.margin_percent ?? 0}%
                        </Text>
                    </View>

                    {/* Expense breakdown */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Расходы</Text>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Себестоимость товаров</Text>
                            <Text style={styles.breakdownValue}>{money(summary?.cost_of_goods)}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>
                                Зарплаты{period === 'day' ? ' (за день)' : ''} · {summary?.worker_count || 0} сотр.
                            </Text>
                            <Text style={styles.breakdownValue}>{money(summary?.salary_expense)}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <View style={styles.bonusToggleRow}>
                                <Text style={styles.breakdownLabel}>Бонусы сотрудникам</Text>
                                <Switch
                                    value={includeBonuses}
                                    onValueChange={setIncludeBonuses}
                                    trackColor={{ false: colors.border, true: colors.primaryLight }}
                                    thumbColor={includeBonuses ? colors.primary : '#fff'}
                                />
                            </View>
                            <Text style={styles.breakdownValue}>{money(summary?.bonuses_total)}</Text>
                        </View>
                        <View style={styles.breakdownRow}>
                            <Text style={styles.breakdownLabel}>Прочие расходы</Text>
                            <Text style={styles.breakdownValue}>{money(summary?.manual_expenses_total)}</Text>
                        </View>
                        <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                            <Text style={styles.breakdownTotalLabel}>Итого расходов</Text>
                            <Text style={styles.breakdownTotalValue}>{money(summary?.total_expenses)}</Text>
                        </View>
                        <Text style={styles.hint}>
                            Себестоимость считается только по товарам, у которых указана закупочная цена.
                        </Text>
                    </View>

                    {/* Manual expenses list */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Расходы за период ({expenses.length})</Text>
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => { setExpenseForm(emptyExpense); setExpenseModal(true); }}
                            >
                                <Icon name="plus" size={14} color={colors.primary} />
                                <Text style={styles.addBtnText}>Добавить</Text>
                            </TouchableOpacity>
                        </View>
                        {expenses.length === 0 ? (
                            <Text style={styles.hint}>Расходов за этот период пока нет</Text>
                        ) : (
                            expenses.map(exp => (
                                <TouchableOpacity
                                    key={exp.id}
                                    style={styles.expenseRow}
                                    onLongPress={() => deleteExpense(exp)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.expenseCategory}>{exp.category_display}</Text>
                                        {exp.description ? <Text style={styles.expenseDesc} numberOfLines={1}>{exp.description}</Text> : null}
                                        <Text style={styles.expenseDate}>{new Date(exp.date).toLocaleDateString('ru-RU')}</Text>
                                    </View>
                                    <Text style={styles.expenseAmount}>-{money(exp.amount)}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                        {expenses.length > 0 && <Text style={styles.hint}>Удерживайте строку, чтобы удалить</Text>}
                    </View>

                    {/* Bonus adder */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Бонус сотруднику</Text>
                            <TouchableOpacity
                                style={styles.addBtn}
                                onPress={() => { setBonusForm(emptyBonus); setBonusModal(true); }}
                            >
                                <Icon name="plus" size={14} color={colors.primary} />
                                <Text style={styles.addBtnText}>Добавить</Text>
                            </TouchableOpacity>
                        </View>

                        {workers.filter(w => w.bonus_sales_threshold).map(worker => (
                            <TouchableOpacity
                                key={worker.id}
                                style={styles.workerMiniCard}
                                onPress={() => {
                                    setBonusForm({
                                        worker: worker.id,
                                        amount: worker.bonus_earned ? String(worker.bonus_amount || '') : '',
                                        reason: worker.bonus_earned
                                            ? `Бонус за выполнение плана продаж (${worker.bonus_percent}% от оклада)`
                                            : '',
                                        date: todayStr(),
                                    });
                                    setBonusModal(true);
                                }}
                            >
                                <View style={styles.workerMiniHeader}>
                                    <Text style={styles.workerMiniName}>{worker.username}</Text>
                                    <Text style={styles.workerMiniPercent}>{worker.bonus_progress_percent || 0}%</Text>
                                </View>
                                <View style={styles.progressBarTrack}>
                                    <View style={[
                                        styles.progressBarFill,
                                        {
                                            width: `${worker.bonus_progress_percent || 0}%`,
                                            backgroundColor: worker.bonus_earned ? colors.success : colors.primary,
                                        }
                                    ]} />
                                </View>
                                <Text style={styles.workerMiniSub}>
                                    {worker.bonus_earned
                                        ? `🎉 План выполнен — бонус ${money(worker.bonus_amount)}`
                                        : `${money(worker.current_month_sales)} из ${money(worker.bonus_sales_threshold)}`}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <Text style={styles.hint}>
                            Бонусы учитываются в разделе «Зарплаты» выше — переключателем можно исключить их из расчёта.
                            Порог и процент бонуса настраиваются в профиле сотрудника на вкладке «Сотрудники».
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}

            {/* Add expense sheet */}
            <BottomSheet visible={expenseModal} onClose={() => setExpenseModal(false)}>
                    <View style={styles.modal}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Новый расход</Text>
                        <InputField
                            label="Сумма *"
                            value={expenseForm.amount}
                            onChangeText={v => setExpenseForm(f => ({ ...f, amount: v }))}
                            placeholder="0"
                            keyboardType="numeric"
                        />
                        <Text style={styles.fieldLabel}>Категория</Text>
                        <TouchableOpacity style={styles.pickerField} onPress={() => setShowCategoryPicker(true)}>
                            <Text style={styles.pickerFieldText}>{selectedCategoryLabel}</Text>
                            <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                        <InputField
                            label="Описание"
                            value={expenseForm.description}
                            onChangeText={v => setExpenseForm(f => ({ ...f, description: v }))}
                            placeholder="Например, аренда склада за август"
                        />
                        <Text style={styles.fieldLabel}>Дата</Text>
                        <TouchableOpacity style={styles.pickerField} onPress={() => setShowExpenseDate(true)}>
                            <Icon name="calendar" size={16} color={colors.primary} />
                            <Text style={[styles.pickerFieldText, { flex: 1, marginLeft: spacing.sm }]}>
                                {expenseForm.date}
                            </Text>
                        </TouchableOpacity>
                        <Button label="Добавить расход" onPress={saveExpense} loading={savingExpense} style={{ marginTop: spacing.md }} />
                        <Button label="Отмена" onPress={() => setExpenseModal(false)} variant="ghost" />
                    </View>
            </BottomSheet>

            <BottomSheet visible={showCategoryPicker} onClose={() => setShowCategoryPicker(false)}>
                <View style={styles.modal}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Категория расхода</Text>
                    <ScrollView style={{ maxHeight: 420 }}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat.value}
                                style={[styles.pickerOption, expenseForm.category === cat.value && styles.pickerOptionActive]}
                                onPress={() => { setExpenseForm(f => ({ ...f, category: cat.value })); setShowCategoryPicker(false); }}
                            >
                                <Text style={styles.pickerOptionText}>{cat.label}</Text>
                                {expenseForm.category === cat.value && <Icon name="check" size={18} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </BottomSheet>

            <DatePickerSheet
                visible={showExpenseDate}
                onClose={() => setShowExpenseDate(false)}
                value={expenseForm.date}
                onSelect={(d) => setExpenseForm(f => ({ ...f, date: d }))}
                title="Дата расхода"
                minDate="2000-01-01"
            />

            {/* Add bonus sheet */}
            <BottomSheet visible={bonusModal} onClose={() => setBonusModal(false)}>
                    <View style={styles.modal}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Новый бонус</Text>
                        <Text style={styles.fieldLabel}>Сотрудник *</Text>
                        <TouchableOpacity style={styles.pickerField} onPress={() => setShowWorkerPicker(true)}>
                            <Text style={[styles.pickerFieldText, !selectedWorkerName && { color: colors.placeholder }]}>
                                {selectedWorkerName || 'Выберите сотрудника'}
                            </Text>
                            <Icon name="chevronRight" size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                        <InputField
                            label="Сумма *"
                            value={bonusForm.amount}
                            onChangeText={v => setBonusForm(f => ({ ...f, amount: v }))}
                            placeholder="0"
                            keyboardType="numeric"
                        />
                        <InputField
                            label="Причина"
                            value={bonusForm.reason}
                            onChangeText={v => setBonusForm(f => ({ ...f, reason: v }))}
                            placeholder="Например, за перевыполнение плана"
                        />
                        <Text style={styles.fieldLabel}>Дата</Text>
                        <TouchableOpacity style={styles.pickerField} onPress={() => setShowBonusDate(true)}>
                            <Icon name="calendar" size={16} color={colors.primary} />
                            <Text style={[styles.pickerFieldText, { flex: 1, marginLeft: spacing.sm }]}>
                                {bonusForm.date}
                            </Text>
                        </TouchableOpacity>
                        <Button label="Добавить бонус" onPress={saveBonus} loading={savingBonus} style={{ marginTop: spacing.md }} />
                        <Button label="Отмена" onPress={() => setBonusModal(false)} variant="ghost" />
                    </View>
            </BottomSheet>

            <BottomSheet visible={showWorkerPicker} onClose={() => setShowWorkerPicker(false)}>
                <View style={styles.modal}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Выберите сотрудника</Text>
                    <ScrollView style={{ maxHeight: 420 }}>
                        {workers.map(worker => (
                            <TouchableOpacity
                                key={worker.id}
                                style={[styles.pickerOption, bonusForm.worker === worker.id && styles.pickerOptionActive]}
                                onPress={() => { setBonusForm(f => ({ ...f, worker: worker.id })); setShowWorkerPicker(false); }}
                            >
                                <Text style={styles.pickerOptionText}>{worker.username}</Text>
                                {bonusForm.worker === worker.id && <Icon name="check" size={18} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                        {workers.length === 0 && <Text style={styles.hint}>В вашей компании пока нет сотрудников.</Text>}
                    </ScrollView>
                </View>
            </BottomSheet>

            <DatePickerSheet
                visible={showBonusDate}
                onClose={() => setShowBonusDate(false)}
                value={bonusForm.date}
                onSelect={(d) => setBonusForm(f => ({ ...f, date: d }))}
                title="Дата бонуса"
                minDate="2000-01-01"
            />
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    periodBar: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        padding: spacing.sm,
        gap: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    periodBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: radius.md,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    periodBtnActive: { backgroundColor: colors.primary },
    periodBtnText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
    periodBtnTextActive: { color: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    body: { flex: 1 },
    profitCard: {
        margin: spacing.lg,
        borderRadius: radius.xl,
        padding: spacing.lg,
    },
    profitLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
    profitValue: { fontSize: 30, fontWeight: '800', color: '#fff', marginTop: 4 },
    profitSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: spacing.sm },
    section: {
        backgroundColor: colors.card,
        borderRadius: radius.xl,
        padding: spacing.lg,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    breakdownRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 0.5, borderBottomColor: colors.borderLight,
    },
    bonusToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    breakdownLabel: { fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
    breakdownValue: { fontSize: 14, fontWeight: '700', color: colors.text },
    breakdownTotal: { borderBottomWidth: 0, marginTop: 4, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
    breakdownTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
    breakdownTotalValue: { fontSize: 16, fontWeight: '800', color: colors.danger },
    hint: { fontSize: 11, color: colors.textTertiary, marginTop: spacing.sm, lineHeight: 16 },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.primaryLight, borderRadius: radius.md,
        paddingHorizontal: spacing.sm, paddingVertical: 6,
    },
    addBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    expenseRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 0.5, borderBottomColor: colors.borderLight,
    },
    expenseCategory: { fontSize: 14, fontWeight: '600', color: colors.text },
    expenseDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    expenseDate: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    expenseAmount: { fontSize: 14, fontWeight: '700', color: colors.danger, marginLeft: spacing.sm },
    workerMiniCard: {
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    workerMiniHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    workerMiniName: { fontSize: 14, fontWeight: '700', color: colors.text },
    workerMiniPercent: { fontSize: 13, fontWeight: '800', color: colors.primary },
    workerMiniSub: { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs },
    progressBarTrack: { height: 8, borderRadius: 4, backgroundColor: colors.borderLight, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    modal: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        maxHeight: '90%',
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.xs },
    pickerField: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md,
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        backgroundColor: colors.card, marginBottom: spacing.md,
    },
    pickerFieldText: { fontSize: 15, color: colors.text, fontWeight: '500' },
    pickerOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: spacing.md, paddingHorizontal: spacing.md,
        borderRadius: radius.lg, marginBottom: spacing.xs,
    },
    pickerOptionActive: { backgroundColor: colors.primaryLight },
    pickerOptionText: { fontSize: 15, color: colors.text, fontWeight: '500' },
});