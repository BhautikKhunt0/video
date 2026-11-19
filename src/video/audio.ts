import { VO } from '../assets/voData';
import { DUR, mulberry32, wordT } from './core';
import { COFFEE } from './scenes/coffee';
import { GLASS } from './scenes/glass';

const SR = 44100;
const N = {
  D1: 36.71, D2: 73.42, A2: 110, G2: 98, Bb2: 116.54, D3: 146.83, F3: 174.61, A3: 220, Bb3: 233.08, C4: 261.63, D4: 293.66, E4: 329.63,
  F4: 349.23, Fs4: 369.99, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66,
};

function impulse(ctx: BaseAudioContext, secs: number, decay: number, seed = 3) {
  const len = Math.floor(secs * ctx.sampleRate);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const r = mulberry32(seed);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 400 ? i / 400 : 1);
  }
  return buf;
}
function noiseBuf(ctx: BaseAudioContext, secs = 4) {
  const len = Math.floor(secs * ctx.sampleRate);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  const r = mulberry32(99);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1;
  }
  return buf;
}

interface ToneOpts { type?: OscillatorType; vol?: number; a?: number; r?: number; to?: number; lp?: number; detune?: number; pan?: number; curve?: 'exp' | 'lin' }
interface NoiseOpts { type?: BiquadFilterType; f: number; f2?: number; q?: number; vol?: number; a?: number; r?: number }

export async function buildScore(): Promise<AudioBuffer> {
  const oc = new OfflineAudioContext(2, Math.floor(SR * (DUR + 1.5)), SR);
  const rnd = mulberry32(2025);
  const nb = noiseBuf(oc);

  // master chain
  const master = oc.createGain();
  master.gain.value = 0.6;
  const comp = oc.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
  const lim = oc.createDynamicsCompressor();
  lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
  master.connect(comp).connect(lim).connect(oc.destination);
  master.gain.setValueAtTime(0.6, 0);
  master.gain.setValueAtTime(0.6, 118.6);
  master.gain.linearRampToValueAtTime(0.0, 120.0);

  // buses
  const musicBus = oc.createGain();
  const sfxBus = oc.createGain();
  sfxBus.gain.value = 0.9;
  const verb = oc.createConvolver();
  verb.buffer = impulse(oc, 3.6, 2.4);
  const verbIn = oc.createGain();
  verbIn.gain.value = 0.55;
  const verbOut = oc.createGain();
  verbOut.gain.value = 0.85;
  verbIn.connect(verb).connect(verbOut).connect(master);
  musicBus.connect(master);
  musicBus.connect(verbIn);
  sfxBus.connect(master);
  const sfxSend = oc.createGain();
  sfxSend.gain.value = 0.35;
  sfxBus.connect(sfxSend).connect(verbIn);

  // --- ducking automation (merge VO windows)
  const wins: [number, number][] = [];
  VO.forEach((l) => {
    const a = l.start - 0.15, b = l.start + l.dur + 0.25;
    if (wins.length && a - wins[wins.length - 1][1] < 0.7) wins[wins.length - 1][1] = b;
    else wins.push([a, b]);
  });
  musicBus.gain.setValueAtTime(1, 0);
  wins.forEach(([a, b]) => {
    musicBus.gain.setTargetAtTime(0.42, a, 0.12);
    musicBus.gain.setTargetAtTime(1.0, b, 0.35);
  });

  // ---- primitives
  const tone = (dest: AudioNode, t: number, dur: number, f: number, o: ToneOpts = {}) => {
    const osc = oc.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = oc.createGain();
    const v = o.vol ?? 0.1, a = o.a ?? 0.01, r = o.r ?? 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.setValueAtTime(v, Math.max(t + a, t + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = osc;
    if (o.lp) {
      const lp = oc.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = 0.5;
      osc.connect(lp); node = lp;
    }
    node.connect(g);
    let out: AudioNode = g;
    if (o.pan !== undefined) {
      const p = oc.createStereoPanner();
      p.pan.value = o.pan;
      g.connect(p); out = p;
    }
    out.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };
  const noise = (dest: AudioNode, t: number, dur: number, o: NoiseOpts) => {
    const s = oc.createBufferSource();
    s.buffer = nb;
    s.loop = true;
    const f = oc.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.q ?? 1;
    const g = oc.createGain();
    const v = o.vol ?? 0.2, a = o.a ?? 0.01, r = o.r ?? 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.setValueAtTime(v, Math.max(t + a, t + dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, rnd() * 2);
    s.stop(t + dur + 0.05);
  };
  const pad = (dest: AudioNode, t: number, dur: number, freqs: number[], vol: number, lp = 900, a = 2.5, r = 3) => {
    freqs.forEach((f, i) => {
      [-7, 7].forEach((d) => tone(dest, t, dur, f, { type: 'sawtooth', vol: vol / freqs.length, a, r, lp: lp * (1 + i * 0.05), detune: d }));
      tone(dest, t, dur, f * 0.5, { type: 'sine', vol: (vol / freqs.length) * 0.8, a, r });
    });
  };
  const ping = (dest: AudioNode, t: number, f: number, vol = 0.05, dur = 1.8, pan = 0) => {
    tone(dest, t, dur, f, { type: 'sine', vol, a: 0.004, r: dur * 0.95, pan });
    tone(dest, t, dur * 0.6, f * 2.005, { type: 'sine', vol: vol * 0.35, a: 0.004, r: dur * 0.5, pan });
    tone(dest, t, dur * 0.25, f * 3.01, { type: 'sine', vol: vol * 0.18, a: 0.004, r: dur * 0.2, pan });
  };
  const revPing = (dest: AudioNode, t: number, f: number, vol = 0.05, dur = 0.7, pan = 0) => {
    // swell then cut (reversed envelope)
    const osc = oc.createOscillator();
    osc.frequency.value = f;
    const g = oc.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.02);
    const p = oc.createStereoPanner(); p.pan.value = pan;
    osc.connect(g).connect(p).connect(dest);
    osc.start(t); osc.stop(t + dur + 0.05);
  };
  const boom = (t: number, vol = 0.7, f = 62) => {
    tone(sfxBus, t, 2.6, f * 1.5, { to: f * 0.5, vol, a: 0.005, r: 2.2 });
    tone(sfxBus, t, 3.5, f, { vol: vol * 0.7, a: 0.01, r: 3 });
    noise(sfxBus, t, 0.9, { type: 'lowpass', f: 1800, f2: 80, vol: vol * 0.55, r: 0.8 });
  };
  const riser = (t0: number, t1: number, vol = 0.18, f0 = 200, f1 = 9000) => {
    noise(sfxBus, t0, t1 - t0, { type: 'bandpass', f: f0, f2: f1, q: 1.8, vol, a: (t1 - t0) * 0.85, r: 0.04 });
    tone(sfxBus, t0, t1 - t0, f0 * 0.6, { to: f1 * 0.12, type: 'sawtooth', vol: vol * 0.28, a: (t1 - t0) * 0.9, r: 0.04, lp: 2500 });
  };
  const whoosh = (t: number, dur = 0.8, up = true, vol = 0.25) => {
    noise(sfxBus, t, dur, { type: 'bandpass', f: up ? 250 : 7000, f2: up ? 7000 : 250, q: 1.2, vol, a: dur * 0.45, r: dur * 0.4 });
  };
  const click = (t: number, vol = 0.08, f = 5000) => noise(sfxBus, t, 0.03, { type: 'highpass', f, q: 0.7, vol, a: 0.001, r: 0.025 });
  const tick = (t: number, vol = 0.12) => {
    tone(sfxBus, t, 0.06, 1700, { vol, a: 0.001, r: 0.05 });
    tone(sfxBus, t, 0.09, 220, { to: 120, vol: vol * 1.1, a: 0.001, r: 0.08 });
  };

  const M = musicBus, S = sfxBus;

  // ================= S1: THE QUESTION (0 – 20.8) =================
  tone(M, 0, 20.8, N.D2, { type: 'sine', vol: 0.16, a: 4, r: 2 });
  tone(M, 0, 20.8, N.A2, { type: 'triangle', vol: 0.05, a: 5, r: 2 });
  pad(M, 0.5, 20.3, [N.D3, N.F3, N.A3, N.E4], 0.07, 650, 4, 2);
  riser(0.1, 1.05, 0.22, 150, 5500);
  boom(1.05, 0.85, 55);
  for (let i = 0; i < 9; i++) ping(M, 2.9 + i * 1.7 + rnd() * 0.5, [N.D5, N.F5, N.A5, N.C6, N.E5][i % 5], 0.028, 2.6, rnd() * 1.4 - 0.7);
  // 'disorder': dissonant stinger + glitch
  const tDis = wordT(2, 'disorder');
  [233.08, 246.94, 261.63, 277.18].forEach((f) => tone(S, tDis, 1.2, f, { type: 'sawtooth', vol: 0.035, a: 0.01, r: 1.0, lp: 1800 }));
  for (let i = 0; i < 9; i++) click(tDis + 0.04 + i * 0.045 + rnd() * 0.02, 0.1, 2500 + rnd() * 5000);
  // arrow of time
  const tTime = wordT(2, 'time');
  tone(S, tTime, 1.9, 220, { to: 880, type: 'sine', vol: 0.05, a: 0.4, r: 0.8 });
  // heat death: pitch fall + fade
  const tUni = wordT(2, 'universe');
  tone(S, tUni, 4.5, 146.8, { to: 55, type: 'sine', vol: 0.09, a: 0.8, r: 2.5 });
  noise(S, tUni, 4, { type: 'lowpass', f: 900, f2: 90, vol: 0.06, a: 1, r: 2 });
  // question
  tone(M, 15.4, 4, N.A5, { type: 'sine', vol: 0.025, a: 1.2, r: 1.5 });
  tone(M, 15.6, 4, N.Fs5 * 0.99, { type: 'sine', vol: 0.02, a: 1.2, r: 1.5 });
  riser(18.2, 20.75, 0.3, 200, 10000);
  tone(S, 18.6, 2.15, 90, { to: 1400, type: 'sawtooth', vol: 0.05, a: 1.9, r: 0.05, lp: 2800 });
  boom(20.8, 0.95, 50);
  whoosh(20.55, 0.6, false, 0.2);

  // ================= S2: ICE & COFFEE (20.8 – 45) =================
  pad(M, 21.0, 12.6, [N.Bb2, N.F3, N.A3, N.D4], 0.075, 800, 2.5, 3);
  tone(M, 21.0, 12.6, N.Bb2 * 0.5, { type: 'sine', vol: 0.12, a: 2, r: 2 });
  const arp = [N.D4, N.F4, N.A4, N.C5, N.A4, N.F4];
  for (let i = 0, t = 22.0; t < 33.2; t += 0.5, i++) ping(M, t, arp[i % 6], 0.024, 1.4, ((i % 6) - 2.5) * 0.18);
  noise(S, 21.2, 12, { type: 'highpass', f: 5500, q: 0.5, vol: 0.012, a: 3, r: 4 }); // steam hiss
  const tImp = COFFEE.tImp;
  whoosh(tImp - 0.62, 0.62, false, 0.14);
  noise(S, tImp, 0.35, { type: 'bandpass', f: 1500, f2: 600, q: 0.7, vol: 0.32, a: 0.004, r: 0.3 });
  tone(S, tImp, 0.4, 220, { to: 70, vol: 0.28, a: 0.003, r: 0.35 });
  tone(S, tImp + 0.02, 0.14, 4200, { vol: 0.05, a: 0.002, r: 0.12 });
  tone(S, tImp + 0.09, 0.12, 5300, { vol: 0.04, a: 0.002, r: 0.1 });
  for (let i = 0; i < 46; i++) click(27.2 + i * 0.1 + rnd() * 0.08, 0.04 + rnd() * 0.05, 3500 + rnd() * 5000);
  // rewind
  const tr = COFFEE.revStart;
  noise(S, tr - 0.5, 0.75, { type: 'bandpass', f: 7000, f2: 250, q: 1.5, vol: 0.28, a: 0.15, r: 0.35 });
  tone(S, tr - 0.5, 0.8, 1400, { to: 70, type: 'sawtooth', vol: 0.06, a: 0.05, r: 0.5, lp: 3000 });
  boom(tr, 0.45, 70);
  pad(M, tr + 0.2, 9.2, [N.G2 * 2, N.D3, N.Bb3, N.D4 * 1.5], 0.08, 700, 8, 0.4);
  tone(S, tr + 0.3, 9, 110, { to: 440, type: 'triangle', vol: 0.045, a: 8, r: 0.1 });
  [37.2, 37.9, 38.6, 39.0, 39.6, 40.3, 41.0].forEach((t, i) => revPing(S, t, [N.A5, N.F5, N.D5, N.C6, N.E5, N.A4, N.D6][i], 0.05, 0.6, (i % 2 ? 0.4 : -0.4)));
  noise(S, 40.8, 2.2, { type: 'highpass', f: 3000, vol: 0.03, a: 2, r: 0.05 }); // reverse steam
  const tNever = wordT(6, 'never', 0);
  tone(S, tNever, 0.8, 55, { to: 40, vol: 0.25, a: 0.01, r: 0.7 });
  const tFin = COFFEE.revEnd + 0.1;
  boom(tFin, 0.8, 58);
  [233.08, 311.13, 349.23].forEach((f) => tone(S, tFin, 1.8, f, { type: 'sawtooth', vol: 0.03, a: 0.01, r: 1.5, lp: 1400 }));
  whoosh(44.4, 0.55, true, 0.25);

  // ================= S3: GLASS (45 – 58.8) =================
  pad(M, 45.0, 12.6, [N.G2, N.D3, N.Bb3], 0.09, 600, 2, 3);
  for (let t = 45.0; t < 47.0; t += 0.52) tone(M, t, 0.4, 49, { to: 38, vol: 0.14, a: 0.005, r: 0.3 });
  riser(45.9, 47.1, 0.16, 300, 6000);
  const ti = GLASS.Ti;
  tone(S, ti, 0.9, 110, { to: 38, vol: 0.55, a: 0.002, r: 0.8 });
  noise(S, ti, 0.4, { type: 'highpass', f: 2800, vol: 0.5, a: 0.001, r: 0.38 });
  noise(S, ti, 1.2, { type: 'bandpass', f: 900, f2: 200, q: 0.8, vol: 0.3, a: 0.002, r: 1.1 });
  for (let i = 0; i < 70; i++) {
    const d = -Math.log(1 - rnd() * 0.97) * 0.55;
    ping(S, ti + 0.02 + d * 1.1, 2400 + rnd() * 6800, 0.02 + rnd() * 0.04, 0.12 + rnd() * 0.5, rnd() * 1.6 - 0.8);
  }
  tone(M, ti, 6, N.D2, { to: N.D2 * 0.7, type: 'sine', vol: 0.12, a: 0.05, r: 4 });
  // reverse: pieces fly back
  const tr2 = GLASS.revStart;
  noise(S, tr2 - 0.15, 0.7, { type: 'bandpass', f: 6500, f2: 300, q: 1.4, vol: 0.28, a: 0.1, r: 0.35 });
  for (let i = 0; i < 64; i++) {
    const u = Math.pow(rnd(), 0.8);
    revPing(S, tr2 + 0.2 + u * 3.6, 2400 + rnd() * 6800, 0.012 + u * 0.03, 0.1 + rnd() * 0.35, rnd() * 1.6 - 0.8);
  }
  tone(S, tr2, 4.4, 80, { to: 700, type: 'sawtooth', vol: 0.04, a: 4, r: 0.05, lp: 1800 });
  tone(S, GLASS.revEnd, 0.08, 1900, { vol: 0.09, a: 0.001, r: 0.07 });
  tone(S, GLASS.revEnd, 0.5, 130, { to: 70, vol: 0.3, a: 0.002, r: 0.45 });
  ping(M, 57.5, N.D5, 0.03, 3, 0.2);
  // zoom-dive
  noise(S, 57.8, 1.1, { type: 'bandpass', f: 180, f2: 9000, q: 1.2, vol: 0.34, a: 0.9, r: 0.1 });
  tone(S, 57.8, 1.1, 70, { to: 900, type: 'sawtooth', vol: 0.05, a: 1.0, r: 0.05, lp: 2400 });

  // ================= S4: ATOMS (58.8 – 85) =================
  tone(S, 58.85, 2.2, 90, { to: 38, vol: 0.4, a: 0.01, r: 2 });
  noise(S, 58.85, 1.2, { type: 'lowpass', f: 3500, f2: 200, vol: 0.3, r: 1.1 });
  pad(M, 59.0, 25.5, [N.D3, N.F3, N.A3, N.E4], 0.085, 800, 3, 3);
  tone(M, 59.0, 25.5, N.D2, { type: 'sine', vol: 0.14, a: 3, r: 3 });
  const pent = [N.D5, N.F5, N.G5, N.A5, N.C6, N.D6, N.A4, N.F5];
  const step = 60 / 140 / 2;
  let si = 0;
  for (let t = 59.4; t < 84.4; t += step, si++) {
    const dens = t < 69 ? 0.3 + ((t - 59.4) / 9.6) * 0.5 : t < 80.4 ? 0.8 : 0.5;
    if (rnd() < dens) {
      const hot = t < 69.5 ? (rnd() < 0.5) : false;
      ping(M, t, pent[Math.floor(rnd() * pent.length)] * (hot ? 1 : 0.5), 0.016 + rnd() * 0.012, 0.6 + rnd() * 0.8, rnd() * 1.6 - 0.8);
    }
  }
  for (let t = 59.4; t < 84.5; t += 60 / 140) tone(M, t, 0.28, 62, { to: 40, vol: 0.12, a: 0.003, r: 0.25 });
  for (let i = 0; i < 100; i++) click(63.8 + i * 0.2 + rnd() * 0.15, 0.025 + rnd() * 0.03, 3000 + rnd() * 5000);
  const tOpen = wordT(10, 'collide') - 0.45;
  whoosh(tOpen - 0.1, 1.0, true, 0.2);
  [N.D4, N.A4, N.D5, N.F5].forEach((f, i) => ping(S, tOpen + 0.05 + i * 0.06, f, 0.03, 2.8));
  tone(M, 75.0, 5.3, N.A3, { type: 'triangle', vol: 0.045, a: 2.2, r: 2 });
  riser(83.1, 85.0, 0.26, 250, 9000);
  const tCnt = wordT(12, 'counting');
  boom(tCnt, 0.55, 58);
  ping(S, tCnt + 0.1, N.D5, 0.05, 3);
  ping(S, tCnt + 0.1, N.A5, 0.04, 3);
  whoosh(84.6, 0.5, true, 0.28);

  // ================= S5: COUNTING (85 – 107.6) =================
  boom(85.0, 0.5, 66);
  pad(M, 85.2, 22.4, [N.D3, N.A3, N.F4, N.C5 * 0.5], 0.08, 900, 3, 3);
  tone(M, 85.2, 22.4, N.D2, { type: 'sine', vol: 0.12, a: 3, r: 3 });
  for (let k = 0; k < 16; k++) {
    const t = 87.45 + k * 0.135;
    tick(t, 0.1);
    ping(S, t + 0.01, [N.D5, N.F5, N.A5, N.C6][k % 4] * (k > 7 ? 1.25 : 1), 0.02, 1.1, (k - 7.5) * 0.08);
  }
  tick(89.75, 0.09); tick(90.1, 0.09);
  ping(S, 90.45, 1318.5, 0.07, 2.4); ping(S, 90.45, 1975.5, 0.04, 2.4); // gold chime
  [N.D5, N.F5, N.A5, N.D6].forEach((f, i) => ping(S, 92.62 + i * 0.09, f, 0.05, 2.4)); // violet chime
  whoosh(92.9, 1.0, true, 0.2);
  [0, 1, 2, 3, 4].forEach((c) => {
    tone(S, 93.9 + c * 0.05, 0.35, 140 - c * 8, { to: 60, vol: 0.2, a: 0.002, r: 0.3 });
    tick(93.9 + c * 0.05, 0.08);
  });
  // scale-up
  riser(95.25, 98.0, 0.3, 120, 9500);
  tone(S, 95.25, 2.75, 80, { to: 2400, type: 'sawtooth', vol: 0.05, a: 2.6, r: 0.05, lp: 3200 });
  for (let i = 0; i < 40; i++) {
    const u = i / 40;
    tone(S, 95.3 + Math.pow(u, 1.5) * 2.7, 0.05, 900 + u * 2800, { vol: 0.03, a: 0.001, r: 0.04 });
  }
  boom(98.05, 0.7, 52);
  [N.D4, N.A4, N.D5, N.F5, N.A5].forEach((f, i) => ping(S, 98.1 + i * 0.07, f, 0.035, 3.2, (i - 2) * 0.3));
  tone(M, 98.0, 9, N.D1 * 2, { type: 'sine', vol: 0.13, a: 1, r: 3 });
  // overwhelmingly swell
  pad(M, 100.6, 3.8, [N.Bb2 * 2, N.F3 * 2, N.D4, N.A4], 0.1, 1800, 1.4, 1.5);
  for (let i = 0; i < 12; i++) ping(M, 102.4 + i * 0.28 + rnd() * 0.1, [N.D5, N.F5, N.A5, N.E5][i % 4], 0.018, 2, rnd() * 1.4 - 0.7);
  // 'improbable' tension → silence → boom
  riser(104.3, 107.45, 0.32, 160, 12000);
  tone(S, 104.3, 3.15, 60, { to: 480, type: 'sawtooth', vol: 0.06, a: 3, r: 0.05, lp: 2000 });
  musicBus.gain.setTargetAtTime(0.0, 106.9, 0.05);
  musicBus.gain.setTargetAtTime(1.0, 107.6, 0.05);

  // ================= S6: PAYOFF (107.6 – 120) =================
  boom(107.6, 1.0, 46);
  pad(M, 107.6, 12.2, [N.D3, N.A3, N.D4, N.Fs4, N.A4], 0.11, 1400, 1.2, 4);
  tone(M, 107.6, 12.4, N.D1, { type: 'sine', vol: 0.22, a: 0.5, r: 4 });
  const tE = wordT(15, 'entropy');
  [N.D5, N.A5, N.D6].forEach((f, i) => ping(S, tE + i * 0.08, f, 0.06, 4, (i - 1) * 0.3));
  [0, 1, 2, 3, 4, 5].forEach((i) => ping(M, 109.4 + i * 0.32, [N.D5, N.Fs5, N.A5, N.D6, N.A5, N.Fs5][i], 0.022, 1.8, (i - 2.5) * 0.2));
  const tA = wordT(16, 'And');
  whoosh(tA - 0.1, 1.4, true, 0.2);
  [N.D5, N.Fs5, N.A5, N.D6, N.Fs5 * 2].forEach((f, i) => ping(S, tA + 0.3 + i * 0.22, f, 0.04, 2.4, (i - 2) * 0.3));
  // disorder: dark drop
  const tN = wordT(17, 'Not');
  tone(S, tN, 1.5, 98, { to: 55, type: 'sawtooth', vol: 0.05, a: 0.05, r: 1.2, lp: 700 });
  const tD = wordT(17, 'disorder') + 0.25;
  noise(S, tD, 0.4, { type: 'bandpass', f: 6000, f2: 1800, q: 2, vol: 0.28, a: 0.02, r: 0.3 });
  for (let i = 0; i < 6; i++) click(tD + i * 0.05, 0.08, 3000 + rnd() * 4000);
  const tP = wordT(17, 'Probability');
  boom(tP, 0.9, 49);
  [N.D4, N.Fs4, N.A4, N.D5, N.Fs5, N.A5, N.D6].forEach((f, i) => ping(S, tP + 0.02 + i * 0.05, f, 0.05, 5, (i - 3) * 0.22));
  noise(S, tP - 0.1, 0.5, { type: 'bandpass', f: 400, f2: 6000, q: 1, vol: 0.18, a: 0.35, r: 0.1 });

  return oc.startRendering();
}

// ================= live engine =================
export class AudioEngine {
  ctx!: AudioContext;
  master!: GainNode;
  voBus!: GainNode;
  musicBuf!: AudioBuffer;
  clips: AudioBuffer[] = [];
  recDest!: MediaStreamAudioDestinationNode;
  sources: AudioScheduledSourceNode[] = [];
  playing = false;
  startCtx = 0;
  startT = 0;
  pausedT = 0;
  muted = false;
  musicGain!: GainNode;

  async init(progress: (p: number, label: string) => void) {
    this.ctx = new AudioContext({ sampleRate: SR });
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 1;
    this.recDest = ctx.createMediaStreamDestination();
    this.master.connect(ctx.destination);
    this.master.connect(this.recDest);
    // voice chain: high-pass, presence, compressor
    this.voBus = ctx.createGain();
    this.voBus.gain.value = 1.15;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85;
    const pres = ctx.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 3200; pres.gain.value = 2.5; pres.Q.value = 0.8;
    const warm = ctx.createBiquadFilter(); warm.type = 'lowshelf'; warm.frequency.value = 180; warm.gain.value = 2;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.ratio.value = 3.5; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.voBus.connect(hp).connect(warm).connect(pres).connect(comp).connect(this.master);
    const vr = ctx.createConvolver(); vr.buffer = impulse(ctx, 1.1, 3, 8);
    const vrg = ctx.createGain(); vrg.gain.value = 0.07;
    comp.connect(vrg).connect(vr).connect(this.master);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.85;
    this.musicGain.connect(this.master);

    progress(0.05, 'Decoding narration');
    for (let i = 0; i < VO.length; i++) {
      const ab = await (await fetch(VO[i].url)).arrayBuffer();
      this.clips.push(await ctx.decodeAudioData(ab));
      progress(0.05 + 0.3 * ((i + 1) / VO.length), 'Decoding narration');
    }
    progress(0.4, 'Composing score & sound design');
    this.musicBuf = await buildScore();
    progress(0.6, 'Score ready');
  }

  now() {
    if (!this.playing) return this.pausedT;
    return Math.min(DUR, this.startT + (this.ctx.currentTime - this.startCtx));
  }

  private stopAll() {
    this.sources.forEach((s) => {
      try { s.stop(); } catch { /* */ }
      try { s.disconnect(); } catch { /* */ }
    });
    this.sources = [];
  }

  async play(from: number) {
    await this.ctx.resume();
    this.stopAll();
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.06;
    this.startCtx = t0;
    this.startT = from;
    const m = ctx.createBufferSource();
    m.buffer = this.musicBuf;
    m.connect(this.musicGain);
    m.start(t0, from);
    this.sources.push(m);
    VO.forEach((l, i) => {
      const end = l.start + this.clips[i].duration;
      if (end <= from) return;
      const s = ctx.createBufferSource();
      s.buffer = this.clips[i];
      s.connect(this.voBus);
      if (l.start >= from) s.start(t0 + (l.start - from));
      else s.start(t0, from - l.start);
      this.sources.push(s);
    });
    this.playing = true;
  }

  pause() {
    if (!this.playing) return;
    this.pausedT = this.now();
    this.playing = false;
    this.stopAll();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.03);
  }
}
