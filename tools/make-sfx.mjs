// Synthesises the app's sound effects into assets/sfx/*.wav.
// Everything is generated from maths, so there are no licensing questions.
// Run with: npm run sfx
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sfx');
mkdirSync(out, { recursive: true });

// Deterministic noise so rebuilding produces identical files.
let seed = 1234567;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

function render(seconds, fn) {
  const n = Math.floor(seconds * RATE);
  const data = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const r = fn(t, t / seconds, (freq) => {
      phase += (2 * Math.PI * freq) / RATE;
      return Math.sin(phase);
    });
    data[i] = r;
  }
  return data;
}

function mix(...tracks) {
  const n = Math.max(...tracks.map((t) => t.length));
  const data = new Float32Array(n);
  for (const t of tracks) for (let i = 0; i < t.length; i++) data[i] += t[i];
  return data;
}

function delay(track, seconds) {
  const pad = Math.floor(seconds * RATE);
  const data = new Float32Array(track.length + pad);
  data.set(track, pad);
  return data;
}

function writeWav(name, samples, gain = 0.8) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  const scale = peak > 0 ? gain / peak : 0;
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((s, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * scale)) * 32767), 44 + i * 2));
  writeFileSync(join(out, `${name}.wav`), buf);
  console.log(`wrote ${name}.wav (${(buf.length / 1024).toFixed(1)} KB)`);
}

const env = (p, attack = 0.02) => Math.min(1, p / attack) * Math.pow(1 - p, 2);

// Bubbly "pop" for selections.
writeWav('pop', render(0.12, (t, p, osc) => osc(500 + 900 * p) * env(p, 0.05)));

// Soft tick for slider steps.
writeWav('tick', render(0.03, (t, p, osc) => osc(1800) * (1 - p) ** 3), 0.35);

// Water drop "bloop": fast downward chirp.
writeWav('bloop', render(0.22, (t, p, osc) => osc(1100 * Math.pow(0.3, p)) * env(p, 0.02)));

// Splash: band-limited noise burst plus a few droplets.
{
  let lp = 0;
  const noise = render(0.5, (t, p) => {
    lp += 0.35 * (rand() - lp);
    return lp * Math.min(1, p / 0.03) * Math.pow(1 - p, 3);
  });
  const drops = [0.06, 0.13, 0.21, 0.3].map((d, i) =>
    delay(render(0.12, (t, p, osc) => osc((1300 - i * 180) * Math.pow(0.4, p)) * env(p, 0.02) * 0.5), d),
  );
  writeWav('splash', mix(noise, ...drops));
}

// Whoosh: noise swept through a resonant filter.
{
  let lp = 0;
  let bp = 0;
  writeWav(
    'whoosh',
    render(0.45, (t, p) => {
      const f = 0.05 + 0.25 * Math.sin(Math.PI * p);
      lp += f * (rand() - lp);
      bp += f * (lp - bp);
      return (lp - bp) * Math.sin(Math.PI * p);
    }),
    0.5,
  );
}

// Success: a happy C-major arpeggio.
{
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const tracks = notes.map((f, i) =>
    delay(render(0.35, (t, p, osc) => (osc(f) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t)) * env(p, 0.02) * 0.6), i * 0.09),
  );
  writeWav('success', mix(...tracks));
}
