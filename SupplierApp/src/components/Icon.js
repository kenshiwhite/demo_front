import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
    Path, Circle, Rect, Line, Polyline,
    Polygon, G
} from 'react-native-svg';

const icons = {
    bell: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    user: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    cart: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M16 10a4 4 0 0 1-8 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    grid: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    list: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Line x1="8" y1="6" x2="21" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="8" y1="12" x2="21" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="8" y1="18" x2="21" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="3" y1="6" x2="3.01" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <Line x1="3" y1="12" x2="3.01" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <Line x1="3" y1="18" x2="3.01" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </Svg>
    ),
    chevronRight: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polyline points="9,18 15,12 9,6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    chevronLeft: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polyline points="15,18 9,12 15,6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    plus: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </Svg>
    ),
    minus: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </Svg>
    ),
    trash: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polyline points="3,6 5,6 21,6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    edit: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    check: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polyline points="20,6 9,17 4,12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    x: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </Svg>
    ),
    package: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Line x1="16.5" y1="9.4" x2="7.5" y2="4.21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Polyline points="3.27,6.96 12,12.01 20.73,6.96" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Line x1="12" y1="22.08" x2="12" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    truck: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect x="1" y="3" width="15" height="13" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Polygon points="16,8 20,8 23,11 23,16 16,16 16,8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.8"/>
            <Circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.8"/>
        </Svg>
    ),
    calendar: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </Svg>
    ),
    phone: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.45 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.08 5.83l.92-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    mail: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Polyline points="22,6 12,13 2,6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    lock: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    logout: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Polyline points="16,17 21,12 16,7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    bar_chart: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </Svg>
    ),
    image: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth="1.8"/>
            <Polyline points="21,15 16,10 5,21" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    store: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Polyline points="9,22 9,12 15,12 15,22" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    clock: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8"/>
            <Polyline points="12,6 12,12 16,14" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    search: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="1.8"/>
            <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </Svg>
    ),
    eye: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.8"/>
        </Svg>
    ),
    filter: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    info: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8"/>
            <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="12" y1="16" x2="12.01" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </Svg>
    ),
    warning: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
            <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </Svg>
    ),
    map_pin: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.8"/>
        </Svg>
    ),
    building: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M3 9h18M9 21V9" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    layers: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polygon points="12,2 2,7 12,12 22,7 12,2" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Polyline points="2,17 12,22 22,17" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Polyline points="2,12 12,17 22,12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    trending_up: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polyline points="23,6 13.5,15.5 8.5,10.5 1,18" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Polyline points="17,6 23,6 23,12" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
    refresh: (color, size) => (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polyline points="23,4 23,10 17,10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
    ),
};

export default function Icon({ name, size = 24, color = '#111827' }) {
    const renderFn = icons[name];
    if (!renderFn) return null;
    return renderFn(color, size);
}