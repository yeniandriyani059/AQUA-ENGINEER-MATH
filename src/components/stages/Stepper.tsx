import React from 'react';
import { useApp } from '../../context/AppContext';
import { STAGES } from '../../data/stages';
import { stageState } from '../../utils/storage';
import { Icon } from '../icons/Icon';

export function Stepper() {
  const { proj, go } = useApp();
  return (
    <nav className="stepper" aria-label="Tahap petualangan">
      {STAGES.map((s) => {
        const st = stageState(proj, s.n);
        return (
          <button
            key={s.n}
            className="step"
            style={{ '--c': s.c } as React.CSSProperties}
            disabled={st === 'locked'}
            aria-current={st === 'current' ? 'step' : undefined}
            onClick={() => go('petualangan', s.n)}
          >
            <b>
              {st === 'done' ? (
                <Icon n="check" size={16} sw={3.5} />
              ) : (
                s.n
              )}
            </b>
            {s.k}
          </button>
        );
      })}
    </nav>
  );
}
