// src/components/CityPickerSheet.js
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import BottomSheet from './BottomSheet';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius } from '../styles/theme';
import { KAZAKHSTAN_CITIES } from '../constants/cities';

// A supplier can cover several cities at once — this just lets them switch
// which city's stock/clients/workers/requests they're currently looking at.
// Unlike CitySelectScreen (client browsing city), this never touches the
// profile or persists anywhere — it's purely a view filter for this screen.
export default function CityPickerSheet({ visible, onClose, cities, value, onSelect, title = 'Выберите город' }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const options = KAZAKHSTAN_CITIES.filter(c => cities.includes(c.value));

    return (
        <BottomSheet visible={visible} onClose={onClose}>
            <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.title}>{title}</Text>
                <ScrollView style={{ maxHeight: 420 }}>
                    {options.map(city => {
                        const active = city.value === value;
                        return (
                            <TouchableOpacity
                                key={city.value}
                                style={[styles.row, active && styles.rowActive]}
                                onPress={() => { onSelect(city.value); onClose(); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{city.label}</Text>
                                {active && <Icon name="check" size={18} color={colors.primary} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </BottomSheet>
    );
}

const createStyles = (colors) => StyleSheet.create({
    sheet: {
        backgroundColor: colors.card,
        borderTopLeftRadius: radius.xl,
        borderTopRightRadius: radius.xl,
        padding: spacing.lg,
        maxHeight: '75%',
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md },
    title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radius.lg,
        marginBottom: spacing.xs,
    },
    rowActive: { backgroundColor: colors.primaryLight },
    rowLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
    rowLabelActive: { color: colors.primary, fontWeight: '700' },
});