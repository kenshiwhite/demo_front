import React, { useMemo, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { spacing, radius, STATUS_TOP, shadow } from '../styles/theme';
import Icon from '../components/Icon';

export default function SettingsScreen({ onClose }) {
    const { signOut } = useAuth();
    const { mode, colors, setThemeMode } = useTheme();
    const { language, languages, t, setLanguage } = useLanguage();
    const [deleting, setDeleting] = useState(false);

    const styles = useMemo(() => createStyles(colors), [colors]);

    const handleDeleteAccount = () => {
        Alert.alert(
            t('settings.delete_account.title'),
            t('settings.delete_account.message'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await client.delete('/api/auth/account/');
                            await signOut();
                        } catch (e) {
                            Alert.alert(
                                t('common.error'),
                                e.response?.data?.detail || t('settings.delete_account.error')
                            );
                        } finally {
                            setDeleting(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
                    <Icon name="chevronLeft" size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('settings.title')}</Text>
                <View style={styles.headerBtn} />
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {/* Language */}
                <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
                <View style={styles.card}>
                    {languages.map((lang, index) => {
                        const active = language === lang.code;
                        return (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.optionRow,
                                    index < languages.length - 1 && styles.optionRowBorder
                                ]}
                                onPress={() => setLanguage(lang.code)}
                            >
                                <Text style={styles.optionText}>{lang.label}</Text>
                                <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                                    {active && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Theme */}
                <Text style={styles.sectionLabel}>{t('settings.theme')}</Text>
                <View style={styles.card}>
                    {[
                        { key: 'light', label: t('settings.theme.light'), icon: 'eye' },
                        { key: 'dark', label: t('settings.theme.dark'), icon: 'eye' },
                    ].map((opt, index, arr) => {
                        const active = mode === opt.key;
                        return (
                            <TouchableOpacity
                                key={opt.key}
                                style={[
                                    styles.optionRow,
                                    index < arr.length - 1 && styles.optionRowBorder
                                ]}
                                onPress={() => setThemeMode(opt.key)}
                            >
                                <Text style={styles.optionText}>{opt.label}</Text>
                                <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                                    {active && <View style={styles.radioInner} />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Account */}
                <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.deleteRow}
                        onPress={handleDeleteAccount}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <ActivityIndicator size="small" color={colors.danger} />
                        ) : (
                            <>
                                <Icon name="trash" size={16} color={colors.danger} />
                                <Text style={styles.deleteText}>{t('settings.delete_account')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const createStyles = (colors) => StyleSheet.create({
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
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    body: { flex: 1, padding: spacing.lg },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
        marginTop: spacing.lg,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        ...shadow.sm,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    optionRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    optionText: { fontSize: 15, color: colors.text, fontWeight: '500' },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioOuterActive: { borderColor: colors.primary },
    radioInner: {
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    deleteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
    },
    deleteText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});