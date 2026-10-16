import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { play } from '../lib/feedback';
import { colors, fonts } from '../theme';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max height as a share of the screen. */
  height?: number;
};

/** Bottom sheet that springs up, dims the screen behind it, and can be dragged down to close. */
export function Sheet({ open, onClose, title, children, height = 0.8 }: Props) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  // Mount as soon as it opens (adjusting state during render, as React recommends over an effect).
  if (open && !mounted) setMounted(true);
  const y = useSharedValue(screenH);
  const dim = useSharedValue(0);

  useEffect(() => {
    if (open) {
      play('open');
      y.set(withSpring(0, { damping: 20, stiffness: 190, mass: 0.9 }));
      dim.set(withTiming(1, { duration: 220 }));
    } else if (mounted) {
      dim.set(withTiming(0, { duration: 200 }));
      y.set(withTiming(screenH, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      }));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      // Dragging up meets resistance; dragging down follows the finger.
      y.set(e.translationY > 0 ? e.translationY : e.translationY * 0.2);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) scheduleOnRN(onClose);
      else y.set(withSpring(0, { damping: 18, stiffness: 220 }));
    });

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: dim.value * 0.4 }));

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#1B1220' }, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { maxHeight: screenH * height, paddingBottom: Math.max(insets.bottom, 16) }, sheet]}>
          <GestureDetector gesture={pan}>
            <View style={styles.grabZone}>
              <View style={styles.grabber} />
              {title ? <Text style={styles.title}>{title}</Text> : null}
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  grabZone: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.line },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, marginTop: 10 },
});
