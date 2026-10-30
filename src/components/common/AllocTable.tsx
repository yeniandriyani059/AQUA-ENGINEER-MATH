import React from 'react';
import { Project, AllocRow } from '../../types';
import { caseOf, scenOf, evaluate, getAlloc, fmt, clamp, successLines } from '../../utils/math';
import { Btn, Stat } from './UI';
import { Icon } from '../icons/Icon';

const SIC: Record<string, string> = {
  ok: 'check',
  warn: 'alert',
  bad: 'x',
};

const LBL: Record<string, string> = {
  ok: 'Terpenuhi',
  warn: 'Perlu perhatian',
  bad: 'Melanggar',
  idle: 'Belum diisi',
};

export const rowLabel = (r: AllocRow, ev: { goalMin: boolean }) =>
  r.over ? 'Terlalu banyak' : r.status === 'warn' && ev.goalMin ? 'Di atas minimum' : LBL[r.status];

export function AllocTable({
  project,
  onPatchProject,
  scen = 'normal',
  useRoute = false,
}: {
  project: Project;
  onPatchProject?: (fn: (d: Project) => void) => void;
  scen?: string;
  useRoute?: boolean;
}) {
  const ev = evaluate(project, scen, useRoute);

  const set = (id: string, v: number | string) => {
    if (!onPatchProject) return;
    onPatchProject((d) => {
      const base = { ...getAlloc(d, scen) };
      base[id] = clamp(Math.round(+v || 0), 0, 5000);
      d.alloc[scen] = base;
    });
  };

  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fasilitas</th>
              <th className="num">Kebutuhan Air</th>
              <th className="num">Alokasi Air</th>
              <th className="num">Sisa Air</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ev.rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.nama}</b>
                  <div className="hint">minimum {fmt(r.min)} L</div>
                </td>
                <td className="num">{fmt(r.need)} L</td>
                <td className="num">
                  <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap', gap: 4 }}>
                    <Btn
                      sm
                      aria-label={'Kurangi 50 untuk ' + r.nama}
                      onClick={() => set(r.id, r.alloc - 50)}
                    >
                      −50
                    </Btn>
                    <input
                      className="num-in"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      aria-label={'Alokasi ' + r.nama}
                      value={r.alloc}
                      onChange={(e) => set(r.id, e.target.value)}
                    />
                    <Btn
                      sm
                      aria-label={'Tambah 50 untuk ' + r.nama}
                      onClick={() => set(r.id, r.alloc + 50)}
                    >
                      +50
                    </Btn>
                  </div>
                </td>
                <td className="num" style={{ color: r.remain < 0 ? 'var(--bad)' : 'inherit', fontWeight: 800 }}>
                  {fmt(r.remain)} L
                </td>
                <td>
                  {r.alloc === 0 && !r.conn && useRoute ? (
                    <Stat st="bad">Tidak terhubung</Stat>
                  ) : (
                    <Stat st={r.status}>{rowLabel(r, ev)}</Stat>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td className="num">{fmt(ev.demand)} L</td>
              <td className="num">{fmt(ev.total)} L</td>
              <td className="num">{fmt(ev.left)} L</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="kpi" style={{ marginTop: 12 }}>
        <div>
          <span className="hint">Persediaan</span>
          <b>{fmt(ev.S.supply)} L</b>
        </div>
        <div>
          <span className="hint">Total dialokasikan</span>
          <b>{fmt(ev.total)} L</b>
        </div>
        <div>
          <span className="hint">Air tersisa</span>
          <b style={{ color: ev.left < 0 ? 'var(--bad)' : 'inherit' }}>{fmt(ev.left)} L</b>
        </div>
        <div>
          <span className="hint">Persediaan − kebutuhan</span>
          <b>{fmt(ev.diff)} L</b>
        </div>
      </div>
      <div className={'banner ' + ev.overall} style={{ marginTop: 12 }} role="status">
        <Icon n={SIC[ev.overall]} size={26} sw={3} />
        <span>{ev.text}</span>
      </div>
    </div>
  );
}

export function SimResult({ ev }: { ev: ReturnType<typeof evaluate> }) {
  return (
    <div className="main" style={{ gap: 10 }}>
      <div className={'banner ' + ev.overall} role="status">
        <Icon n={SIC[ev.overall]} size={28} sw={3} />
        <span>
          {ev.overall === 'ok' ? 'Hijau: ' : ev.overall === 'warn' ? 'Kuning: ' : 'Merah: '}
          {ev.text}
        </span>
      </div>
      <ul className="list">
        {ev.rows.map((r) => (
          <li key={r.id} style={{ justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
            <span>
              {r.nama}: <b>{fmt(r.got)}</b> dari {fmt(r.need)} L {!r.conn ? '(tidak sampai)' : ''}
            </span>
            <Stat st={r.status}>{rowLabel(r, ev)}</Stat>
          </li>
        ))}
      </ul>
      <div className="hint">
        Air tersisa: {fmt(ev.left)} L dari {fmt(ev.S.supply)} L.
      </div>
    </div>
  );
}

export function Rules({ c }: { c: ReturnType<typeof caseOf> }) {
  const L: string[] = successLines(c);
  return (
    <ul className="list">
      {L.map((t, i) => (
        <li key={i}>
          <Icon n="check" size={20} />
          <span>{t}</span>
        </li>
      ))}
      <li>
        <Icon n="check" size={20} />
        <span>
          <b>Hijau</b>: sesuai aturan. <b>Kuning</b>: di atas minimum tetapi belum penuh. <b>Merah</b>: di bawah minimum, terlalu banyak, atau tidak tersambung.
        </span>
      </li>
    </ul>
  );
}

export function SuccessChecks({ ev }: { ev: ReturnType<typeof evaluate> }) {
  return (
    <ul className="list req" aria-label="Pemeriksaan matematis">
      {ev.checks.map((k, i) => (
        <li key={i} className={k.ok ? 'yes' : 'no'}>
          <Icon n={k.ok ? 'check' : 'x'} size={20} sw={3} />
          <span>{k.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function CaseBrief({ c }: { c: ReturnType<typeof caseOf> }) {
  return (
    <div className="main" style={{ gap: 14 }}>
      <div>
        <h4 style={{ marginBottom: 6 }}>Pertanyaan pemantik</h4>
        <ul className="list">
          {c.pemantik.map((q, i) => (
            <li key={i}>
              <Icon n="star" size={20} />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 style={{ marginBottom: 6 }}>Tujuan pembelajaran misi</h4>
        <ul className="list">
          {c.tujuan.map((q, i) => (
            <li key={i}>
              <Icon n="target" size={20} />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 style={{ marginBottom: 6 }}>Tantangan numerasi</h4>
        <p>{c.tantangan}</p>
      </div>
      <div>
        <h4 style={{ marginBottom: 6 }}>Kondisi keberhasilan (diperiksa dengan hitungan)</h4>
        <Rules c={c} />
      </div>
    </div>
  );
}
