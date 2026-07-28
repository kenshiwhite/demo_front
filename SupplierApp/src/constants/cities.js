// src/constants/cities.js
// Single source of truth for city labels on the frontend. Mirrors
// users.KAZAKHSTAN_CITIES on the backend — keep the two in sync.
export const KAZAKHSTAN_CITIES = [
    { value: 'almaty', label: 'Алматы' },
    { value: 'astana', label: 'Астана' },
    { value: 'shymkent', label: 'Шымкент' },
    { value: 'karaganda', label: 'Қарағанды' },
    { value: 'aktobe', label: 'Ақтөбе' },
    { value: 'taraz', label: 'Тараз' },
    { value: 'pavlodar', label: 'Павлодар' },
    { value: 'ust_kamenogorsk', label: 'Өскемен' },
    { value: 'semey', label: 'Семей' },
    { value: 'atyrau', label: 'Атырау' },
    { value: 'kostanay', label: 'Қостанай' },
    { value: 'kyzylorda', label: 'Қызылорда' },
    { value: 'uralsk', label: 'Орал' },
    { value: 'petropavlovsk', label: 'Петропавл' },
    { value: 'aktau', label: 'Ақтау' },
    { value: 'temirtau', label: 'Теміртау' },
    { value: 'turkestan', label: 'Түркістан' },
    { value: 'taldykorgan', label: 'Талдықорған' },
    { value: 'ekibastuz', label: 'Екібастұз' },
    { value: 'rudny', label: 'Рудный' },
];

export const CITIES_MAP = Object.fromEntries(
    KAZAKHSTAN_CITIES.map(c => [c.value, c.label])
);

export const cityLabel = (code) => CITIES_MAP[code] || code;