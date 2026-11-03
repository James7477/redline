import { torqueFactor, type CarSpec } from './cars';

/** The two strip lengths you can race. */
export type TrackLength = 'eighth' | 'quarter';

export type Track = {
  id: TrackLength;
  name: string;
  /** Length in feet, for every readout the player sees. */
  feet: number;
  /** Length in metres, for the physics. */
  metres: number;
};

/** Every distance in the game reads in feet — these are the American strips. */
export const TRACKS: Record<TrackLength, Track> = {
  eighth: { id: 'eighth', name: '1/8 MILE', feet: 660, metres: 201.168 },
  quarter: { id: 'quarter', name: '1/4 MILE', feet: 1320, metres: 402.336 },
};

export const WHEEL_R = 0.34;
/** Shift anywhere above this fraction of redline for a perfect shift. */
export const PERFECT_MIN = 0.87;
export const SIXTY_FEET = 18.288;
/** Metres per second to miles per hour — the speedo and trap speed read in mph. */
export const MPS_TO_MPH = 2.23694;
/** Metres per second to km/h, for players who prefer metric. */
export const MPS_TO_KMH = 3.6;
/** Metres per second to feet per second, for the distance readouts. */
export const MPS_TO_FPS = 3.28084;
/** 60 mph in m/s, the American stand-in for the old 0-100 km/h split. */
const SIXTY_MPH = 26.8224;

export type Runner = {
  spec: CarSpec;
  gear: number;
  rpm: number;
  v: number;
  dist: number;
  et: number;
  launched: boolean;
  launchT: number;
  nosLeft: number;
  nosActive: boolean;
  boost: number;
  limiter: boolean;
  spin: number;
  spinAngle: number;
  reaction: number;
  finishTime: number | null;
  trap: number;
  /** Fastest the car went at any point in the run, in m/s. */
  topSpeed: number;
  sixty: number | null;
  /** Time to 60 mph, m/s threshold. */
  sixtyMph: number | null;
  powerScale: number;
};

export function createRunner(spec: CarSpec, powerScale = 1): Runner {
  return {
    spec,
    gear: 0,
    rpm: spec.idle,
    v: 0,
    dist: 0,
    et: 0,
    launched: false,
    launchT: 0,
    nosLeft: spec.nosSeconds,
    nosActive: false,
    boost: 0,
    limiter: false,
    spin: 0,
    spinAngle: 0,
    reaction: 0,
    finishTime: null,
    trap: 0,
    topSpeed: 0,
    sixty: null,
    sixtyMph: null,
    powerScale,
  };
}

/** Advance one car by dt seconds at the given throttle (0..1). */
export function stepRunner(r: Runner, dt: number, throttle: number): void {
  const spec = r.spec;
  const gearRatio = spec.gears[r.gear];

  // Engine rpm implied by road speed in the current gear.
  const geared = (r.v * 60 * gearRatio * spec.finalDrive) / (2 * Math.PI * WHEEL_R);

  let rpm = geared;
  if (r.launched && r.launchT < 0.5) {
    // Clutch slip off the line: revs climb ahead of road speed.
    const target = spec.idle + (spec.redline * 0.6 - spec.idle) * (r.launchT / 0.5);
    rpm = Math.max(rpm, target);
  }
  rpm = Math.max(rpm, spec.idle, 1);
  r.rpm = rpm;

  const x = Math.min(rpm / spec.redline, 1.06);
  let torque = spec.torque * torqueFactor(spec, x);

  r.limiter = rpm >= spec.redline * 0.997;
  if (r.limiter) torque *= 0.15;

  if (r.boost > 0) {
    r.boost = Math.max(0, r.boost - dt);
    torque *= 1.16;
  }

  let nitrous = 1;
  if (r.nosActive && r.nosLeft > 0) {
    nitrous = spec.nosBoost;
    r.nosLeft = Math.max(0, r.nosLeft - dt);
  }

  let force =
    ((torque * r.powerScale * nitrous * gearRatio * spec.finalDrive) / WHEEL_R) * 0.9 * throttle;
  let accel = force / spec.mass;

  // Tyres can only put down so much.
  const gripAccel = spec.grip * 9.81;
  if (accel > gripAccel) {
    accel = gripAccel;
    r.spin = Math.min(1, r.spin + dt * 5);
  } else {
    r.spin = Math.max(0, r.spin - dt * 2.5);
  }

  accel -= (0.5 * 1.225 * spec.cdA * r.v * r.v) / spec.mass + 0.14;
  if (throttle <= 0) accel -= 2.4;

  r.v = Math.max(0, r.v + accel * dt);
  if (r.v > r.topSpeed) r.topSpeed = r.v;
  r.dist += r.v * dt;
  r.spinAngle += (r.v / WHEEL_R) * dt;

  if (r.launched) {
    r.launchT += dt;
    r.et += dt;
    if (r.sixty === null && r.dist >= SIXTY_FEET) r.sixty = r.et;
    if (r.sixtyMph === null && r.v >= SIXTY_MPH) r.sixtyMph = r.et;
  }
}

export type ShiftResult = 'perfect' | 'early' | 'top';

export function shift(r: Runner): ShiftResult {
  if (r.gear >= r.spec.gears.length - 1) return 'top';
  const ratio = r.rpm / r.spec.redline;
  r.gear += 1;
  if (ratio >= PERFECT_MIN) {
    r.boost = 0.75; // brief torque bump for nailing the window
    return 'perfect';
  }
  return 'early';
}
