// src/components/BottomSheet.js
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated, Dimensions, Easing, StyleSheet, TouchableWithoutFeedback, View,
} from 'react-native';

const screenHeight = Dimensions.get('window').height;

// Generic slide-up-from-bottom sheet used for every "mini window" popup
// (respond to request, add/edit product, add client, create worker, cart
// checkout, etc). Mirrors the Sidebar's animation exactly — same easing,
// duration and fade-in backdrop — so every overlay in the app opens and
// closes the same way.
//
// Deliberately NOT built on React Native's native <Modal>: a native Modal
// opens its own OS-level window, and having two of them mounted at once
// (e.g. one closing while another opens, which happens the instant you
// navigate from one sheet straight into another) reliably freezes/crashes
// on Android. Sidebar/ScreenOverlay never had this problem because they're
// just plain absolutely-positioned views layered in-tree — so BottomSheet
// uses that same approach. Any number of these can be open/animating at
// once safely.
//
// Usage: replace
//   <Modal visible={x} transparent animationType="slide">
//     <View style={styles.modalOverlay}>...</View>
//   </Modal>
// with
//   <BottomSheet visible={x} onClose={() => setX(false)}>
//     ...same content that used to be inside modalOverlay, minus the
//     outer overlay View (BottomSheet supplies the dim backdrop itself)...
//   </BottomSheet>
export default function BottomSheet({ visible, onClose, children, dismissible = true, zIndex = 1000 }) {
    const [rendered, setRendered] = useState(visible);
    const translateY = useRef(new Animated.Value(screenHeight)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const cachedChildren = useRef(children);

    if (visible) {
        cachedChildren.current = children;
    }

    useEffect(() => {
        if (visible) {
            setRendered(true);
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 1, duration: 280, useNativeDriver: true,
                }),
            ]).start();
        } else if (rendered) {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: screenHeight, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0, duration: 220, useNativeDriver: true,
                }),
            ]).start(({ finished }) => { if (finished) setRendered(false); });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    if (!rendered) return null;

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex, elevation: zIndex }]} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={dismissible ? onClose : undefined}>
                <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
            </TouchableWithoutFeedback>
            <Animated.View
                style={[styles.sheet, { transform: [{ translateY }] }]}
                pointerEvents="box-none"
            >
                {cachedChildren.current}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
});