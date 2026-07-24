import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    FlatList, TextInput, ActivityIndicator, Alert
} from 'react-native';
import client from '../api/client';
import { spacing, radius, STATUS_TOP, shadow } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from '../components/Icon';

// Multi-select variant of CitySelectScreen: lets a supplier pick every city
// they deliver to/cover, instead of a single city. Saves to
// `service_cities` on the user profile (separate from the single `city`
// field, which stays as the supplier's primary/HQ city).
export default function SupplierCitiesScreen({ initialSelected = [], onClose, onSaved, localOnly = false }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [cities, setCities] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(new Set(initialSelected));

    useEffect(() => {
        loadCities();
    }, []);

    const loadCities = async () => {
        try {
            const response = await client.get('/api/auth/cities/');
            setCities(response.data);
            setFiltered(response.data);
        } catch (e) {
            console.error('Could not load cities:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text) => {
        setSearch(text);
        if (!text) {
            setFiltered(cities);
            return;
        }
        const q = text.toLowerCase();
        setFiltered(cities.filter(c =>
            c.label.toLowerCase().includes(q) ||
            c.value.toLowerCase().includes(q)
        ));
    };

    const toggleCity = (value) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(value)) {
                next.delete(value);
            } else {
                next.add(value);
            }
            return next;
        });
    };

    const handleSave = async () => {
        const service_cities = Array.from(selected);
        if (localOnly) {
            if (onSaved) onSaved(service_cities);
            if (onClose) onClose();
            return;
        }
        setSaving(true);
        try {
            await client.patch('/api/auth/profile/', { service_cities });
            if (onSaved) onSaved(service_cities);
            if (onClose) onClose();
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось сохранить города');
        } finally {
            setSaving(false);
        }
    };

    const renderCity = ({ item }) => {
        const isSelected = selected.has(item.value);
        return (
            <TouchableOpacity
                style={[styles.cityItem, isSelected && styles.cityItemActive]}
                onPress={() => toggleCity(item.value)}
                activeOpacity={0.7}
            >
                <View style={styles.cityLeft}>
                    <View style={[styles.cityIcon, isSelected && styles.cityIconActive]}>
                        <Icon name="map_pin" size={16} color={isSelected ? '#fff' : colors.textTertiary} />
                    </View>
                    <Text style={[styles.cityName, isSelected && styles.cityNameActive]}>
                        {item.label}
                    </Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected && <Icon name="check" size={14} color="#fff" />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                        <Icon name="chevronLeft" size={22} color="#fff" />
                    </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Города доставки</Text>
                    <Text style={styles.headerSub}>
                        {selected.size > 0
                            ? `Выбрано: ${selected.size}`
                            : 'Выберите один или несколько городов'}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleSave}
                    style={styles.headerBtn}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Icon name="check" size={22} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Icon name="search" size={16} color={colors.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Поиск города..."
                        placeholderTextColor={colors.placeholder}
                        value={search}
                        onChangeText={handleSearch}
                    />
                    {search ? (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Icon name="x" size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.value}
                    renderItem={renderCity}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Icon name="search" size={32} color={colors.textTertiary} />
                            <Text style={styles.emptyTitle}>Город не найден</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: STATUS_TOP,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        gap: spacing.md,
    },
    headerBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    searchContainer: {
        padding: spacing.lg,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.md,
        height: 44,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        paddingVertical: 0,
    },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: spacing.lg },
    cityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        ...shadow.sm,
    },
    cityItemActive: {
        borderWidth: 1.5,
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    cityLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cityIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cityIconActive: { backgroundColor: colors.primary },
    cityName: { fontSize: 15, fontWeight: '500', color: colors.text },
    cityNameActive: { color: colors.primary, fontWeight: '700' },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: spacing.lg,
    },
    emptyTitle: { fontSize: 16, color: colors.textSecondary },
});