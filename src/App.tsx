import { useCallback, useEffect, useMemo, useState } from 'react';
import { Garage } from './components/Garage';
import { Race } from './components/Race';
import { TreePractice } from './components/TreePractice';
import type { RaceResult } from './components/ResultPanel';
import { carById, difficultyById, type DifficultyId } from './game/cars';
import { applyLivery, type Livery } from './game/livery';
import {
  loadLiveries,
  loadRecords,
  saveLivery,
  saveRecord,
  type LiveryMap,
  type Records,
} from './game/storage';

export default function App() {
  const [screen, setScreen] = useState<'garage' | 'race' | 'practice'>('garage');
  const [carId, setCarId] = useState('wildcat');
  const [difficulty, setDifficulty] = useState<DifficultyId>('pro');
  const [run, setRun] = useState(0);
  const [muted, setMuted] = useState(false);
  const [records, setRecords] = useState<Records>(() => loadRecords());
  const [liveries, setLiveries] = useState<LiveryMap>(() => loadLiveries());

  const baseSpec = carById(carId);
  const spec = useMemo(() => applyLivery(baseSpec, liveries[carId]), [baseSpec, liveries, carId]);
  const diff = difficultyById(difficulty);
  const bestEt = records[spec.id]?.et ?? null;

  const handleResult = useCallback(
    (result: RaceResult) => {
      if (result.outcome === 'foul' || result.playerEt <= 0) return;
      setRecords(saveRecord(spec.id, result.playerEt, result.playerTrap));
    },
    [spec.id],
  );

  const start = useCallback(() => {
    setRun((n) => n + 1);
    setScreen('race');
  }, []);

  const again = useCallback(() => {
    setRun((n) => n + 1);
  }, []);

  const practice = useCallback(() => {
    setScreen('practice');
  }, []);

  const exit = useCallback(() => {
    setScreen('garage');
    setRecords(loadRecords());
  }, []);

  const handleLivery = useCallback((id: string, livery: Livery) => {
    setLiveries(saveLivery(id, livery));
  }, []);

  // Keep the page from rubber-banding behind the game on iOS.
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', prevent, { passive: false });
    return () => document.removeEventListener('touchmove', prevent);
  }, []);

  return (
    <div className="app">
      <div className="shell">
        {screen === 'garage' ? (
          <Garage
            carId={carId}
            difficulty={difficulty}
            records={records}
            liveries={liveries}
            onPickCar={setCarId}
            onPickDifficulty={setDifficulty}
            onLivery={handleLivery}
            onStart={start}
            onPractice={practice}
          />
        ) : screen === 'practice' ? (
          <TreePractice onClose={exit} />
        ) : (
          <Race
            key={`${spec.id}-${difficulty}-${run}-${spec.body}`}
            spec={spec}
            difficulty={diff}
            muted={muted}
            bestEt={bestEt}
            onToggleMute={() => setMuted((m) => !m)}
            onExit={exit}
            onAgain={again}
            onResult={handleResult}
          />
        )}
      </div>
    </div>
  );
}
