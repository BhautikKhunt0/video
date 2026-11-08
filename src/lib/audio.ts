// Voice-over (Web Speech API) + generative ambient pad + UI pings (WebAudio).

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private started = false;

  private ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = 0.12;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      lp.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.sfx.connect(this.ctx.destination);
      [55, 82.41, 110, 164.81, 220.5].forEach((f, i) => {
        const o = this.ctx!.createOscillator();
        o.type = i % 2 ? 'triangle' : 'sine';
        o.frequency.value = f;
        o.detune.value = (i - 2) * 6;
        const g = this.ctx!.createGain();
        g.gain.value = 0.18 / (i + 1);
        const lfo = this.ctx!.createOscillator();
        lfo.frequency.value = 0.06 + i * 0.03;
        const lg = this.ctx!.createGain();
        lg.gain.value = 0.05 / (i + 1);
        lfo.connect(lg);
        lg.connect(g.gain);
        o.connect(g);
        g.connect(lp);
        o.start();
        lfo.start();
      });
      this.started = true;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  setMusic(on: boolean) {
    const c = this.ensure();
    if (!c || !this.master || !this.started) return;
    this.master.gain.cancelScheduledValues(c.currentTime);
    this.master.gain.linearRampToValueAtTime(on ? 0.5 : 0, c.currentTime + 0.6);
  }

  ping(freq = 660) {
    const c = this.ensure();
    if (!c || !this.sfx) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(freq * 1.8, c.currentTime + 0.18);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.6, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35);
    o.connect(g);
    g.connect(this.sfx);
    o.start();
    o.stop(c.currentTime + 0.4);
  }
}

export const audio = new AudioEngine();

const PREFERRED = ['Google US English', 'Microsoft Guy', 'Microsoft Davis', 'Microsoft Aria', 'Daniel', 'Alex', 'Samantha', 'Google UK English Male'];

function pickVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  for (const n of PREFERRED) {
    const v = voices.find((x) => x.name.includes(n));
    if (v) return v;
  }
  return voices[0] ?? null;
}

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function speak(text: string, seconds: number, speed: number) {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const words = text.split(/\s+/).length;
  const rate = Math.min(1.9, Math.max(0.7, (words / (seconds * 2.6)) * speed));
  u.rate = rate;
  u.pitch = 0.95;
  const v = pickVoice();
  if (v) u.voice = v;
  synth.speak(u);
}

export function stopSpeech() {
  if (speechSupported()) window.speechSynthesis.cancel();
}
