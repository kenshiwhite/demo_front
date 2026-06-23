import { Dimensions, Platform } from 'react-native';

export const screen = Dimensions.get('window');

export const colors = {
    primary: '#4F46E5',
    primaryDark: '#3730A3',
    primaryLight: '#EEF2FF',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    purple: '#6366F1',
    white: '#FFFFFF',
    background: '#F8F9FF',
    card: '#FFFFFF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    placeholder: '#9CA3AF',
};

export const typography = {
    h1: { fontSize: 24, fontWeight: '700', color: colors.text },
    h2: { fontSize: 20, fontWeight: '700', color: colors.text },
    h3: { fontSize: 17, fontWeight: '600', color: colors.text },
    h4: { fontSize: 15, fontWeight: '600', color: colors.text },
    body: { fontSize: 15, fontWeight: '400', color: colors.text },
    bodySmall: { fontSize: 13, fontWeight: '400', color: colors.textSecondary },
    caption: { fontSize: 12, fontWeight: '400', color: colors.textTertiary },
    label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const radius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
};

export const shadow = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
};

export const STATUS_TOP = Platform.OS === 'ios' ? 56 : 44;