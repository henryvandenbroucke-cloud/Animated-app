import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useApp } from './store';

// Built by tools/build-sfx.py from CC0 recordings (see assets/sfx/CREDITS.md).
// Sounds with several takes are picked at random so repeats never sound mechanical.
const SOURCES = {
  tap: [require('../../assets/sfx/tap-1.wav'), require('../../assets/sfx/tap-2.wav'), require('../../assets/sfx/tap-3.wav')],
  select: [require('../../assets/sfx/select-1.wav'), require('../../assets/sfx/select-2.wav'), require('../../assets/sfx/select-3.wav')],
  tick: [require('../../assets/sfx/tick-1.wav'), require('../../assets/sfx/tick-2.wav'), require('../../assets/sfx/tick-3.wav')],
  toggle: [require('../../assets/sfx/toggle-1.wav'), require('../../assets/sfx/toggle-2.wav'), require('../../assets/sfx/toggle-3.wav')],
  pour: [require('../../assets/sfx/pour-1.wav'), require('../../assets/sfx/pour-2.wav'), require('../../assets/sfx/pour-3.wav')],
  boop: [require('../../assets/sfx/boop-1.wav'), require('../../assets/sfx/boop-2.wav'), require('../../assets/sfx/boop-3.wav')],
  swim: [require('../../assets/sfx/swim.wav')],
  success: [require('../../assets/sfx/success.wav')],
  celebrate: [require('../../assets/sfx/celebrate.wav')],
  unlock: [require('../../assets/sfx/unlock.wav')],
  open: [require('../../assets/sfx/open.wav')],
  error: [require('../../assets/sfx/error.wav')],
};

export type Sound = keyof typeof SOURCES;

/** Minimum gap between two plays of the same sound, so fast drags don't machine-gun. */
const MIN_GAP_MS: Partial<Record<Sound, number>> = { tick: 45, tap: 40, select: 50, boop: 90 };

const players = new Map<string, AudioPlayer>();
const lastTake: Partial<Record<Sound, number>> = {};
const lastAt: Partial<Record<Sound, number>> = {};

// Browsers refuse to play audio until the user has interacted with the page.
let unlocked = Platform.OS !== 'web';
if (!unlocked && typeof document !== 'undefined') {
  const unlock = () => {
    unlocked = true;
  };
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });
}
let modeSet = false;

function player(name: Sound, take: number) {
  if (!modeSet) {
    modeSet = true;
    // Mix with the user's music and still play when the iPhone is on silent.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }
  const key = `${name}-${take}`;
  let p = players.get(key);
  if (!p) {
    p = createAudioPlayer(SOURCES[name][take]);
    players.set(key, p);
  }
  return p;
}

/** Pick a take that differs from the last one, so two taps in a row never sound identical. */
function pickTake(name: Sound) {
  const n = SOURCES[name].length;
  if (n === 1) return 0;
  let take = Math.floor(Math.random() * n);
  if (take === lastTake[name]) take = (take + 1 + Math.floor(Math.random() * (n - 1))) % n;
  lastTake[name] = take;
  return take;
}

export function play(name: Sound, volume = 1) {
  if (!unlocked || !useApp.getState().soundOn) return;
  const now = Date.now();
  const gap = MIN_GAP_MS[name];
  if (gap && now - (lastAt[name] ?? 0) < gap) return;
  lastAt[name] = now;
  try {
    const p = player(name, pickTake(name));
    // A touch of random level variation keeps repeated sounds organic.
    p.volume = Math.min(1, volume * (0.88 + Math.random() * 0.12));
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Audio is a nicety; never let it break an interaction.
  }
}

/** Warm up the players for the sounds used right away, so the first tap isn't delayed. */
export function preloadSounds() {
  (['tap', 'select', 'pour'] as Sound[]).forEach((n) => SOURCES[n].forEach((_, i) => player(n, i)));
}

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'soft' | 'select' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web' || !useApp.getState().hapticsOn) return;
  try {
    if (kind === 'select') Haptics.selectionAsync();
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else
      Haptics.impactAsync(
        {
          light: Haptics.ImpactFeedbackStyle.Light,
          medium: Haptics.ImpactFeedbackStyle.Medium,
          heavy: Haptics.ImpactFeedbackStyle.Heavy,
          soft: Haptics.ImpactFeedbackStyle.Soft,
        }[kind],
      );
  } catch {}
}

/** Sound + haptic in one call, for the common case. */
export function feedback(sound: Sound, kind: Parameters<typeof haptic>[0] = 'light') {
  play(sound);
  haptic(kind);
}
