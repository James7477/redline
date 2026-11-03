import { useMemo, useState, type CSSProperties } from 'react';
import { CARS, DIFFICULTIES, type CarSpec, type DifficultyId } from '../game/cars';
import { DEFAULT_LIVERY, applyLivery, type Livery } from '../game/livery';
import { formatEt, type LiveryMap, type Records } from '../game/storage';
import { CarThumb } from './CarThumb';
import { Customize } from './Customize';

type Props = {
  carId: string;
  difficulty: DifficultyId;
  records: Records;
  liveries: LiveryMap;
  onPickCar: (id: string) => void;
  onPickDifficulty: (id: DifficultyId) => void;
  onLivery: (carId: string, livery: Livery) => void;
  onStart: () => void;
};

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <div className="track">
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function CarCard({
  car,
  selected,
  best,
  onPick,
}: {
  car: CarSpec;
  selected: boolean;
  best: number | null;
  onPick: () => void;
}) {
  return (
    <button
      className={`car ${selected ? 'sel' : ''}`}
      onPointerDown={onPick}
      style={{ '--paint': car.body, '--accent': car.accent } as CSSProperties}
    >
      <CarThumb spec={car} className="car-thumb" />
      <div className="car-head">
        <div>
          <div className="car-name">{car.name}</div>
          <div className="car-class">
            {car.klass} · {car.drivetrain}
          </div>
        </div>
        <div className="car-best">
          <span>BEST</span>
          <b>{best ? `${formatEt(best)}s` : '—'}</b>
        </div>
      </div>
      <p className="car-tag">{car.tagline}</p>
      <div className="stats">
        <Stat label="POWER" value={car.stats.power} />
        <Stat label="GRIP" value={car.stats.grip} />
        <Stat label="AERO" value={car.stats.aero} />
      </div>
    </button>
  );
}

export function Garage({
  carId,
  difficulty,
  records,
  liveries,
  onPickCar,
  onPickDifficulty,
  onLivery,
  onStart,
}: Props) {
  const [customizing, setCustomizing] = useState(false);

  const painted = useMemo(() => {
    const map: Record<string, CarSpec> = {};
    for (const car of CARS) map[car.id] = applyLivery(car, liveries[car.id]);
    return map;
  }, [liveries]);

  const stockSpec = CARS.find((car) => car.id === carId) ?? CARS[0];
  const shownSpec = painted[stockSpec.id] ?? stockSpec;
  const livery = liveries[stockSpec.id] ?? DEFAULT_LIVERY;

  return (
    <div className="garage">
      <header className="brand-head">
        <div className="brand">
          <span className="slash" />
          REDLINE
        </div>
        <div className="brand-sub">QUARTER MILE · 402 m</div>
      </header>

      <div className="garage-body">
        <h2 className="label">SELECT YOUR CAR</h2>
        <div className="cars">
          {CARS.map((car) => (
            <CarCard
              key={car.id}
              car={painted[car.id] ?? car}
              selected={car.id === carId}
              best={records[car.id]?.et ?? null}
              onPick={() => onPickCar(car.id)}
            />
          ))}
        </div>

        <h2 className="label">RIVAL SKILL</h2>
        <div className="seg">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              className={d.id === difficulty ? 'on' : ''}
              onPointerDown={() => onPickDifficulty(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
        <p className="hint">
          {DIFFICULTIES.find((d) => d.id === difficulty)?.blurb} Tap <b>STAGE</b> to arm the tree, then{' '}
          <b>LAUNCH</b> on green — a quick reaction buys real track, and the rival never jumps you.
          Shift near the red zone for a perfect-shift bonus.
        </p>
      </div>

      <footer className="garage-foot">
        <button className="btn ghost" onPointerDown={() => setCustomizing(true)}>
          CUSTOMIZE
        </button>
        <button className="btn primary" onPointerDown={onStart}>
          RACE
        </button>
      </footer>

      {customizing && (
        <Customize
          spec={shownSpec}
          stock={stockSpec}
          livery={livery}
          onChange={(next) => onLivery(stockSpec.id, next)}
          onClose={() => setCustomizing(false)}
        />
      )}
    </div>
  );
}
