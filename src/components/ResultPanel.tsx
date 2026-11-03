import { formatEt, formatSpeed, speedUnit, type Units } from '../game/storage';

export type RaceResult = {
  outcome: 'win' | 'lose' | 'foul' | 'dnf';
  playerEt: number;
  playerTrap: number;
  /** Fastest speed of the run, m/s — saved with the record. */
  playerTop: number;
  reaction: number;
  sixty: number | null;
  hundred: number | null;
  rivalEt: number;
  rivalTrap: number;
  margin: number;
  isRecord: boolean;
};

type Props = {
  result: RaceResult;
  carName: string;
  rivalName: string;
  /** Speed unit chosen in the garage. */
  units: Units;
  bestEt: number | null;
  onAgain: () => void;
  onGarage: () => void;
};

const HEADLINE: Record<RaceResult['outcome'], string> = {
  win: 'WIN',
  lose: 'LOSE',
  foul: 'RED LIGHT',
  dnf: 'NO TIME',
};

const SUB: Record<RaceResult['outcome'], string> = {
  win: 'Took the win light',
  lose: 'Chased them down the strip',
  foul: 'You left before the green',
  dnf: 'Never got off the line',
};

export function ResultPanel({ result, carName, rivalName, units, bestEt, onAgain, onGarage }: Props) {
  const unit = speedUnit(units).toLowerCase();
  const trap = result.playerTrap > 0 ? `${formatSpeed(result.playerTrap, units)} ${unit}` : '—';

  return (
    <div className="result">
      <div className="sheet">
        <div className={`headline ${result.outcome}`}>{HEADLINE[result.outcome]}</div>
        <p className="result-sub">{SUB[result.outcome]}</p>

        {result.isRecord && result.outcome !== 'foul' && (
          <div className="badge">NEW PERSONAL BEST</div>
        )}

        <div className="compare">
          <div className="lane you">
            <span className="lane-tag">YOU</span>
            <b>{formatEt(result.playerEt)}</b>
            <small>{trap}</small>
            <span className="lane-car">{carName}</span>
          </div>
          <div className="versus">VS</div>
          <div className="lane them">
            <span className="lane-tag">RIVAL</span>
            <b>{formatEt(result.rivalEt)}</b>
            <small>
              {result.rivalTrap > 0 ? `${formatSpeed(result.rivalTrap, units)} ${unit}` : '—'}
            </small>
            <span className="lane-car">{rivalName}</span>
          </div>
        </div>

        <div className="splits">
          <div>
            <span>REACTION</span>
            <b>{result.reaction >= 0 ? result.reaction.toFixed(3) : 'FOUL'}</b>
          </div>
          <div>
            <span>60 FT</span>
            <b>{result.sixty ? result.sixty.toFixed(3) : '—'}</b>
          </div>
          <div>
            <span>0–100</span>
            <b>{result.hundred ? result.hundred.toFixed(2) : '—'}</b>
          </div>
          <div>
            <span>MARGIN</span>
            <b>{result.margin > 0 ? `${result.margin.toFixed(3)}s` : '—'}</b>
          </div>
        </div>

        {bestEt !== null && <p className="best-line">Personal best in this car · {formatEt(bestEt)}s</p>}

        <div className="result-actions">
          <button className="btn primary" onPointerDown={onAgain}>
            RACE AGAIN
          </button>
          <button className="btn ghost" onPointerDown={onGarage}>
            GARAGE
          </button>
        </div>
      </div>
    </div>
  );
}
