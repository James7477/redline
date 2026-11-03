import type { CarSpec } from '../game/cars';
import { PAINTS, RIMS, STOCK, type Livery } from '../game/livery';
import { CarThumb } from './CarThumb';

type Props = {
  spec: CarSpec;
  stock: CarSpec;
  livery: Livery;
  onChange: (livery: Livery) => void;
  onClose: () => void;
};

export function Customize({ spec, stock, livery, onChange, onClose }: Props) {
  return (
    <div className="result" role="dialog" aria-label="Customize car">
      <div className="sheet">
        <div className="sheet-head">
          <div>
            <div className="sheet-title">{stock.name}</div>
            <div className="sheet-sub">PAINT &amp; WHEELS</div>
          </div>
          <button className="icon-btn" onPointerDown={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <CarThumb spec={spec} className="livery-preview" />

        <h3 className="label">PAINT</h3>
        <div className="swatches">
          <button
            className={`swatch stock ${livery.paint === STOCK ? 'on' : ''}`}
            style={{ background: stock.body }}
            onPointerDown={() => onChange({ ...livery, paint: STOCK })}
            aria-label="Stock paint"
          />
          {PAINTS.map((paint) => (
            <button
              key={paint.id}
              className={`swatch ${livery.paint === paint.id ? 'on' : ''}`}
              style={{ background: paint.body }}
              onPointerDown={() => onChange({ ...livery, paint: paint.id })}
              aria-label={paint.name}
            />
          ))}
        </div>

        <h3 className="label">WHEELS</h3>
        <div className="swatches">
          <button
            className={`swatch stock ${livery.rim === STOCK ? 'on' : ''}`}
            style={{ background: stock.accent }}
            onPointerDown={() => onChange({ ...livery, rim: STOCK })}
            aria-label="Stock wheels"
          />
          {RIMS.map((rim) => (
            <button
              key={rim.id}
              className={`swatch ${livery.rim === rim.id ? 'on' : ''}`}
              style={{ background: rim.color }}
              onPointerDown={() => onChange({ ...livery, rim: rim.id })}
              aria-label={rim.name}
            />
          ))}
        </div>

        <div className="result-actions">
          <button className="btn primary" onPointerDown={onClose}>
            DONE
          </button>
          <button
            className="btn ghost"
            onPointerDown={() => onChange({ paint: STOCK, rim: STOCK })}
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}
