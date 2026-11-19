import { useCallback, useEffect, useRef, useState } from 'react';
import { Director, CHAPTERS } from './video/director';
import { AudioEngine } from './video/audio';
import { DUR } from './video/core';

const fmt = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

type Phase = 'loading' | 'ready' | 'playing' | 'paused' | 'ended';

export default function Player() {
  const stageRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dir = useRef<Director | null>(null);
  const audio = useRef<AudioEngine | null>(null);
  const phaseRef = useRef<Phase>('loading');
  const tRef = useRef(0);
  const dragging = useRef(false);
  const exporting = useRef<{ rec: MediaRecorder; chunks: Blob[] } | null>(null);
  const hideTimer = useRef<number>(0);

  const [phase, setPhaseState] = useState<Phase>('loading');
  const [progress, setProgress] = useState({ p: 0, label: 'Preparing' });
  const [time, setTime] = useState(0);
  const [captions, setCaptions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  // ---------- boot
  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams(location.search);
    const testT = q.get('t');
    (async () => {
      try {
        const d = new Director();
        dir.current = d;
        const stage = stageRef.current!;
        for (const c of [d.gl, d.overlay]) {
          c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
          stage.appendChild(c);
        }
        await d.init((p, label) => !cancelled && setProgress({ p: p * 0.6, label }));
        (window as any).__dir = d;
        if (testT !== null) {
          d.render(parseFloat(testT));
          (window as any).__ready = true;
          (window as any).__render = (t: number) => d.render(t);
          setPhase('paused');
          return;
        }
        const a = new AudioEngine();
        audio.current = a;
        (window as any).__audio = a;
        await a.init((p, label) => !cancelled && setProgress({ p: 0.6 + p * 0.4, label }));
        d.render(0);
        if (!cancelled) {
          setProgress({ p: 1, label: 'Ready' });
          setPhase('ready');
        }
      } catch (e: any) {
        console.error(e);
        setError(String(e?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- render loop
  useEffect(() => {
    let raf = 0;
    let lastUi = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const d = dir.current, a = audio.current;
      if (!d) return;
      if (phaseRef.current === 'playing' && a) {
        const T = a.now();
        tRef.current = T;
        if (T >= DUR - 0.02) {
          finish();
        } else {
          d.render(T);
          if (exporting.current) d.compose();
        }
      } else if (phaseRef.current === 'paused' && dragging.current) {
        d.render(tRef.current);
      }
      const now = performance.now();
      if (now - lastUi > 80) {
        lastUi = now;
        setTime(tRef.current);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    const a = audio.current;
    a?.pause();
    tRef.current = DUR;
    audio.current && (audio.current.pausedT = DUR);
    dir.current?.render(DUR - 0.01);
    if (exporting.current) {
      const { rec } = exporting.current;
      setTimeout(() => rec.stop(), 300);
    }
    setPhase('ended');
  };

  const start = useCallback(async (from = 0) => {
    const a = audio.current;
    if (!a) return;
    tRef.current = from;
    await a.play(from);
    setPhase('playing');
  }, []);

  const toggle = useCallback(async () => {
    const a = audio.current;
    if (!a) return;
    const p = phaseRef.current;
    if (p === 'ready') await start(0);
    else if (p === 'playing') {
      a.pause();
      setPhase('paused');
    } else if (p === 'paused') await start(tRef.current);
    else if (p === 'ended') await start(0);
  }, [start]);

  const seekTo = useCallback((t: number, resume?: boolean) => {
    const a = audio.current, d = dir.current;
    if (!a || !d) return;
    t = Math.max(0, Math.min(DUR - 0.05, t));
    tRef.current = t;
    a.pausedT = t;
    d.render(t);
    if (resume) start(t);
  }, [start]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.code === 'ArrowRight') { const p = phaseRef.current; seekTo(tRef.current + 5, p === 'playing'); }
      else if (e.code === 'ArrowLeft') { const p = phaseRef.current; seekTo(tRef.current - 5, p === 'playing'); }
      else if (e.key === 'c') setCaptions((v) => !v);
      else if (e.key === 'm') setMuted((v) => !v);
      else if (e.key === 'f') toggleFs();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, seekTo]);

  useEffect(() => {
    if (dir.current) {
      dir.current.captions = captions;
      if (phaseRef.current !== 'playing' && phaseRef.current !== 'loading') dir.current.render(tRef.current);
    }
  }, [captions]);
  useEffect(() => { audio.current?.setMuted(muted); }, [muted]);

  const toggleFs = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  const poke = () => {
    setUiVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setUiVisible(false), 2600);
  };

  // scrubber
  const barRef = useRef<HTMLDivElement>(null);
  const tFromEvent = (e: React.PointerEvent | PointerEvent) => {
    const r = barRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * DUR;
  };
  const wasPlaying = useRef(false);
  const onDown = (e: React.PointerEvent) => {
    if (phaseRef.current === 'loading' || phaseRef.current === 'ready') return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    wasPlaying.current = phaseRef.current === 'playing';
    if (wasPlaying.current) { audio.current?.pause(); }
    dragging.current = true;
    setPhase('paused');
    seekTo(tFromEvent(e));
  };
  const onMove = (e: React.PointerEvent) => {
    const t = tFromEvent(e);
    const r = barRef.current!.getBoundingClientRect();
    setHover({ x: e.clientX - r.left, t });
    if (dragging.current) seekTo(t);
  };
  const onUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const t = tFromEvent(e);
    seekTo(t);
    if (wasPlaying.current) start(t);
  };

  // export
  const doExport = async () => {
    const d = dir.current, a = audio.current;
    if (!d || !a || exporting.current) return;
    try {
      d.captions = false;
      const stream = d.comp.captureStream(60);
      a.recDest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      const mimes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mime = mimes.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      const rec = new MediaRecorder(stream, { mimeType: mime || undefined, videoBitsPerSecond: 14_000_000, audioBitsPerSecond: 192_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'entropy-2min.webm';
        link.click();
        exporting.current = null;
        setRecording(false);
      };
      exporting.current = { rec, chunks };
      setRecording(true);
      rec.start(250);
      await start(0);
    } catch (e: any) {
      setError('Export is not supported in this browser: ' + (e?.message ?? e));
      exporting.current = null;
      setRecording(false);
    }
  };

  const pct = (time / DUR) * 100;
  const showUi = uiVisible || phase !== 'playing';

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 bg-[#04060b] flex items-center justify-center select-none overflow-hidden"
      onMouseMove={poke}
      style={{ cursor: showUi ? 'default' : 'none' }}
    >
      <div className="relative" style={{ width: 'min(100vw, calc(100vh * 16 / 9))', aspectRatio: '16 / 9' }}>
        <div ref={stageRef} className="absolute inset-0 overflow-hidden bg-black" onClick={() => (phase === 'playing' || phase === 'paused') && toggle()} />

        {/* loading / start */}
        {(phase === 'loading' || phase === 'ready') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: 'radial-gradient(ellipse at 50% 45%, #0e1526 0%, #04060b 70%)' }}>
            <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,154,60,0.10), transparent 40%)' }} />
            <div className="relative">
              <div className="font-mono text-[11px] tracking-[0.5em] text-[#ff9a3c] mb-6" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                A MOTION GRAPHICS FILM · 2:00
              </div>
              <h1 className="leading-none text-[#f3ede2]" style={{ fontFamily: '"Instrument Serif", serif', fontSize: 'clamp(56px, 11vw, 190px)', letterSpacing: '-0.01em', textShadow: '0 0 60px rgba(255,154,60,0.35)' }}>
                Entropy
              </h1>
              <p className="mt-4 italic text-[#f3ede2]/70" style={{ fontFamily: '"Instrument Serif", serif', fontSize: 'clamp(16px, 2.2vw, 34px)' }}>
                the most confusing idea in physics — finally counted
              </p>
              <div className="mt-10 h-14 flex items-center justify-center">
                {phase === 'loading' ? (
                  <div className="w-[min(320px,60vw)]">
                    <div className="h-[2px] bg-white/10 rounded overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#78d6ff] to-[#ff9a3c] transition-all duration-300" style={{ width: `${Math.round(progress.p * 100)}%` }} />
                    </div>
                    <div className="mt-3 text-[11px] tracking-[0.3em] text-white/50 uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{error || progress.label}</div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); start(0); }}
                    className="group flex items-center gap-4 rounded-full border border-[#ff9a3c]/60 px-9 py-4 text-[#f3ede2] transition hover:bg-[#ff9a3c]/15 hover:border-[#ff9a3c]"
                    style={{ fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.3em', fontSize: 12, boxShadow: '0 0 40px rgba(255,154,60,0.2)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 1 L13 7 L2 13 Z" fill="#ff9a3c" /></svg>
                    PLAY WITH SOUND
                  </button>
                )}
              </div>
              {phase === 'ready' && <div className="mt-5 text-[10px] tracking-[0.3em] text-white/35 uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Headphones recommended · Space = play/pause · C = captions</div>}
            </div>
          </div>
        )}

        {/* ended overlay */}
        {phase === 'ended' && !recording && (
          <div className="absolute inset-0 flex items-end justify-center pb-[12%] pointer-events-none">
            <button onClick={() => start(0)} className="pointer-events-auto rounded-full border border-white/30 px-7 py-3 text-xs tracking-[0.3em] text-white/80 hover:bg-white/10 transition" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              ↺ REPLAY
            </button>
          </div>
        )}

        {recording && (
          <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[11px] tracking-[0.25em] text-white/80" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> RECORDING {fmt(time)}
          </div>
        )}

        {/* controls */}
        {phase !== 'loading' && phase !== 'ready' && (
          <div className={`absolute left-0 right-0 bottom-0 px-[3%] pb-[1.6%] pt-16 transition-opacity duration-500 ${showUi ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'linear-gradient(to top, rgba(4,6,11,0.85), transparent)' }}>
            <div
              ref={barRef}
              className="relative h-5 cursor-pointer touch-none group"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={() => setHover(null)}
            >
              <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 bg-white/15 rounded">
                <div className="h-full rounded bg-gradient-to-r from-[#78d6ff] via-[#9b8cff] to-[#ff9a3c]" style={{ width: `${pct}%` }} />
              </div>
              {CHAPTERS.slice(1).map((c) => (
                <div key={c.t} className="absolute top-1/2 h-2 w-[2px] -translate-y-1/2 bg-white/50" style={{ left: `${(c.t / DUR) * 100}%` }} />
              ))}
              <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f3ede2] shadow-[0_0_12px_rgba(255,154,60,0.9)]" style={{ left: `${pct}%` }} />
              {hover && (
                <div className="absolute -top-8 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-[10px] tracking-[0.2em] text-white/80" style={{ left: hover.x, fontFamily: 'JetBrains Mono, monospace' }}>
                  {fmt(hover.t)} · {[...CHAPTERS].reverse().find((c) => c.t <= hover.t)?.name}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4 text-white/80" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 hover:bg-white/10" aria-label="play/pause">
                {phase === 'playing' ? (
                  <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="3.5" height="10" fill="#f3ede2" /><rect x="7.5" y="1" width="3.5" height="10" fill="#f3ede2" /></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 1 L11 6 L2 11 Z" fill="#f3ede2" /></svg>
                )}
              </button>
              <span className="text-[11px] tracking-[0.2em] tabular-nums">{fmt(time)} / {fmt(DUR)}</span>
              <span className="hidden sm:inline text-[10px] tracking-[0.25em] text-white/45 uppercase">{[...CHAPTERS].reverse().find((c) => c.t <= time)?.name}</span>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setCaptions((v) => !v)} className={`rounded border px-2 py-1 text-[10px] tracking-[0.2em] ${captions ? 'border-[#ff9a3c] text-[#ff9a3c]' : 'border-white/30 text-white/70'} hover:bg-white/10`}>CC</button>
                <button onClick={() => setMuted((v) => !v)} className="rounded border border-white/30 px-2 py-1 text-[10px] tracking-[0.2em] text-white/70 hover:bg-white/10">{muted ? 'MUTED' : 'SOUND'}</button>
                <button onClick={doExport} disabled={recording} className="rounded border border-white/30 px-2 py-1 text-[10px] tracking-[0.2em] text-white/70 hover:bg-white/10 disabled:opacity-40" title="Records the film in real time and downloads a .webm file">EXPORT</button>
                <button onClick={toggleFs} className="rounded border border-white/30 px-2 py-1 text-[10px] tracking-[0.2em] text-white/70 hover:bg-white/10">⛶</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
