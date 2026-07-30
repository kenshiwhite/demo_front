// src/components/DatePickerSheet.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import BottomSheet from './BottomSheet';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../styles/theme';

const todayStr = () => new Date().toISOString().split('T')[0];

// A small calendar sheet for picking a single date (delivery dates, filters,
// anywhere the app currently uses a raw "ГГГГ-ММ-ДД" text field). Renders
// react-native-calendars' month grid — already used and themed in
// CalendarScreen — inside our shared BottomSheet, so it opens/closes with
// the same slide animation as every other popup in the app.
//
// value / onSelect use plain 'YYYY-MM-DD' strings, matching what the API
// already expects for desired_delivery_date etc. — no Date object handling
// needed at the call site.
export default function DatePickerSheet({
    visible, onClose, value, onSelect,
    title = 'Выберите дату', minDate = todayStr(), allowClear = true,
}) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const markedDates = value ? {
        [value]: { selected: true, selectedColor: colors.primary, selectedTextColor: '#fff' },
    } : {};

    return (
        <BottomSheet visible={visible} onClose={onClose}>
            <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    {allowClear && value ? (
                        <TouchableOpacity onPress={() => { onSelect(''); onClose(); }}>
                            <Text style={styles.clear}>Очистить</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
                <Calendar
                    current={value || todayStr()}
                    minDate={minDate}
                    onDayPress={(day) => { onSelect(day.dateString); onClose(); }}
                    markedDates={markedDates}
                    firstDay={1}
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
                    style={styles.calendar}
                />
            </View>
        </BottomSheet>
    );
}

const createStyles = (colors) => StyleSheet.create({
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
    },
    title: { fontSize: 16, fontWeight: '700', color: colors.text },
    clear: { fontSize: 13, fontWeight: '600', color: colors.danger },
    calendar: { borderRadius: radius.lg },
});