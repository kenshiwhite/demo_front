// src/components/AnimatedPrimitives.js
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Easing } from 'react-native';

// ---------------------------------------------------------------------------
// ScreenOverlay
// ---------------------------------------------------------------------------
// Drop-in replacement for the "{visible && <View style={StyleSheet.absoluteFill}>...}"
// pattern used throughout the app to show a full-screen child (ProductDetailScreen,
// RequestDetailScreen, ProfileScreen, city pickers, etc.) on top of the current
// screen. That pattern appears/disappears instantly with no transition; this
// version fades in and slides up on entry, and mirrors that on exit.
//
// It keeps rendering the *last* non-empty children during the exit animation
// (via a ref cache) so that closing doesn't blank out mid-fade if the parent
// clears its underlying data (e.g. setSelectedProduct(null)) the same tick it
// flips `visible` to false.
export function ScreenOverlay({ visible, children, zIndex = 999, duration = 260 }) {
    const [rendered, setRendered] = useState(visible);
    const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
    const cachedChildren = useRef(children);

    if (visible) {
        cachedChildren.current = children;
    }

    useEffect(() => {
        if (visible) {
            setRendered(true);
            Animated.timing(progress, {
                toValue: 1,
                duration,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start();
        } else if (rendered) {
            Animated.timing(progress, {
                toValue: 0,
                duration: Math.round(duration * 0.85),
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) setRendered(false);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    if (!rendered) return null;

    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                { zIndex, elevation: zIndex, opacity: progress, transform: [{ translateY }] },
            ]}
            pointerEvents={visible ? 'auto' : 'none'}
        >
            {cachedChildren.current}
        </Animated.View>
    );
}

// ---------------------------------------------------------------------------
// CrossFade
// ---------------------------------------------------------------------------
// Wraps the many "in-screen tab" patterns (view === 'home' ? <A/> : view === 'products' ? <B/> : ...)
// so switching between them crossfades + gently slides instead of hard-cutting.
// Usage: <CrossFade activeKey={view}>{content}</CrossFade>
// `content` should be whatever JSX you'd normally render for the active tab;
// CrossFade re-plays the transition whenever `activeKey` changes.
export function CrossFade({ activeKey, children, duration = 220, style }) {
    const progress = useRef(new Animated.Value(1)).current;
    const prevKey = useRef(activeKey);

    useEffect(() => {
        if (prevKey.current === activeKey) return;
        prevKey.current = activeKey;
        progress.setValue(0);
        Animated.timing(progress, {
            toValue: 1,
            duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, [activeKey]);

    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

    return (
        <Animated.View style={[{ flex: 1, opacity: progress, transform: [{ translateY }] }, style]}>
            {children}
        </Animated.View>
    );
}

// ---------------------------------------------------------------------------
// AnimatedListItem
// ---------------------------------------------------------------------------
// Wrap a FlatList/ScrollView row's content in this to get a subtle staggered
// fade + slide-up entrance the first time it appears. Pass the row's `index`
// so items cascade in rather than all popping in at once.
export function AnimatedListItem({ index = 0, children, style }) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: 1,
            duration: 260,
            delay: Math.min(index, 8) * 35,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

    return (
        <Animated.View style={[{ opacity: progress, transform: [{ translateY }] }, style]}>
            {children}
        </Animated.View>
    );
}

// ---------------------------------------------------------------------------
// FadeIn
// ---------------------------------------------------------------------------
// Simple one-shot fade-in wrapper for anything that just needs to not "pop"
// onto the screen (banners, empty states, section reveals).
export function FadeIn({ children, duration = 300, style, delay = 0 }) {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progress, {
            toValue: 1,
            duration,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <Animated.View style={[{ opacity: progress }, style]}>{children}</Animated.View>;
}