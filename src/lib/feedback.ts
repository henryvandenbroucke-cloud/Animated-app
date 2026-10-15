import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useApp } from './store';

const SOURCES = {
  pop: require('../../assets/sfx/pop.wav'),
  tick: require('../../assets/sfx/tick.wav'),
  bloop: require('../../assets/sfx/bloop.wav'),
  splash: require('../../assets/sfx/splash.wav'),
  whoosh: require('../../assets/sfx/whoosh.wav'),
  success: require('../../assets/sfx/success.wav'),
};

export type Sound = keyof typeof SOURCES;

const players: Partial<Record<Sound, AudioPlayer>> = {};

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

function player(name: Sound) {
  if (!modeSet) {
    modeSet = true;
    // Mix with the user's music and still play when the iPhone is on silent.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }
  let p = players[name];
  if (!p) {
    p = createAudioPlayer(SOURCES[name]);
    p.volume = name === 'tick' ? 0.35 : 0.7;
    players[name] = p;
  }
  return p;
}

export function play(name: Sound) {
  if (!unlocked || !useApp.getState().soundOn) return;
  try {
    const p = player(name);
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // Audio is a nicety; never let it break an interaction.
  }
}

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'select' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'select') Haptics.selectionAsync();
    else if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else
      Haptics.impactAsync(
        kind === 'heavy'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : kind === 'medium'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
      );
  } catch {}
}

/** Sound + haptic in one call, for the common case. */
export function feedback(sound: Sound, kind: Parameters<typeof haptic>[0] = 'light') {
  play(sound);
  haptic(kind);
}
