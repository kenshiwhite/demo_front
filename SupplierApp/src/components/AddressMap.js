import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from './Icon';
import { colors, radius, spacing } from '../styles/theme';

const ALMATY = { latitude: 43.238949, longitude: 76.889709 };

export function AddressMap({ latitude, longitude }) {
    const coordinates = latitude != null && longitude != null
        ? `${Number(latitude)},${Number(longitude)}`
        : `${ALMATY.latitude},${ALMATY.longitude}`;
    const open = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${coordinates}`);
    return <TouchableOpacity style={styles.map} onPress={open}>
        <Icon name="map_pin" size={28} color={colors.primary} />
        <View><Text style={styles.mapTitle}>Открыть карту</Text><Text style={styles.mapText}>Выберите точку в приложении карт</Text></View>
    </TouchableOpacity>;
}

export function OpenAddressInMap({ address }) {
    if (!address) return null;
    const open = () => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
    return <TouchableOpacity style={styles.open} onPress={open}><Icon name="map_pin" size={15} color={colors.primary} /><Text style={styles.openText}>Открыть на карте</Text></TouchableOpacity>;
}

const styles = StyleSheet.create({
    map: { minHeight: 82, borderRadius: radius.lg, backgroundColor: colors.primaryLight, marginTop: spacing.sm, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    mapTitle: { color: colors.primary, fontWeight: '700' },
    mapText: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    open: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    openText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
});
