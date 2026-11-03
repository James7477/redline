import { useCallback, useEffect, useRef, useState } from 'react';
import { engine } from '../game/audio';
import type { CarSpec, Difficulty } from '../game/cars';
import {
  createRunner,
  MPS_TO_MPH,
  shift,
  stepRunner,
  TRACK_LENGTH,
  type Runner,
} from '../game/physics';
import { drawScene, type CarView } from '../game/render';
import { ResultPanel, type RaceResult } from './ResultPanel';

type Phase = 'idle' | 'tree' | 'running' | 'finished';

/** Seconds from tree start to green, with ambers every 0.5 s. */
const GREEN_DELAY = 1.5;
/** Reaction (s from green) that earns the holeshot hit off the line. */
const HOLESHOT_RT = 0.22;
/** Reaction (s from green) past which the leave reads as late. */
const LATE_RT = 0.4;

type Props = {
  spec: CarSpec;
  difficulty: Difficulty;
  muted: boolean;
  bestEt: number | null;
  onToggleMute: () => void;
  onExit: () => void;
  onAgain: () => void;
  onResult: (result: RaceResult) => void;
};

/** Same car, works livery: heads-up racing so the tree and your shifts decide it. */
function rivalLivery(spec: CarSpec): CarSpec {
  return { ...spec, body: '#333850', bodyDark: '#0f121d', accent: '#93a0c8', glow: '#44507a' };
}

/**
 * Exact moment (seconds, same clock as `now`) a car broke the beam, interpolated
 * inside the frame so two cars finishing on the same tick are still ordered.
 */
function crossMoment(before: number, after: number, now: number, dt: number): number {
  const span = after - before;
  const frac = span > 1e-6 ? (TRACK_LENGTH - before) / span : 1;
  return now - dt + Math.min(1, Math.max(0, frac)) * dt;
}

function vibrate(ms: number): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
  }
}

export function Race({
  spec,
  difficulty,
  muted,
  bestEt,
  onToggleMute,
  onExit,
  onAgain,
  onResult,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const etRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const gapRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const rpmRef = useRef<HTMLDivElement>(null);
  const nosRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  const playerRef = useRef<Runner>(createRunner(spec));
  const rivalRef = useRef<Runner>(createRunner(spec, difficulty.power));
  const rivalPaintRef = useRef<CarSpec>(rivalLivery(spec));
  const targetsRef = useRef<number[]>(
    spec.gears.map(() => difficulty.shiftBase + (Math.random() - 0.5) * difficulty.shiftSpread),
  );

  const phaseRef = useRef<Phase>('idle');
  const treeStartRef = useRef(0);
  const greenAtRef = useRef(0);
  const rivalReactionRef = useRef(0.35);
  /** Absolute time the rival is allowed to leave the line (set when you launch). */
  const rivalStartRef = useRef(0);
  /** Wall-clock moment each car broke the beam — the only thing that decides the race. */
  const playerCrossRef = useRef(Infinity);
  const rivalCrossRef = useRef(Infinity);
  const firstFinishRef = useRef(0);
  const endRef = useRef(false);
  const toastTimerRef = useRef(0);
  const bestRef = useRef(bestEt);
  const onResultRef = useRef(onResult);

  const [phase, setPhase] = useState<Phase>('idle');
  const [launched, setLaunched] = useState(false);
  const [lights, setLights] = useState(0);
  const [result, setResult] = useState<RaceResult | null>(null);

  bestRef.current = bestEt;
  onResultRef.current = onResult;

  useEffect(() => {
    engine.setMuted(muted);
  }, [muted]);

  const showToast = useCallback((text: string, kind: 'good' | 'bad' | 'info') => {
    const el = toastRef.current;
    if (!el) return;
    el.textContent = text;
    el.className = `toast show ${kind}`;
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      el.className = 'toast';
    }, 720);
  }, []);

  const finishRace = useCallback(() => {
    if (endRef.current) return;
    endRef.current = true;
    phaseRef.current = 'finished';
    setPhase('finished');
    engine.silence();

    const p = playerRef.current;
    const q = rivalRef.current;
    // Whoever broke the beam first wins. Comparing each car's own stopwatch was
    // wrong: the rival leaves later, so its elapsed time starts later too.
    const pCross = playerCrossRef.current;
    const qCross = rivalCrossRef.current;
    const outcome: RaceResult['outcome'] =
      p.finishTime === null ? 'dnf' : pCross <= qCross ? 'win' : 'lose';
    const margin =
      Number.isFinite(pCross) && Number.isFinite(qCross) ? Math.abs(pCross - qCross) : 0;

    const res: RaceResult = {
      outcome,
      playerEt: p.finishTime ?? 0,
      playerTrap: p.trap,
      reaction: p.reaction,
      sixty: p.sixty,
      hundred: p.hundred,
      rivalEt: q.finishTime ?? 0,
      rivalTrap: q.trap,
      margin,
      isRecord:
        p.finishTime !== null &&
        p.et > 0 &&
        (bestRef.current === null || (p.finishTime ?? Infinity) < bestRef.current),
    };

    engine.finish(outcome === 'win');
    setResult(res);
    onResultRef.current(res);
  }, []);

  const foul = useCallback(() => {
    if (endRef.current) return;
    endRef.current = true;
    phaseRef.current = 'finished';
    setPhase('finished');
    setLights(5);
    engine.silence();
    engine.foul();
    vibrate(120);
    const p = playerRef.current;
    p.reaction = -1;
    const res: RaceResult = {
      outcome: 'foul',
      playerEt: 0,
      playerTrap: 0,
      reaction: -1,
      sixty: null,
      hundred: null,
      rivalEt: rivalRef.current.finishTime ?? 0,
      rivalTrap: rivalRef.current.trap,
      margin: 0,
      isRecord: false,
    };
    setResult(res);
    onResultRef.current(res);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let scroll = 0;
    let size = { w: 1, h: 1 };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      size = { w: Math.max(1, rect.width), h: Math.max(1, rect.height) };
      canvas.width = Math.round(size.w * dpr);
      canvas.height = Math.round(size.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const tick = (nowMs: number) => {
      raf = requestAnimationFrame(tick);
      const now = nowMs / 1000;
      const dt = Math.min(0.05, Math.max(0, (nowMs - last) / 1000));
      last = nowMs;

      const p = playerRef.current;
      const q = rivalRef.current;

      if (phaseRef.current === 'tree') {
        if (now >= greenAtRef.current) {
          phaseRef.current = 'running';
          setPhase('running');
          setLights(4);
        } else {
          const e = now - treeStartRef.current;
          const lit = e < 0 ? 0 : e >= 1.0 ? 3 : e >= 0.5 ? 2 : 1;
          setLights((prev) => (prev === lit ? prev : lit));
        }
      }

      if (phaseRef.current === 'running') {
        // The rival leaves on its own reaction off the green, floored at your tap
        // (see handlePrimary): a slow serve is never jumped, a quick one gains track.
        if (!q.launched && rivalStartRef.current > 0 && now >= rivalStartRef.current) {
          q.launched = true;
          q.launchT = 0;
          q.et = 0;
          q.reaction = rivalReactionRef.current;
        }

        if (q.launched && q.finishTime === null) {
          const ratio = q.rpm / q.spec.redline;
          const target = targetsRef.current[q.gear] ?? 0.97;
          if (ratio >= target && q.gear < q.spec.gears.length - 1) {
            shift(q);
            // Even a sharp driver misses the window now and then.
            if (Math.random() < difficulty.shiftMiss) q.boost = 0;
          }
          const qBefore = q.dist;
          stepRunner(q, dt, 1);
          if (q.dist >= TRACK_LENGTH) {
            q.finishTime = q.et;
            q.trap = q.v;
            rivalCrossRef.current = crossMoment(qBefore, q.dist, now, dt);
          }
        }

        if (p.launched && p.finishTime === null) {
          const pBefore = p.dist;
          stepRunner(p, dt, 1);
          if (p.dist >= TRACK_LENGTH) {
            p.finishTime = p.et;
            p.trap = p.v;
            playerCrossRef.current = crossMoment(pBefore, p.dist, now, dt);
            vibrate(40);
          }
        }

        if (firstFinishRef.current === 0 && (p.finishTime !== null || q.finishTime !== null)) {
          firstFinishRef.current = now;
        }
        const bothDone = p.finishTime !== null && q.finishTime !== null;
        const stalled = firstFinishRef.current > 0 && now - firstFinishRef.current > 2.4;
        if (bothDone || stalled) finishRace();
      }

      // HUD
      if (etRef.current) etRef.current.textContent = p.launched ? p.et.toFixed(3) : '0.000';
      if (distRef.current) {
        distRef.current.textContent = String(Math.round(Math.min(TRACK_LENGTH, p.dist)));
      }
      if (gapRef.current) {
        const gap = p.dist - q.dist;
        gapRef.current.textContent = `${gap >= 0 ? '+' : ''}${gap.toFixed(0)}m`;
      }
      if (speedRef.current) speedRef.current.textContent = String(Math.round(p.v * MPS_TO_MPH));
      if (gearRef.current) gearRef.current.textContent = p.launched ? String(p.gear + 1) : 'N';
      const ratio = Math.min(1, p.rpm / spec.redline);
      if (rpmRef.current) {
        rpmRef.current.style.width = `${ratio * 100}%`;
        rpmRef.current.classList.toggle('hot', ratio >= 0.87);
      }
      if (nosRef.current) nosRef.current.style.width = `${(p.nosLeft / spec.nosSeconds) * 100}%`;

      engine.update(ratio, p.launched && phaseRef.current === 'running' ? 1 : 0);

      scroll += p.v * 18 * dt;

      const toView = (r: Runner, paint: CarSpec): CarView => ({
        spec: paint,
        rpm: r.rpm,
        v: r.v,
        spinAngle: r.spinAngle,
        spin: r.spin,
        nos: r.nosActive && r.nosLeft > 0,
        launched: r.launched,
        finished: r.finishTime !== null,
      });

      drawScene(ctx, {
        w: size.w,
        h: size.h,
        now,
        scroll,
        playerDist: p.dist,
        rivalDist: q.dist,
        player: toView(p, spec),
        rival: toView(q, rivalPaintRef.current),
      });
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.clearTimeout(toastTimerRef.current);
      engine.silence();
    };
  }, [difficulty.shiftMiss, finishRace, spec.redline]);

  const startTree = useCallback(() => {
    engine.ensure();
    engine.setMuted(muted);
    const now = performance.now() / 1000;
    treeStartRef.current = now + 0.55 + Math.random() * 0.85;
    greenAtRef.current = treeStartRef.current + GREEN_DELAY;
    rivalReactionRef.current =
      difficulty.reaction[0] + Math.random() * (difficulty.reaction[1] - difficulty.reaction[0]);
    rivalStartRef.current = 0;
    playerCrossRef.current = Infinity;
    rivalCrossRef.current = Infinity;
    phaseRef.current = 'tree';
    setPhase('tree');
    vibrate(8);
  }, [difficulty, muted]);

  const handlePrimary = useCallback(() => {
    const now = performance.now() / 1000;
    if (phaseRef.current === 'idle') {
      startTree();
      return;
    }
    if (phaseRef.current === 'finished') return;
    const p = playerRef.current;
    if (p.launched) return;
    if (now < greenAtRef.current - 0.004) {
      foul();
      return;
    }
    engine.ensure();
    const rt = Math.max(0, now - greenAtRef.current);
    p.launched = true;
    p.launchT = 0;
    p.et = 0;
    p.reaction = rt;
    // The rival leaves on its own reaction off the green, never before your tap.
    // That keeps a slow serve from being jumped while making a fast tap pay: the
    // gap you open is exactly the reaction time you beat it by.
    rivalStartRef.current = Math.max(greenAtRef.current + rivalReactionRef.current, now);
    if (rt <= HOLESHOT_RT) p.boost = Math.max(p.boost, 0.6);
    phaseRef.current = 'running';
    setLaunched(true);
    setPhase('running');
    showToast(
      `${rt <= HOLESHOT_RT ? 'HOLESHOT' : rt <= LATE_RT ? 'CLEAN' : 'LATE'} ${rt.toFixed(3)}`,
      rt <= LATE_RT ? 'good' : 'bad',
    );
    engine.launch();
    vibrate(30);
  }, [foul, showToast, startTree]);

  const handleShift = useCallback(() => {
    const p = playerRef.current;
    if (!p.launched || p.finishTime !== null || phaseRef.current !== 'running') return;
    const res = shift(p);
    if (res === 'top') {
      showToast('TOP GEAR', 'info');
      return;
    }
    engine.shift(res === 'perfect');
    showToast(res === 'perfect' ? 'PERFECT' : 'EARLY', res === 'perfect' ? 'good' : 'bad');
    vibrate(res === 'perfect' ? 14 : 6);
  }, [showToast]);

  const nosDown = useCallback(() => {
    const p = playerRef.current;
    if (!p.launched || p.finishTime !== null || p.nosLeft <= 0) return;
    p.nosActive = true;
    engine.ensure();
    vibrate(10);
  }, []);

  const nosUp = useCallback(() => {
    playerRef.current.nosActive = false;
  }, []);

  const showPrimary = phase === 'idle' || !launched;

  return (
    <div className="race">
      <div className="hud">
        <button className="icon-btn" onPointerDown={onExit} aria-label="Back to garage">
          ←
        </button>
        <div className="hud-stats">
          <div className="stat2">
            <span className="k">ET</span>
            <b ref={etRef} className="wide">
              0.000
            </b>
          </div>
          <div className="stat2">
            <span className="k">DIST</span>
            <b ref={distRef} className="wide-sm">
              0
            </b>
          </div>
          <div className="stat2">
            <span className="k">GAP</span>
            <b ref={gapRef} className="wide-sm">
              0m
            </b>
          </div>
        </div>
        <button className="icon-btn" onPointerDown={onToggleMute} aria-label="Toggle sound">
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      <div className="stage" ref={wrapRef}>
        <canvas ref={canvasRef} />

        <div className="tree" aria-hidden="true">
          <span className={`lamp amber ${lights > 0 && lights !== 4 && lights !== 5 ? 'on' : ''}`} />
          <span className={`lamp amber ${lights > 1 && lights !== 4 && lights !== 5 ? 'on' : ''}`} />
          <span className={`lamp amber ${lights > 2 && lights !== 4 && lights !== 5 ? 'on' : ''}`} />
          <span className={`lamp green ${lights === 4 ? 'on' : ''}`} />
          <span className={`lamp red ${lights === 5 ? 'on' : ''}`} />
        </div>

        <div className="tach">
          <div className="gearbox">
            <b ref={gearRef}>N</b>
            <small>GEAR</small>
          </div>
          <div className="rpm-track">
            <div className="rpm">
              <div className="rpm-fill" ref={rpmRef} />
              <span className="zone" />
            </div>
            <div className="rpm-labels">
              <span>SHIFT</span>
              <span>REDLINE</span>
            </div>
          </div>
          <div className="speedbox">
            <b ref={speedRef}>0</b>
            <small>MPH</small>
          </div>
        </div>

        <div className="toast" ref={toastRef} />
      </div>

      <div className="pedals">
        {showPrimary ? (
          <button className={`btn primary big ${phase === 'tree' ? 'armed' : ''}`} onPointerDown={handlePrimary}>
            {phase === 'idle' ? 'STAGE' : 'LAUNCH'}
          </button>
        ) : (
          <div className="pad-row">
            <button
              className="pad nos"
              onPointerDown={nosDown}
              onPointerUp={nosUp}
              onPointerLeave={nosUp}
              onPointerCancel={nosUp}
            >
              <span>NOS</span>
              <small>HOLD</small>
              <div className="meter" ref={nosRef} />
            </button>
            <button className="pad shift" onPointerDown={handleShift}>
              <span>SHIFT</span>
              <small>UP</small>
            </button>
          </div>
        )}
      </div>

      {result && (
        <ResultPanel
          result={result}
          carName={spec.name}
          rivalName={`${spec.name} — RIVAL`}
          bestEt={bestEt}
          onAgain={onAgain}
          onGarage={onExit}
        />
      )}
    </div>
  );
}
