import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { Stage } from './scenes/Stage';
import { SCENES, sceneIndexAt } from './scenes/timeline';
import { CHAPTERS, CHUNKS, CUES, DURATION } from './data/script';
import { audio, speak, speechSupported, stopSpeech } from './lib/audio';
import { FONT, clamp } from './lib/anim';
import storyboard from './assets/storyboard0.jpg?inline';

const FPS = 30;
const TOTAL_FRAMES = Math.round(DURATION * FPS);
const INIT_T = clamp(parseFloat(new URLSearchParams(window.location.search).get('t') || '0') || 0, 0, DURATION);

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, '0')}`;
};

/** thumbnail from the original video's public storyboard sprite (5×5 grid, 1 frame / 5 s) */
const refStyle = (time: number, w: number): CSSProperties => {
  const idx = clamp(Math.floor(time / 5), 0, 24);
  const h = (w * 9) / 16;
  return {
    width: w,
    height: h,
    backgroundImage: `url(${storyboard})`,
    backgroundSize: `${w * 5}px ${h * 5}px`,
    backgroundPosition: `-${(idx % 5) * w}px -${Math.floor(idx / 5) * h}px`,
    backgroundRepeat: 'no-repeat',
  };
};

const Btn = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
  <button
    onClick={onClick}
    title={title}
    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
      active ? 'border-cyan-400/70 bg-cyan-400/15 text-cyan-200 shadow-[0_0_14px_rgba(34,229,255,.25)]' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10'
    }`}
  >
    {children}
  </button>
);

export default function App() {
  const [t, setT] = useState(INIT_T);
  const tRef = useRef(INIT_T);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState(true);
  const [music, setMusic] = useState(true);
  const [compare, setCompare] = useState(true);
  const [recording, setRecording] = useState(false);
  const lastCue = useRef(-2);
  const lastScene = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const recRef = useRef<{ rec: MediaRecorder; stream: MediaStream } | null>(null);

  const seek = useCallback((v: number) => {
    const n = clamp(v, 0, DURATION);
    tRef.current = n;
    setT(n);
    lastCue.current = -2;
    stopSpeech();
  }, []);

  const togglePlay = useCallback(() => {
    audio.unlock();
    if (!playing && tRef.current >= DURATION - 0.05) seek(0);
    lastCue.current = -2;
    setPlaying((p) => !p);
  }, [playing, seek]);

  const step = useCallback(
    (frames: number) => {
      setPlaying(false);
      const f = Math.round(tRef.current * FPS) + frames;
      seek(f / FPS);
    },
    [seek],
  );

  // master clock
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const n = tRef.current + dt * speed;
      if (n >= DURATION) {
        tRef.current = DURATION;
        setT(DURATION);
        setPlaying(false);
        return;
      }
      tRef.current = n;
      setT(n);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // music + silence on pause
  useEffect(() => {
    audio.setMusic(playing && music);
    if (!playing) stopSpeech();
  }, [playing, music]);
  useEffect(() => {
    if (!voice) stopSpeech();
  }, [voice]);

  // voice-over cue scheduling
  useEffect(() => {
    if (!playing || !voice) return;
    const idx = CUES.findIndex((c) => t >= c.start && t < c.end);
    if (idx !== lastCue.current) {
      lastCue.current = idx;
      if (idx >= 0 && t - CUES[idx].start < 1.5) speak(CUES[idx].text, (CUES[idx].end - CUES[idx].start) / 1, speed);
    }
  }, [t, playing, voice, speed]);

  // scene ping
  const sceneIdx = sceneIndexAt(t);
  useEffect(() => {
    if (playing && sceneIdx !== lastScene.current) audio.ping(360 + sceneIdx * 28);
    lastScene.current = sceneIdx;
  }, [sceneIdx, playing]);

  // finish recording when playback ends
  useEffect(() => {
    if (!playing && recRef.current && tRef.current >= DURATION) {
      const { rec, stream } = recRef.current;
      setTimeout(() => {
        if (rec.state !== 'inactive') rec.stop();
        stream.getTracks().forEach((tr) => tr.stop());
        if (document.fullscreenElement) void document.exitFullscreen();
      }, 600);
    }
  }, [playing]);

  const record = async () => {
    try {
      const md = navigator.mediaDevices as unknown as { getDisplayMedia: (c: object) => Promise<MediaStream> };
      const stream = await md.getDisplayMedia({ video: { frameRate: 30 }, audio: true, preferCurrentTab: true });
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
        a.download = 'entropy-neon-explainer.webm';
        a.click();
        recRef.current = null;
        setRecording(false);
      };
      recRef.current = { rec, stream };
      setRecording(true);
      rec.start();
      seek(0);
      audio.unlock();
      setPlaying(true);
      void stageRef.current?.requestFullscreen?.();
    } catch {
      setRecording(false);
      alert('Screen capture was cancelled or is not supported in this browser. You can also use any screen recorder on the fullscreen player.');
    }
  };

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') step(e.shiftKey ? 150 : 1);
      else if (e.key === 'ArrowLeft') step(e.shiftKey ? -150 : -1);
      else if (e.key === '.') step(1);
      else if (e.key === ',') step(-1);
      else if (e.key === 'f') void stageRef.current?.requestFullscreen?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, step]);

  const scrub = (e: RPointerEvent) => {
    const r = barRef.current!.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * DURATION);
  };

  const chunk = CHUNKS.find((c) => t >= c.start && t < c.end + 0.15);
  const prog = chunk ? clamp((t - chunk.start) / (chunk.end - chunk.start)) : 0;
  const cur = SCENES[sceneIdx];
  const frame = Math.round(t * FPS);
  const chapter = [...CHAPTERS].reverse().find((c) => t >= c.start);

  return (
    <div className="min-h-screen bg-[#05060a] text-slate-200" style={{ fontFamily: FONT }}>
      <header className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-3 px-4 pt-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-300/80">Neon Motion Studio · reverse-engineered</div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            Entropy: <span className="bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">The Most Confusing Concept in Physics</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Recreation of the first {fmt(DURATION)} · 21 hand-built animated scenes · every frame is a pure function of time ({FPS} fps · {TOTAL_FRAMES} frames)
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400">
          <b className="text-slate-200">Keys:</b> Space play · ← → frame step · Shift+← → 5 s · F fullscreen
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div ref={stageRef} className="relative aspect-video w-full overflow-hidden rounded-2xl border border-cyan-400/20 bg-black shadow-[0_0_70px_rgba(34,229,255,.12)]">
            <Stage t={t} />
            {!playing && t < 0.05 && (
              <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-cyan-300 bg-cyan-300/10 text-4xl text-cyan-200 shadow-[0_0_40px_rgba(34,229,255,.5)] transition hover:scale-110">▶</span>
              </button>
            )}
            {recording && <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs text-red-300"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />REC</div>}
          </div>

          {/* captions */}
          <div className="mt-3 flex min-h-[64px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-lg md:text-xl">
            {chunk ? (
              <p>
                {chunk.words.map((w, i) => (
                  <span key={i} className={i / chunk.words.length <= prog ? 'text-white' : 'text-slate-600'}>
                    {w}{' '}
                  </span>
                ))}
              </p>
            ) : (
              <span className="text-slate-600">♪</span>
            )}
          </div>

          {/* scrubber */}
          <div
            ref={barRef}
            className="relative mt-4 h-7 cursor-pointer touch-none select-none"
            onPointerDown={(e) => {
              dragging.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              scrub(e);
            }}
            onPointerMove={(e) => dragging.current && scrub(e)}
            onPointerUp={() => (dragging.current = false)}
          >
            <div className="absolute inset-x-0 top-2 flex h-3 gap-[2px] overflow-hidden rounded-full">
              {SCENES.map((s) => (
                <div key={s.id} style={{ width: `${((Math.min(s.end, DURATION) - s.start) / DURATION) * 100}%`, background: s.color, opacity: t >= s.start ? 0.95 : 0.25 }} />
              ))}
            </div>
            {CHAPTERS.slice(1).map((c) => (
              <div key={c.start} className="absolute top-0 h-7 w-px bg-white/70" style={{ left: `${(c.start / DURATION) * 100}%` }} title={c.title} />
            ))}
            <div className="absolute top-0 h-7 w-1.5 -translate-x-1/2 rounded bg-white shadow-[0_0_12px_#fff]" style={{ left: `${(t / DURATION) * 100}%` }} />
          </div>

          {/* controls */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Btn onClick={togglePlay} active>{playing ? '❚❚ Pause' : '▶ Play'}</Btn>
            <Btn onClick={() => step(-1)} title="Previous frame">◀| frame</Btn>
            <Btn onClick={() => step(1)} title="Next frame">frame |▶</Btn>
            <Btn onClick={() => seek(0)}>⟲ Restart</Btn>
            <div className="mx-1 font-mono text-sm text-cyan-200">
              {fmt(t)} <span className="text-slate-500">/ {fmt(DURATION)}</span> <span className="ml-2 text-slate-500">f {frame}/{TOTAL_FRAMES}</span>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {[0.5, 1, 1.5, 2].map((s) => (
                <Btn key={s} onClick={() => setSpeed(s)} active={speed === s}>{s}×</Btn>
              ))}
              <Btn onClick={() => setVoice((v) => !v)} active={voice} title={speechSupported() ? 'Synthesised voice-over' : 'Speech synthesis not supported'}>🎙 Voice</Btn>
              <Btn onClick={() => setMusic((v) => !v)} active={music}>♫ Ambient</Btn>
              <Btn onClick={() => void stageRef.current?.requestFullscreen?.()}>⛶</Btn>
              <Btn onClick={record} active={recording} title="Plays fullscreen from 0:00 and saves a .webm via screen capture">⏺ Record .webm</Btn>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-400">
            <b className="text-slate-200">Now:</b> scene {String(sceneIdx + 1).padStart(2, '0')}/{SCENES.length} — <span style={{ color: cur.color }}>{cur.name}</span>
            {chapter && <span className="ml-2 rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">chapter · {chapter.title}</span>}
            <span className="ml-2 text-slate-500">local t = {(t - cur.start).toFixed(2)}s</span>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300">Frame compare</h2>
              <Btn onClick={() => setCompare((c) => !c)} active={compare}>{compare ? 'On' : 'Off'}</Btn>
            </div>
            {compare && (
              <div className="space-y-2">
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Original · storyboard sample @ {fmt(Math.floor(t / 5) * 5)}</div>
                  <div className="overflow-hidden rounded-lg border border-white/10" style={refStyle(t, 332)} />
                </div>
                <div>
                  <div className="mb-1 text-[11px] uppercase tracking-wider text-slate-500">Recreation · @ {fmt(t)}</div>
                  <div className="overflow-hidden rounded-lg border border-cyan-400/30" style={{ width: 332, height: 187 }}>
                    <Stage t={t} />
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">The original is sampled every 5 s from YouTube's public storyboard (low-res), which is how the layouts, palette and motion beats were reverse-engineered.</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-widest text-slate-300">Scene breakdown</h2>
            <div className="max-h-[520px] space-y-1 overflow-y-auto pr-1">
              {SCENES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => seek(s.start)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-1.5 text-left transition ${i === sceneIdx ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-transparent hover:bg-white/5'}`}
                >
                  <div className="shrink-0 overflow-hidden rounded border border-white/10" style={refStyle(s.start + 0.5, 80)} />
                  <div className="min-w-0">
                    <div className="truncate text-sm text-slate-200">
                      <span className="mr-1 font-mono text-xs" style={{ color: s.color }}>{String(i + 1).padStart(2, '0')}</span>
                      {s.name}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {fmt(s.start)} → {fmt(s.end)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="mx-auto max-w-[1500px] px-4 pb-8 text-xs leading-relaxed text-slate-500">
        Voice-over is synthesised live by your browser from the transcript timing (no original audio is reused) — pick a better system voice in your OS for best quality. Animation language reproduced from the reference: black canvas, neon line-art that draws itself on, kinetic type, particle dissolves, glowing equations and counters.
      </footer>
    </div>
  );
}
