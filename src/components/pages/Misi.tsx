import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CASES, caseById } from '../../data/cases';
import { CaseMission } from '../../types';
import { groupProjects, pct } from '../../utils/storage';
import { demandOf, pc, fmt } from '../../utils/math';
import { MissionArt } from '../canvas/MissionArt';
import { CaseBrief } from '../common/AllocTable';
import { AquaTip, Btn } from '../common/UI';
import { Icon } from '../icons/Icon';

const LVN: Record<string, number> = { Mudah: 1, Sedang: 2, Menantang: 3 };
const stars = (l: 'Mudah' | 'Sedang' | 'Menantang') =>
  '★'.repeat(LVN[l]) + '☆'.repeat(3 - LVN[l]);

function MisiCard({ c, onPick }: { c: CaseMission; onPick: (id: string) => void }) {
  const { data, session } = useApp();
  const mine = groupProjects(data, session, c.id).sort((a, b) => (b.updated > a.updated ? 1 : -1));
  const best = mine[0];

  return (
    <article className="card mcard">
      <div className="mart">
        <MissionArt id={c.id} />
      </div>
      <h3>{c.nama}</h3>
      <p>{c.desc}</p>
      <div className="row">
        <span className={'chip lvl lvl-' + c.level}>
          {c.level} {stars(c.level)}
        </span>
      </div>
      <p className="hint">
        <b>Fokus matematika:</b> {c.fokus}
      </p>
      {best && (
        <span className="status">
          <Icon n="star" size={14} sw={3} />
          Proyek kelompokmu: {pct(best)}%
        </span>
      )}
      <Btn kind="orange" onClick={() => onPick(c.id)}>
        Pilih Misi
      </Btn>
    </article>
  );
}

function MisiDetail({ c, onBack }: { c: CaseMission; onBack: () => void }) {
  const { data, session, startMission } = useApp();
  const mine = groupProjects(data, session, c.id).sort((a, b) => (b.updated > a.updated ? 1 : -1));
  const ex = mine[0];
  const d = demandOf(c);

  return (
    <div className="main">
      <div>
        <Btn sm icon="left" onClick={onBack}>
          Kembali ke Pilih Misi
        </Btn>
      </div>
      <div className="card">
        <div className="split">
          <div className="mart">
            <MissionArt id={c.id} />
          </div>
          <div className="main" style={{ gap: 10 }}>
            <div className="row">
              <span className={'chip lvl lvl-' + c.level}>
                {c.level} {stars(c.level)}
              </span>
              <span className="chip">Fokus: {c.fokus}</span>
            </div>
            <h1>{c.nama}</h1>
            <p className="big-t">{c.cerita}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Data dan Persediaan</h3>
        <div className="kpi" style={{ marginBottom: 12 }}>
          <div>
            <span className="hint">Persediaan air</span>
            <b>{fmt(c.supply)} L</b>
          </div>
          <div>
            <span className="hint">Total kebutuhan</span>
            <b>{fmt(d)} L</b>
          </div>
          <div>
            <span className="hint">
              {d > c.supply ? 'Kekurangan' : 'Sisa jika semua terpenuhi'}
            </span>
            <b>{fmt(Math.abs(c.supply - d))} L</b>
          </div>
        </div>
        <div className="table-wrap">
          <table style={{ minWidth: 480 }}>
            <thead>
              <tr>
                <th>Fasilitas</th>
                <th className="num">Kebutuhan</th>
                <th className="num">Batas minimum</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {c.fac.map((f) => (
                <tr key={f.id}>
                  <td>
                    <b>{f.nama}</b>
                  </td>
                  <td className="num">{fmt(f.need)} L</td>
                  <td className="num">
                    {f.min}% = {fmt(pc(f.need, f.min))} L
                  </td>
                  <td>{f.ket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          Semua angka adalah data fiktif untuk belajar, bukan standar resmi pemakaian air.
        </p>
      </div>

      <div className="card">
        <CaseBrief c={c} />
      </div>

      <div className="card soft">
        <div className="row">
          {ex ? (
            <>
              <Btn kind="orange" onClick={() => startMission(c.id)}>
                Lanjutkan Misi ({pct(ex)}%)
              </Btn>
              <Btn onClick={() => startMission(c.id, null, true)}>
                Mulai proyek baru untuk misi ini
              </Btn>
            </>
          ) : (
            <Btn kind="orange" onClick={() => startMission(c.id)}>
              Mulai Misi
            </Btn>
          )}
        </div>
        <p className="hint" style={{ marginTop: 8 }}>
          {session
            ? `Kelompok ${session.name}. Proyek lain milik kelompokmu tidak akan terhapus atau tertimpa.`
            : 'Kamu akan diminta masuk dengan kode kelompok. Setelah itu kamu langsung menuju tahap Explore.'}
        </p>
      </div>
    </div>
  );
}

export function Misi() {
  const [sel, setSel] = useState<string | null>(null);
  const { session } = useApp();

  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch {
      // ignore
    }
  }, [sel]);

  if (sel) {
    return <MisiDetail c={caseById(sel)} onBack={() => setSel(null)} />;
  }

  return (
    <div className="main">
      <h1>Pilih Misi Aqua City</h1>
      <AquaTip>
        Ada tujuh misi air. Kamu boleh memilih sendiri, dan boleh kembali ke sini kapan saja untuk melihat misi lain. Semua misi memakai tujuh tahap yang sama, tetapi datanya berbeda.
      </AquaTip>
      {session && (
        <div className="chip">
          <Icon n="users" size={16} />
          Kelompok {session.name} · Kelas {session.kelas}
        </div>
      )}
      <div className="mgrid">
        {CASES.map((c) => (
          <MisiCard key={c.id} c={c} onPick={setSel} />
        ))}
      </div>
    </div>
  );
}
