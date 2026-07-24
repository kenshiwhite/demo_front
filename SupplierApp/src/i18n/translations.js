// Lightweight hand-rolled i18n. The app's existing screens are all
// hardcoded in Russian; this dictionary currently covers the new
// Settings screen and the Profile screen's navigation entry into it.
// Extend this file with more keys as more screens adopt useLanguage().

export const LANGUAGES = [
    { code: 'ru', label: 'Русский' },
    { code: 'kk', label: 'Қазақша' },
    { code: 'en', label: 'English' },
];

export const DEFAULT_LANGUAGE = 'ru';

export const translations = {
    ru: {
        'profile.settings': 'Настройки',
        'settings.title': 'Настройки',
        'settings.language': 'Язык',
        'settings.theme': 'Тема оформления',
        'settings.theme.light': 'Светлая',
        'settings.theme.dark': 'Тёмная',
        'settings.account': 'Аккаунт',
        'settings.delete_account': 'Удалить аккаунт',
        'settings.delete_account.title': 'Удалить аккаунт',
        'settings.delete_account.message': 'Аккаунт будет удален навсегда. Это действие нельзя отменить.',
        'common.back': 'Назад',
        'common.cancel': 'Отмена',
        'common.delete': 'Удалить',
        'common.error': 'Ошибка',
        'settings.delete_account.error': 'Не удалось удалить аккаунт',
    },
    kk: {
        'profile.settings': 'Баптаулар',
        'settings.title': 'Баптаулар',
        'settings.language': 'Тіл',
        'settings.theme': 'Безендіру тақырыбы',
        'settings.theme.light': 'Жарық',
        'settings.theme.dark': 'Қараңғы',
        'settings.account': 'Аккаунт',
        'settings.delete_account': 'Аккаунтты жою',
        'settings.delete_account.title': 'Аккаунтты жою',
        'settings.delete_account.message': 'Аккаунт мүлдем жойылады. Бұл әрекетті болдырмау мүмкін емес.',
        'common.back': 'Артқа',
        'common.cancel': 'Бас тарту',
        'common.delete': 'Жою',
        'common.error': 'Қате',
        'settings.delete_account.error': 'Аккаунтты жою мүмкін болмады',
    },
    en: {
        'profile.settings': 'Settings',
        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.theme': 'Appearance',
        'settings.theme.light': 'Light',
        'settings.theme.dark': 'Dark',
        'settings.account': 'Account',
        'settings.delete_account': 'Delete account',
        'settings.delete_account.title': 'Delete account',
        'settings.delete_account.message': 'Your account will be permanently deleted. This cannot be undone.',
        'common.back': 'Back',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.error': 'Error',
        'settings.delete_account.error': 'Could not delete account',
    },
};