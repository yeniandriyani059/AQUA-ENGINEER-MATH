import React from 'react';
import { useApp } from '../../context/AppContext';
import { doneCount, pct } from '../../utils/storage';
import { STAGES } from '../../data/stages';
import { AquaTip } from '../common/UI';
import { Icon } from '../icons/Icon';

export function PapanPrestasi() {
  const { data } = useApp();
  const rank = data.projects
    .slice()
    .sort((a, b) => doneCount(b) - doneCount(a) || (a.group.name > b.group.name ? 1 : -1));

  return (
    <div className="main">
      <h1>Papan Prestasi</h1>
      <p className="hint">
        Peringkat pencapaian bintang dari proyek kelompok siswa yang telah dikerjakan.
      </p>

      {rank.length === 0 ? (
        <div className="card">
          <AquaTip mood="think">
            Belum ada proyek kelompok yang dimulai. Pilih misi dan mulai petualangan supaya kelompokmu mendapat bintang prestasi!
          </AquaTip>
        </div>
      ) : (
        <div className="card">
          <ol className="list" style={{ paddingLeft: 0 }}>
            {rank.map((p, i) => (
              <li
                key={p.id}
                style={{
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span
                    className="chip"
                    style={{ background: i === 0 ? '#FFD84D' : '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <b>{p.group.name}</b> Kelas {p.group.kelas} · {p.caseName}
                </span>
                <span
                  style={{ display: 'flex', gap: 2 }}
                  aria-label={doneCount(p) + ' dari 7 bintang'}
                >
                  {STAGES.map((s) => (
                    <span
                      key={s.n}
                      style={{ color: p.stageDone[s.n] ? '#E0A400' : '#C9D6E4' }}
                    >
                      <Icon n="star" size={20} sw={p.stageDone[s.n] ? 2 : 2.4} />
                    </span>
                  ))}
                  <b style={{ marginLeft: 8 }}>{pct(p)}%</b>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
