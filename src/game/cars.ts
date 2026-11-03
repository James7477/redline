export type CarSpec = {
  id: string;
  name: string;
  klass: string;
  tagline: string;
  drivetrain: string;
  /** Body paint colours used by the canvas renderer. */
  body: string;
  bodyDark: string;
  accent: string;
  glow: string;
  /** Body shape the canvas renderer knows how to draw. */
  shape?: 'coupe' | 'truck';
  /** Trucks: colour of the two-tone lower body panel. */
  lower?: string;
  /** Trucks: colour of the stripe banding. */
  stripe?: string;
  /** Competition number painted on the door. */
  number?: string;
  mass: number;
  /** Peak crank torque in Nm. */
  torque: number;
  redline: number;
  idle: number;
  gears: number[];
  finalDrive: number;
  /** Drag coefficient x frontal area (Cd*A). */
  cdA: number;
  /** Launch traction available, in g. */
  grip: number;
  nosSeconds: number;
  nosBoost: number;
  /** Electric motors pull flat from zero. */
  flatTorque: boolean;
  stats: { power: number; grip: number; aero: number; nos: number };
};

export const CARS: CarSpec[] = [
  {
    id: 'wildcat',
    name: 'WILDCAT',
    klass: 'TOYOTA PICKUP',
    tagline: 'Flareside, gold rockers, slicks out back. A Toyota that hooks.',
    drivetrain: 'RWD · 5-SPEED',
    shape: 'truck',
    body: '#b3121f',
    bodyDark: '#4a0710',
    lower: '#c9a24e',
    stripe: '#f2ecdd',
    number: '09',
    accent: '#d9b268',
    glow: '#d8363f',
    mass: 1600,
    torque: 700,
    redline: 6900,
    idle: 900,
    gears: [3.2, 2.0, 1.45, 1.0],
    finalDrive: 3.95,
    cdA: 0.98,
    grip: 1.2,
    nosSeconds: 1.7,
    nosBoost: 1.28,
    flatTorque: false,
    stats: { power: 88, grip: 94, aero: 34, nos: 70 },
  },
  {
    id: 'havoc',
    name: 'HAVOC SS',
    klass: 'BIG BLOCK',
    number: '01',
    tagline: 'Old-school muscle. All noise, all torque, no manners.',
    drivetrain: 'RWD · 6-SPEED',
    body: '#e8402f',
    bodyDark: '#7d1409',
    accent: '#ffc247',
    glow: '#ff5a3c',
    mass: 1640,
    torque: 620,
    redline: 7200,
    idle: 850,
    gears: [3.06, 2.1, 1.55, 1.22, 1.0, 0.81],
    finalDrive: 3.55,
    cdA: 0.82,
    grip: 0.95,
    nosSeconds: 1.8,
    nosBoost: 1.32,
    flatTorque: false,
    stats: { power: 82, grip: 62, aero: 54, nos: 78 },
  },
  {
    id: 'fang',
    name: 'FANG RS',
    klass: 'TURBO AWD',
    number: '07',
    tagline: 'Hooks up off the line and never stops pulling.',
    drivetrain: 'AWD · 6-SPEED',
    body: '#7358ff',
    bodyDark: '#2a1a8a',
    accent: '#3ddad7',
    glow: '#8a7bff',
    mass: 1520,
    torque: 500,
    redline: 8200,
    idle: 1000,
    gears: [3.45, 2.2, 1.62, 1.26, 1.0, 0.83],
    finalDrive: 3.85,
    cdA: 0.7,
    grip: 1.12,
    nosSeconds: 2.2,
    nosBoost: 1.3,
    flatTorque: false,
    stats: { power: 74, grip: 92, aero: 72, nos: 94 },
  },
  {
    id: 'volt',
    name: 'VOLT X',
    klass: 'ELECTRIC',
    number: '03',
    tagline: 'Instant torque, no gear hunting. Silent and relentless.',
    drivetrain: 'AWD · 3-SPEED',
    body: '#25c9b0',
    bodyDark: '#0a5f57',
    accent: '#8ef7e6',
    glow: '#35e0d0',
    mass: 1980,
    torque: 760,
    redline: 15000,
    idle: 0,
    gears: [1.0, 0.72, 0.54],
    finalDrive: 7.6,
    cdA: 0.62,
    grip: 1.18,
    nosSeconds: 1.0,
    nosBoost: 1.1,
    flatTorque: true,
    stats: { power: 88, grip: 96, aero: 88, nos: 38 },
  },
  {
    id: 'nightjar',
    name: 'NIGHTJAR',
    klass: 'ROTARY',
    number: '22',
    tagline: 'Featherweight screamer. Almost nothing below 5000 rpm.',
    drivetrain: 'RWD · 6-SPEED',
    body: '#e9e5d8',
    bodyDark: '#6b675c',
    accent: '#ff3b4e',
    glow: '#e9e5d8',
    mass: 1280,
    torque: 380,
    redline: 9000,
    idle: 1100,
    gears: [3.6, 2.3, 1.7, 1.3, 1.05, 0.86],
    finalDrive: 4.1,
    cdA: 0.66,
    grip: 1.0,
    nosSeconds: 2.6,
    nosBoost: 1.34,
    flatTorque: false,
    stats: { power: 70, grip: 68, aero: 84, nos: 96 },
  },
  {
    id: 'ironhorse',
    name: 'IRONHORSE',
    klass: 'PRO STREET',
    number: '55',
    tagline: 'Barely street legal. Slicks, and a small block that hates you.',
    drivetrain: 'RWD · 4-SPEED',
    body: '#232a36',
    bodyDark: '#0a0d13',
    accent: '#ff8a3c',
    glow: '#ff8a3c',
    mass: 1580,
    torque: 680,
    redline: 7600,
    idle: 1200,
    gears: [2.6, 1.8, 1.35, 1.0],
    finalDrive: 4.3,
    cdA: 0.95,
    grip: 1.05,
    nosSeconds: 1.4,
    nosBoost: 1.25,
    flatTorque: false,
    stats: { power: 92, grip: 80, aero: 40, nos: 56 },
  },
  {
    id: 'bandit',
    name: 'BANDIT 4X4',
    klass: 'STREET TRUCK',
    number: '14',
    tagline: 'Two tonnes of bad idea. Launches like it is bolted down.',
    drivetrain: 'AWD · 5-SPEED',
    body: '#2f6b4f',
    bodyDark: '#12301f',
    accent: '#e8d24a',
    glow: '#54d18a',
    mass: 2150,
    torque: 900,
    redline: 6400,
    idle: 800,
    gears: [3.8, 2.3, 1.6, 1.2, 0.95],
    finalDrive: 3.2,
    cdA: 1.05,
    grip: 1.15,
    nosSeconds: 1.6,
    nosBoost: 1.24,
    flatTorque: false,
    stats: { power: 86, grip: 100, aero: 30, nos: 62 },
  },
];

export type DifficultyId = 'rookie' | 'pro' | 'legend';

export type Difficulty = {
  id: DifficultyId;
  name: string;
  blurb: string;
  /** Torque multiplier applied to the rival. */
  power: number;
  reaction: [number, number];
  shiftBase: number;
  shiftSpread: number;
  /** Chance the rival fumbles a shift and loses the boost for that gear. */
  shiftMiss: number;
};

export const DIFFICULTIES: Difficulty[] = [
  {
    id: 'rookie',
    name: 'ROOKIE',
    blurb: 'Lifts early. Sleeps on the lights.',
    power: 0.95,
    reaction: [0.38, 0.58],
    shiftBase: 0.91,
    shiftSpread: 0.11,
    shiftMiss: 0.38,
  },
  {
    id: 'pro',
    name: 'PRO',
    blurb: 'Clean shifts, decent launch. A real race.',
    power: 1.0,
    reaction: [0.3, 0.44],
    shiftBase: 0.955,
    shiftSpread: 0.06,
    shiftMiss: 0.17,
  },
  {
    id: 'legend',
    name: 'LEGEND',
    blurb: 'Hits the tree. Never misses a gear.',
    power: 1.005,
    reaction: [0.24, 0.36],
    shiftBase: 0.975,
    shiftSpread: 0.03,
    shiftMiss: 0.06,
  },
];

export function carById(id: string): CarSpec {
  return CARS.find((c) => c.id === id) ?? CARS[0];
}

export function difficultyById(id: string): Difficulty {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

/**
 * Normalised torque curve. x = rpm / redline.
 * Peaks around 0.70 of redline, ~60% of peak at 20%, still 85% at the limiter.
 */
export function torqueFactor(spec: CarSpec, x: number): number {
  if (spec.flatTorque) {
    // Electric: full torque off zero, fading through the top of the rev range.
    if (x <= 0.45) return 1;
    return 1 - 0.28 * Math.min(1, (x - 0.45) / 0.55);
  }
  const v = 0.2125 + 2.2625 * x - 1.625 * x * x;
  return Math.max(0.32, v);
}
