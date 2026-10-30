import React from 'react';
import { useApp } from '../../context/AppContext';
import { GOALS, STAGES } from '../../data/stages';
import { caseOf } from '../../utils/math';
import { AquaTip, Stat, Btn } from '../common/UI';
import { Icon } from '../icons/Icon';

export function Tujuan() {
  const { proj, go } = useApp();
  const c = proj ? caseOf(proj) : null;

  return (
    <div className="main">
      <h1>Tujuan Pembelajaran</h1>
      <AquaTip>
        Ini bekal yang akan kamu kuasai. Centang hijau muncul otomatis saat tahap yang melatihnya sudah kamu selesaikan.
      </AquaTip>
      <div className="pcards">
        {GOALS.map((g, i) => {
          const ok = proj && g[2].every((n) => proj.stageDone[n]);
          return (
            <div key={i} className="card">
              <div className="row">
                <span className="chip">Tujuan {i + 1}</span>
                {ok && <Stat st="ok">Tercapai</Stat>}
              </div>
              <h3 style={{ margin: '8px 0' }}>{g[0]}</h3>
              <p>{g[1]}</p>
              <div className="row" style={{ marginTop: 10 }}>
                {g[2].map((n) => (
                  <Btn key={n} sm onClick={() => go('petualangan', n)}>
                    Tahap {STAGES[n - 1].k}
                  </Btn>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {c ? (
        <div className="card">
          <h2 style={{ marginBottom: 8 }}>Tujuan Misi: {c.nama}</h2>
          <ul className="list">
            {c.tujuan.map((t, i) => (
              <li key={i}>
                <Icon n="target" size={20} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card">
          <AquaTip mood="think">
            Pilih misi untuk melihat tujuan khusus misimu.{' '}
            <Btn sm kind="orange" onClick={() => go('misi')}>
              Pilih Misi
            </Btn>
          </AquaTip>
        </div>
      )}
    </div>
  );
}
