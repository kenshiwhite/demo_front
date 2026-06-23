import React from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator
} from 'react-native';
import { colors, typography, spacing, radius, shadow, STATUS_TOP } from '../styles/theme';

// Header
export const Header = ({ title, left, right, style }) => (
    <View style={[styles.header, style]}>
        <View style={styles.headerSide}>{left}</View>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.headerSide}>{right}</View>
    </View>
);

// Back button
export const BackButton = ({ onPress, label = '← Назад', light = true }) => (
    <TouchableOpacity onPress={onPress} style={styles.backBtn}>
        <Text style={[styles.backBtnText, { color: light ? '#fff' : colors.primary }]}>
            {label}
        </Text>
    </TouchableOpacity>
);

// Input field with always-visible label
export const InputField = ({
    label, value, onChangeText, placeholder,
    secureTextEntry, keyboardType, multiline,
    numberOfLines, style, error, autoCapitalize,
    autoCorrect, editable = true
}) => (
    <View style={[styles.inputWrapper, style]}>
        {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
        <TextInput
            style={[
                styles.input,
                multiline && { height: numberOfLines ? numberOfLines * 40 : 80, textAlignVertical: 'top' },
                error && styles.inputError,
                !editable && styles.inputDisabled,
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={secureTextEntry}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={numberOfLines}
            autoCapitalize={autoCapitalize || 'none'}
            autoCorrect={autoCorrect !== undefined ? autoCorrect : false}
            editable={editable}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
);

// Primary button
export const Button = ({ label, onPress, loading, disabled, variant = 'primary', style }) => (
    <TouchableOpacity
        style={[
            styles.btn,
            variant === 'primary' && styles.btnPrimary,
            variant === 'secondary' && styles.btnSecondary,
            variant === 'danger' && styles.btnDanger,
            variant === 'ghost' && styles.btnGhost,
            (disabled || loading) && styles.btnDisabled,
            style,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
    >
        {loading ? (
            <ActivityIndicator color={variant === 'ghost' ? colors.primary : '#fff'} />
        ) : (
            <Text style={[
                styles.btnText,
                variant === 'ghost' && { color: colors.primary },
                variant === 'secondary' && { color: colors.primary },
            ]}>
                {label}
            </Text>
        )}
    </TouchableOpacity>
);

// Card container
export const Card = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
);

// Section title
export const SectionTitle = ({ label }) => (
    <Text style={styles.sectionTitle}>{label}</Text>
);

// Badge
export const Badge = ({ label, color }) => (
    <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{label}</Text>
    </View>
);

// Divider
export const Divider = () => <View style={styles.divider} />;

// Empty state
export const EmptyState = ({ icon, title, subtitle }) => (
    <View style={styles.emptyState}>
        {icon ? <Text style={styles.emptyIcon}>{icon}</Text> : null}
        <Text style={styles.emptyTitle}>{title}</Text>
        {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
);

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: STATUS_TOP,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
    },
    headerSide: { width: 70 },
    headerTitle: {
        ...typography.h3,
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    backBtn: { padding: spacing.xs },
    backBtnText: { fontSize: 15, fontWeight: '500' },
    inputWrapper: { marginBottom: spacing.md },
    inputLabel: {
        ...typography.label,
        marginBottom: spacing.xs,
        color: colors.textSecondary,
    },
    input: {
        backgroundColor: colors.white,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: 15,
        color: colors.text,
        minHeight: 50,
    },
    inputError: { borderColor: colors.danger },
    inputDisabled: { backgroundColor: colors.borderLight, color: colors.textTertiary },
    errorText: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
    btn: {
        borderRadius: radius.md,
        paddingVertical: 14,
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    btnPrimary: { backgroundColor: colors.primary },
    btnSecondary: { backgroundColor: colors.primaryLight, borderWidth: 1.5, borderColor: colors.primary },
    btnDanger: { backgroundColor: colors.danger },
    btnGhost: { backgroundColor: 'transparent' },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
    card: {
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
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.full,
    },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },
    emptyState: { alignItems: 'center', padding: spacing.xxxl },
    emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
    emptyTitle: { ...typography.h3, color: colors.textSecondary, marginBottom: spacing.sm },
    emptySubtitle: { ...typography.bodySmall, textAlign: 'center' },
});