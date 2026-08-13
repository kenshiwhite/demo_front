// src/components/BottomSheet.js
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated, Dimensions, Easing, Keyboard, Platform, StyleSheet, TouchableWithoutFeedback, View,
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
// Keyboard avoidance is handled here directly, not via a per-screen
// KeyboardAvoidingView wrapper — KeyboardAvoidingView's internal frame
// math gets confused when nested inside a `transform`-animated ancestor
// (which is exactly what the open/close slide animation below is),
// producing a sheet that floats with a visible gap above the keyboard
// instead of sitting flush against it. Screens should NOT wrap their
// BottomSheet children in KeyboardAvoidingView — this component already
// shifts the whole sheet up by the keyboard's height as part of the same
// transform used for opening/closing.
//
// Usage: replace
//   <Modal visible={x} transparent animationType="slide">
//     <View style={styles.modalOverlay}>...</View>
//   </Modal>
// with
//   <BottomSheet visible={x} onClose={() => setX(false)}>
//     ...same content that used to be inside modalOverlay, minus the
//     outer overlay View (BottomSheet supplies the dim backdrop itself)
//     and minus any KeyboardAvoidingView wrapper...
//   </BottomSheet>
export default function BottomSheet({ visible, onClose, children, dismissible = true, zIndex = 1000 }) {
    const [rendered, setRendered] = useState(visible);
    const translateY = useRef(new Animated.Value(screenHeight)).current;
    const keyboardShift = useRef(new Animated.Value(0)).current;
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

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e) => {
            Animated.timing(keyboardShift, {
                toValue: -(e.endCoordinates?.height || 0),
                duration: Platform.OS === 'ios' ? (e.duration || 250) : 200,
                useNativeDriver: true,
            }).start();
        };
        const onHide = (e) => {
            Animated.timing(keyboardShift, {
                toValue: 0,
                duration: Platform.OS === 'ios' ? (e.duration || 250) : 200,
                useNativeDriver: true,
            }).start();
        };

        const showSub = Keyboard.addListener(showEvent, onShow);
        const hideSub = Keyboard.addListener(hideEvent, onHide);
        return () => { showSub.remove(); hideSub.remove(); };
    }, [keyboardShift]);

    if (!rendered) return null;

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex, elevation: zIndex }]} pointerEvents="box-none">
            <TouchableWithoutFeedback onPress={dismissible ? onClose : undefined}>
                <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]} />
            </TouchableWithoutFeedback>
            <Animated.View
                style={[styles.sheet, { transform: [{ translateY: Animated.add(translateY, keyboardShift) }] }]}
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
        backgroundColor: 'rgba(0,0,0,0.78)',
    },
    sheet: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
    },
});