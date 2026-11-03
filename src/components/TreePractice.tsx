import { useCallback, useEffect, useRef, useState } from 'react';

/** Same tree as a race: ambers every 0.5 s, green 1.5 s after it starts. */
const GREEN_DELAY = 1.5;
/** Reaction (s from green) that counts as a holeshot — matches the race. */
const HOLESHOT_RT = 0.22;
const CLEAN_RT = 0.4;

type Phase = 'idle' | 'tree' | 'done';

type Leave = { kind: 'foul' } | { kind: 'run'; rt: number };

function gradeOf(rt: number): { text: string; tone: string } {
  if (rt <= HOLESHOT_RT) return { text: 'HOLESHOT', tone: 'good' };
  if (rt <= CLEAN_RT) return { text: 'CLEAN LAUNCH', tone: 'ok' };
  return { text: 'LATE', tone: 'bad' };
}

/**
 * Tree drill: stage, wait out the ambers, tap on green. Nothing else runs, so a
 * clumsy launch costs nothing but the next attempt.
 */
export function TreePractice({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [lights, setLights] = useState(0);
  const [leave, setLeave] = useState<Leave | null>(null);
  const [runs, setRuns] = useState(0);
  const [last, setLast] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);

  const phaseRef = useRef<Phase>('idle');
  const treeStartRef = useRef(0);
  const greenAtRef = useRef(0);
  const bestRef = useRef<number | null>(null);

  const go = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stage = useCallback(() => {
    const now = performance.now() / 1000;
    treeStartRef.current = now + 0.55 + Math.random() * 0.85;
    greenAtRef.current = treeStartRef.current + GREEN_DELAY;
    setLeave(null);
    setLights(0);
    go('tree');
  }, [go]);

  useEffect(() => {
    if (phase !== 'tree') return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const e = performance.now() / 1000 - treeStartRef.current;
      const lit = e < 0 ? 0 : e >= 1 ? 3 : e >= 0.5 ? 2 : 1;
      setLights((prev) => (prev === lit ? prev : lit));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const tap = useCallback(() => {
    if (phaseRef.current !== 'tree') {
      stage();
      return;
    }
    const now = performance.now() / 1000;
    if (now < greenAtRef.current - 0.004) {
      setLights(5);
      setLeave({ kind: 'foul' });
      setRuns((n) => n + 1);
      go('done');
      return;
    }
    const rt = now - greenAtRef.current;
    setLights(4);
    setLast(rt);
    setRuns((n) => n + 1);
    if (bestRef.current === null || rt < bestRef.current) {
      bestRef.current = rt;
      setBest(rt);
    }
    setLeave({ kind: 'run', rt });
    go('done');
  }, [go, stage]);

  const grade = leave && leave.kind === 'run' ? gradeOf(leave.rt) : null;
  const label = phase === 'tree' ? 'TAP ON GREEN' : phase === 'idle' ? 'STAGE THE TREE' : 'GO AGAIN';

  return (
    <div className="practice">
      <header className="practice-head">
        <div className="brand">
          <span className="slash" />
          TREE PRACTICE
        </div>
        <button className="icon-btn" onPointerDown={onClose} aria-label="Back to garage">
          ←
        </button>
      </header>

      <div className="practice-stage">
        <div className="tree tree-prac" aria-hidden="true">
          <span className={`lamp amber ${lights > 0 && lights !== 4 && lights !== 5 ? 'on' : ''}`} />
          <span className={`lamp amber ${lights > 1 && lights !== 4 && lights !== 5 ? 'on' : ''}`} />
          <span className={`lamp amber ${lights > 2 && lights !== 4 && lights !== 5 ? 'on' : ''}`} />
          <span className={`lamp green ${lights === 4 ? 'on' : ''}`} />
          <span className={`lamp red ${lights === 5 ? 'on' : ''}`} />
        </div>

        <div className="practice-read">
          {leave === null
            ? phase === 'tree'
              ? 'WAIT FOR GREEN'
              : 'STAGE THE TREE'
            : leave.kind === 'foul'
              ? 'RED LIGHT'
              : leave.rt.toFixed(3)}
        </div>

        {grade ? (
          <div className={`practice-grade ${grade.tone}`}>{grade.text}</div>
        ) : leave?.kind === 'foul' ? (
          <div className="practice-grade bad">JUMPED THE START</div>
        ) : (
          <div className="practice-grade dim">REACTION FROM GREEN</div>
        )}
      </div>

      <div className="practice-stats">
        <div>
          <span>RUNS</span>
          <b>{runs}</b>
        </div>
        <div>
          <span>LAST</span>
          <b>{last === null ? '—' : last.toFixed(3)}</b>
        </div>
        <div>
          <span>BEST</span>
          <b>{best === null ? '—' : best.toFixed(3)}</b>
        </div>
      </div>

      <p className="hint">
        Green is the only thing that matters here. Tap late rather than early — a red light costs more
        than a lazy leave ever will.
      </p>

      <button className={`btn primary big ${phase === 'tree' ? 'armed' : ''}`} onPointerDown={tap}>
        {label}
      </button>
    </div>
  );
}
