#!/usr/bin/env python3
"""
Builds assets/sfx/*.wav from real recordings that are released into the public domain (CC0).

Sources (all CC0 1.0, no attribution required, credited in assets/sfx/CREDITS.md anyway):
  - Kenney "Interface Sounds"  https://kenney.nl/assets/interface-sounds
  - "Bubble sound effects" by BMacZero          https://opengameart.org/content/bubble-sound-effects
  - "40 CC0 water / splash / slime SFX" by rubberduck  https://opengameart.org/content/40-cc0-water-splash-slime-sfx

What this script does to them, following common UI sound-design practice:
  - trims leading silence so a sound starts the instant you tap (no perceived lag),
  - short fade-out so nothing clicks at the end,
  - levels every sound to a shared loudness, with quieter "texture" sounds (slider ticks),
  - layers water sounds (splash + bubbles) so pouring feels physical rather than like a beep,
  - renders 3 slightly different pitches of each sound; the app picks one at random so
    repeated taps never sound like the same robotic sample.

Usage: python3 tools/build-sfx.py   (needs ffmpeg and numpy; downloads into tools/.sfx-cache)
"""
import io
import os
import subprocess
import sys
import urllib.request
import wave
import zipfile

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, 'tools', '.sfx-cache')
OUT = os.path.join(ROOT, 'assets', 'sfx')
SR = 44100

ZIPS = {
    'interface': 'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip',
    'water': 'https://opengameart.org/sites/default/files/water-splash-slime-sfx.zip',
}
FILES = {
    'bubble-single1': 'https://opengameart.org/sites/default/files/bubbles-single1.wav',
    'bubble-single2': 'https://opengameart.org/sites/default/files/bubbles-single2.wav',
    'bubble-loop1': 'https://opengameart.org/sites/default/files/bubbles-loop1-amp.wav',
}


def fetch():
    os.makedirs(CACHE, exist_ok=True)
    for name, url in ZIPS.items():
        dest = os.path.join(CACHE, name)
        if not os.path.isdir(dest):
            print('downloading', url)
            data = urllib.request.urlopen(url, timeout=60).read()
            zipfile.ZipFile(io.BytesIO(data)).extractall(dest)
    for name, url in FILES.items():
        dest = os.path.join(CACHE, name + '.wav')
        if not os.path.exists(dest):
            print('downloading', url)
            urllib.request.urlretrieve(url, dest)


def find(pack, filename):
    for root, _, files in os.walk(os.path.join(CACHE, pack)):
        if filename in files:
            return os.path.join(root, filename)
    raise FileNotFoundError(f'{pack}/{filename}')


def load(path):
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, np.float32).astype(np.float64)


def trim(x, threshold=0.02, pre_ms=2):
    """Cut leading silence (keeping a couple of ms) and trailing silence."""
    env = np.abs(x)
    above = np.where(env > env.max() * threshold)[0]
    if not len(above):
        return x
    start = max(0, above[0] - int(SR * pre_ms / 1000))
    end = min(len(x), above[-1] + int(SR * 0.01))
    return x[start:end]


def fade(x, in_ms=1.5, out_ms=25):
    x = x.copy()
    n_in = min(len(x), int(SR * in_ms / 1000))
    n_out = min(len(x) // 3, int(SR * out_ms / 1000))
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out) ** 2
    return x


def pitch(x, ratio):
    """Resample to shift pitch (and length together, like a tape), which keeps transients natural."""
    if ratio == 1:
        return x
    idx = np.arange(0, len(x) - 1, ratio)
    return np.interp(idx, np.arange(len(x)), x)


def lowpass(x, cutoff):
    """Gentle one-pole low-pass to take harsh fizz off bright recordings."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def mix(*layers):
    """layers: (signal, offset_ms, gain)"""
    n = max(len(s) + int(SR * off / 1000) for s, off, _ in layers)
    out = np.zeros(n)
    for s, off, g in layers:
        o = int(SR * off / 1000)
        out[o:o + len(s)] += s * g
    return out


def level(x, target_db):
    """Scale so the loudest 30 ms window sits at target_db RMS (short-term loudness)."""
    win = int(SR * 0.03)
    if len(x) <= win:
        rms = np.sqrt(np.mean(x ** 2))
    else:
        c = np.convolve(x ** 2, np.ones(win) / win, mode='valid')
        rms = np.sqrt(c.max())
    gain = 10 ** (target_db / 20) / (rms + 1e-12)
    y = x * gain
    peak = np.abs(y).max()
    if peak > 0.89:  # keep 1 dB of headroom
        y *= 0.89 / peak
    return y


def write(name, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(22050)
        # Store at 22.05 kHz to keep files small; these sounds have little content above 10 kHz.
        down = pcm[::2] if SR == 44100 else pcm
        w.writeframes(down.tobytes())


def variants(name, make, ratios=(0.96, 1.0, 1.045), db=-14):
    for i, r in enumerate(ratios):
        write(f'{name}-{i + 1}', fade(level(pitch(make(i), r), db)))


def main():
    fetch()
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.wav'):
            os.remove(os.path.join(OUT, f))

    ui = lambda f: trim(load(find('interface', f)))
    water = lambda f: trim(load(find('water', f)))
    single = lambda n: trim(load(os.path.join(CACHE, n + '.wav')), threshold=0.05)

    # Buttons: a soft, rounded "thock" (tonal, very short, low brightness).
    tap = ui('click_002.ogg')
    variants('tap', lambda i: tap, db=-12)

    # Picking a chip or a drink: a bubbly plink, alternating two takes.
    plinks = [ui('drop_002.ogg'), ui('drop_003.ogg'), ui('drop_002.ogg')]
    variants('select', lambda i: plinks[i], ratios=(1.0, 1.0, 1.06), db=-15)

    # Slider steps: a tiny, quiet tick so dragging feels like a ratchet, not a beeping machine.
    tick = ui('click_003.ogg')
    variants('tick', lambda i: tick, ratios=(0.97, 1.0, 1.03), db=-24)

    # Toggles.
    variants('toggle', lambda i: ui('toggle_001.ogg'), db=-16)

    # Adding a drink: a real splash softened by a low-pass, then two bubbles rising after it.
    splashes = [lowpass(water(f), 5200) for f in ('splash_10.ogg', 'splash_09.ogg', 'splash_10.ogg')]
    b1, b2 = single('bubble-single2'), single('bubble-single1')
    bub = water('bubble_02.ogg')
    pours = [
        mix((splashes[0], 0, 0.55), (b1, 40, 1.0), (bub, 150, 0.6)),
        mix((splashes[1], 0, 0.55), (b2, 50, 1.0), (b1, 170, 0.5)),
        mix((splashes[2], 0, 0.5), (bub, 35, 0.8), (b2, 140, 0.7)),
    ]
    variants('pour', lambda i: pours[i], db=-13)

    # Poking Sippy: one round bubble, pitched up a little so it reads as cute.
    snappy = lambda x: trim(x, threshold=0.12)
    variants('boop', lambda i: [snappy(b1), snappy(b2), snappy(b1)][i], ratios=(1.15, 1.08, 1.28), db=-14)

    # Swimming past: a short burst of bubbles from a real underwater loop, faded in and out.
    loop = load(os.path.join(CACHE, 'bubble-loop1.wav'))
    start = int(SR * 3.6)
    swim = loop[start:start + int(SR * 0.9)]
    swim = swim * np.sin(np.linspace(0, np.pi, len(swim))) ** 1.5
    write('swim', level(swim, -20))

    # Rewards. Short and warm for small wins, a longer rising chime for big ones.
    write('success', fade(level(ui('confirmation_001.ogg'), -14), out_ms=60))
    write('celebrate', fade(level(ui('confirmation_004.ogg'), -14), out_ms=80))
    write('unlock', fade(level(ui('maximize_009.ogg'), -15), out_ms=60))
    write('open', fade(level(ui('maximize_008.ogg'), -18), out_ms=40))

    # Gentle "nope" for errors: low and soft, never a harsh buzzer.
    write('error', fade(level(ui('error_005.ogg'), -17)))

    print('wrote', sorted(f for f in os.listdir(OUT) if f.endswith('.wav')))


if __name__ == '__main__':
    sys.exit(main())
