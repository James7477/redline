import type { Livery } from './livery';

const KEY = 'redline.records.v1';

export type StoredRecord = {
  et: number;
  trap: number;
  when: number;
};

export type Records = Record<string, StoredRecord>;

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Records = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const v = value as Partial<StoredRecord>;
      if (typeof v.et === 'number' && Number.isFinite(v.et)) {
        out[id] = { et: v.et, trap: typeof v.trap === 'number' ? v.trap : 0, when: v.when ?? 0 };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function saveRecord(id: string, et: number, trap: number): Records {
  const records = loadRecords();
  const existing = records[id];
  if (!existing || et < existing.et) {
    records[id] = { et, trap, when: Date.now() };
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
