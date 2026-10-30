import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { caseOf, scenOf, evaluate, nameOf, fmt, demandOf } from '../../utils/math';
import { DesignCanvas } from '../canvas/DesignCanvas';
import { Aqua } from '../common/Mascot';
import { Btn, Stat } from '../common/UI';
import { Icon } from '../icons/Icon';

interface SlidesProps {
  project: Project;
  onClose: () => void;
}

export function Slides({ project, onClose }: SlidesProps) {
  const p = project;
  const c = caseOf(p);
  const SC = scenOf(c);
  const [i, setI] = useState(0);

  const en = evaluate(p, 'normal', true);
  const lastRun = (sc: string) =>
    p.sim.history.filter((h) => h.scen === sc).slice(-1)[0];
  const rev = p.improve.revisions.slice(-1)[0];
  const r = p.present.reflection;

  const S: [string, React.ReactNode][] = [
    [
      'Aqua Engineer Math',
      <div>
        <h3 className="big-t">
          {p.title} · Misi {c.nama}
        </h3>
        <p>
          Kelompok {p.group.name} · Kelas {p.group.kelas}
        </p>
        <p>Anggota: {p.group.members || '-'}</p>
        <div style={{ marginTop: 14 }}>
          <Aqua size={120} />
        </div>
      </div>,
    ],
    [
      'Masalah di ' + c.nama,
      <div>
        <p>{p.explore.q1 || '-'}</p>
        <p style={{ marginTop: 10 }}>
          Persediaan <b>{fmt(c.supply)} L</b>, kebutuhan <b>{fmt(demandOf(c))} L</b>.
        </p>
      </div>,
    ],
    [
      'Perhitungan kami',
      <ul className="list">
        {en.rows.map((x) => (
          <li key={x.id}>
            {x.nama}: {fmt(x.need)} L butuh, {fmt(x.alloc)} L dialokasikan
          </li>
        ))}
        <li>
          <b>
            Total {fmt(en.total)} L dari {fmt(en.S.supply)} L, sisa {fmt(en.left)} L
          </b>
        </li>
      </ul>,
    ],
    ['Desain ' + c.nama, <DesignCanvas project={p} editable={false} scen="normal" flow={true} />],
    [
      'Strategi dan rute',
      <div>
        <p>{p.plan.notes || '-'}</p>
        <ul className="list" style={{ marginTop: 10 }}>
          {p.design.edges.map((k) => (
            <li key={k}>
              {k
                .split('|')
                .map((x) => nameOf(c, x))
                .join(' ↔ ')}
            </li>
          ))}
        </ul>
      </div>,
    ],
    [
      'Hasil simulasi',
      <ul className="list">
        {['normal', 'kurang'].map((k) => {
          const h = lastRun(k);
          return (
            <li key={k}>
              {SC[k].nama}:{' '}
              {h ? (
                <>
                  <Stat st={h.overall} /> total {fmt(h.total)} dari {fmt(h.supply)} L
                </>
              ) : (
                'belum dijalankan'
              )}
            </li>
          );
        })}
      </ul>,
    ],
    [
      'Artefak Aqua City Smart Board',
      <p>{p.create.checks.filter(Boolean).length} dari 6 langkah pembuatan selesai.</p>,
    ],
    [
      'Perbaikan yang dilakukan',
      <div>
        {rev ? (
          <div>
            <p>
              <b>Masalah:</b> {rev.fields.masalah}
            </p>
            <p>
              <b>Perubahan:</b> {rev.fields.perubahan}
            </p>
            <p>
              <b>Hasil:</b> {rev.fields.hasil}
            </p>
          </div>
        ) : (
          <p>Belum ada revisi.</p>
        )}
      </div>,
    ],
    [
      'Kesimpulan kami',
      <div>
        <p>
          <b>Yang kami pelajari:</b> {r.r1 || '-'}
        </p>
        <p>
          <b>Peran matematika:</b> {r.r2 || '-'}
        </p>
      </div>,
    ],
  ];

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((x) => Math.min(S.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [S.length, onClose]);

  return (
    <div className="present" role="dialog" aria-modal="true" aria-label="Mode presentasi">
      <div className="slide">
        <h2>{S[i][0]}</h2>
        {S[i][1]}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Btn icon="left" disabled={i === 0} onClick={() => setI(i - 1)}>
          Kembali
        </Btn>
        <b>
          {i + 1} / {S.length}
        </b>
        <div className="row">
          <Btn
            icon="full"
            sm
            onClick={() => {
              try {
                document.documentElement.requestFullscreen().catch(() => {});
              } catch {
                // ignore
              }
            }}
          >
            Layar penuh
          </Btn>
          <Btn icon="x" sm onClick={onClose}>
            Keluar
          </Btn>
        </div>
        <Btn kind="blue" disabled={i === S.length - 1} onClick={() => setI(i + 1)}>
          Lanjut
          <Icon n="right" size={20} />
        </Btn>
      </div>
    </div>
  );
}
