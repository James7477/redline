import type { Livery } from './livery';
import { MPS_TO_KMH, MPS_TO_MPH, type TrackLength } from './physics';

const KEY = 'redline.records.v1';

export type StoredRecord = {
  et: number;
  trap: number;
  /** Fastest speed of the record run, m/s. Older records have no value (0). */
  top: number;
  when: number;
};

export type Records = Record<string, StoredRecord>;

/** Records are kept per car and per track — an eighth-mile pass can't stand as a quarter best. */
export function recordKey(id: string, track: TrackLength): string {
  return `${id}:${track}`;
}

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Records = {};
    for (const [raw, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Partial<StoredRecord>;
      if (typeof v.et === 'number' && Number.isFinite(v.et)) {
        // Records saved before there were two tracks were all quarter-mile runs.
        const id = raw.includes(':') ? raw : `${raw}:quarter`;
        out[id] = {
          et: v.et,
          trap: typeof v.trap === 'number' ? v.trap : 0,
          top: typeof v.top === 'number' ? v.top : 0,
          when: v.when ?? 0,
        };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveRecord(
  id: string,
  track: TrackLength,
  et: number,
  trap: number,
  top: number,
): Records {
  const records = loadRecords();
  const key = recordKey(id, track);
  const existing = records[key];
  if (!existing || et < existing.et) {
    records[key] = { et, trap, top, when: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
    } catch {
      /* storage full or blocked - keep the in-memory copy */
    }
  }
  return records;
}

export function formatEt(et: number): string {
  if (!Number.isFinite(et) || et <= 0) return '—.———';
  return et.toFixed(3);
}

/* ------------------------------------------------------------- liveries */

const LIVERY_KEY = 'redline.livery.v1';

export type LiveryMap = Record<string, Livery>;

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadLiveries(): LiveryMap {
  const parsed = safeParse(localStorage.getItem(LIVERY_KEY));
  if (!parsed || typeof parsed !== 'object') return {};
  const out: LiveryMap = {};
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as Partial<Livery>;
    if (typeof v.paint === 'string' && typeof v.rim === 'string') {
      out[id] = { paint: v.paint, rim: v.rim };
    }
  }
  return out;
}

export function saveLivery(carId: string, livery: Livery): LiveryMap {
  const all = loadLiveries();
  all[carId] = livery;
  try {
    localStorage.setItem(LIVERY_KEY, JSON.stringify(all));
  } catch {
    /* storage full or blocked */
  }
  return all;
}

/* ------------------------------------------------------- launch ratings */

const REACTION_KEY = 'redline.reaction.v1';

/** Best reaction time per car id, set in the tree drill. */
export type Reactions = Record<string, number>;

export function loadReactions(): Reactions {
  const parsed = safeParse(localStorage.getItem(REACTION_KEY));
  if (!parsed || typeof parsed !== 'object') return {};
  const out: Reactions = {};
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) out[id] = value;
  }
  return out;
}

export function saveReaction(id: string, rt: number): Reactions {
  const all = loadReactions();
  const existing = all[id];
  if (existing === undefined || rt < existing) {
    all[id] = rt;
    try {
      localStorage.setItem(REACTION_KEY, JSON.stringify(all));
    } catch {
      /* storage full or blocked */
    }
  }
  return all;
}

/**
 * Turn a best reaction time into a 0-100 launch rating for the garage. ~0.09 s
 * tops it out, and anything past half a second reads as asleep at the tree.
 */
export function launchRating(rt: number | null): { score: number; label: string } {
  if (rt === null || !Number.isFinite(rt)) return { score: 0, label: 'UNRATED' };
  const score = Math.max(10, Math.min(100, Math.round(112 - rt * 130)));
  const label =
    rt <= 0.12 ? 'SHARP' : rt <= 0.22 ? 'QUICK' : rt <= 0.4 ? 'FAIR' : rt <= 0.6 ? 'SLEEPY' : 'ASLEEP';
  return { score, label };
}

/* ---------------------------------------------------------------- units */

const UNITS_KEY = 'redline.units.v1';

/** Speed display preference: miles per hour or km/h. */
export type Units = 'mph' | 'kmh';

export function loadUnits(): Units {
  try {
    return localStorage.getItem(UNITS_KEY) === 'kmh' ? 'kmh' : 'mph';
  } catch {
    return 'mph';
  }
}

export function saveUnits(units: Units): Units {
  try {
    localStorage.setItem(UNITS_KEY, units);
  } catch {
    /* storage full or blocked */
  }
  return units;
}

/** Unit label for the speedo and readouts, e.g. MPH. */
export function speedUnit(units: Units): string {
  return units === 'kmh' ? 'KM/H' : 'MPH';
}

/* --------------------------------------------------------------- tracks */

const TRACK_KEY = 'redline.track.v1';

/** Strip length chosen in the garage. */
export function loadTrack(): TrackLength {
  try {
    return localStorage.getItem(TRACK_KEY) === 'eighth' ? 'eighth' : 'quarter';
  } catch {
    return 'quarter';
  }
}

export function saveTrack(track: TrackLength): TrackLength {
  try {
    localStorage.setItem(TRACK_KEY, track);
  } catch {
    /* storage full or blocked */
  }
  return track;
}

/** m/s in the chosen unit, rounded, or a dash when there is no reading yet. */
export function formatSpeed(mps: number, units: Units): string {
  if (!Number.isFinite(mps) || mps <= 0) return '—';
  return String(Math.round(mps * (units === 'kmh' ? MPS_TO_KMH : MPS_TO_MPH)));
}
