// ============================================
// MitrRAI - Haptic Feedback Utility
// Triggers phone vibration for native-app feel
// ============================================

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const patterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 30,
  heavy: 50,
  success: [30, 20, 30],
  error: [50, 30, 50, 30, 50],
};

export function haptic(type: HapticType = 'light') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(patterns[type]);
  }
}
