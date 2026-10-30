import React from 'react';
import { useApp } from '../../context/AppContext';
import { caseOf, demandOf, fmt } from '../../utils/math';
import { MissionWrapper } from './MissionWrapper';
import { CityArt } from '../canvas/CityArt';
import { MissionArt } from '../canvas/MissionArt';
import { Rules } from '../common/AllocTable';
import { Field } from '../common/UI';
import { Icon } from '../icons/Icon';

const txt = (s?: string, n = 10) => (s || '').trim().length >= n;

export function Stage1Explore() {
  const { proj, patch } = useApp();
  if (!proj) return null;

  const c = caseOf(proj);
  const e = proj.explore;
  const set = (k: keyof typeof e, v: string) =>
    patch((d) => {
      d.explore[k] = v;
    });

  const dem = demandOf(c);
  const sup = c.supply;
  const ans = sup === dem ? 'tepat' : sup < dem ? 'kurang' : 'lebih';
  const q2ok = e.q2 !== '' && +e.q2 === sup;
  const q4ok = e.q4 === ans;

  const OPT: [string, string][] = [
    ['tepat', 'Pas, tanpa sisa'],
    ['kurang', 'Kurang dari kebutuhan'],
    ['lebih', 'Cukup, bahkan ada sisa'],
  ];

  const fb = `${c.fac.map((f) => fmt(f.need)).join(' + ')} = ${fmt(dem)} L, sedangkan persediaan ${fmt(sup)} L.`;

  const reqs = [
    { ok: txt(e.q1), text: 'Jawab pertanyaan 1 (pertanyaan pemantik).' },
    { ok: q2ok, text: 'Isi jumlah air yang tersedia dengan benar.' },
    { ok: txt(e.q3), text: 'Jawab pertanyaan 3 tentang fasilitas.' },
    { ok: q4ok, text: 'Pilih jawaban yang benar tentang cukup atau tidaknya air.' },
    { ok: txt(e.q5), text: 'Jawab pertanyaan 5 tentang pembagian yang adil.' },
  ];

  return (
    <MissionWrapper
      n={1}
      title={'Explore — Kenali Masalah ' + c.nama}
      reqs={reqs}
      tip="Baca cerita dan data di bawah dengan teliti. Angka-angkanya adalah kunci untuk memecahkan masalah!"
    >
      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className="chip">Misi: {c.nama}</span>
          <span className={'chip lvl lvl-' + c.level}>{c.level}</span>
          <span className="chip">Fokus: {c.fokus}</span>
        </div>
        <h3>Cerita Misi</h3>
        <p className="big-t" style={{ marginTop: 8 }}>
          {c.cerita}
        </p>
      </div>

      <div className="split">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Peta {c.nama}</h3>
          {c.id === 'aquacity' ? (
            <CityArt />
          ) : (
            <div className="mart">
              <MissionArt id={c.id} />
            </div>
          )}
          <p className="hint" style={{ marginTop: 8 }}>
            {c.tank} mengalirkan air lewat pipa distribusi ke {c.fac.length} fasilitas.
          </p>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Panel Informasi</h3>
          <div className="table-wrap">
            <table style={{ minWidth: 0 }}>
              <tbody>
                <tr>
                  <td>
                    <b>Persediaan air</b>
                  </td>
                  <td className="num">
                    <b>{fmt(sup)} L</b>
                  </td>
                </tr>
                {c.fac.map((f) => (
                  <tr key={f.id}>
                    <td>
                      Kebutuhan {f.nama}
                      <div className="hint">{f.ket}</div>
                    </td>
                    <td className="num">{fmt(f.need)} L</td>
                  </tr>
                ))}
                <tr>
                  <td>
                    <b>Total kebutuhan</b>
                  </td>
                  <td className="num">
                    <b>{fmt(dem)} L</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <h4 style={{ margin: '12px 0 6px' }}>Sumber daya</h4>
          <p>1 tangki utama, pipa distribusi, dan alat hitung kalian.</p>
          <h4 style={{ margin: '12px 0 6px' }}>Aturan dan batasan</h4>
          <Rules c={c} />
          <p className="hint" style={{ marginTop: 10 }}>
            Catatan: semua angka adalah data fiktif untuk belajar, bukan standar resmi pemakaian air.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Tujuan dan Tantangan Misi</h3>
        <div className="main" style={{ gap: 12 }}>
          <div>
            <h4>Tujuan pembelajaran</h4>
            <ul className="list" style={{ marginTop: 6 }}>
              {c.tujuan.map((t, i) => (
                <li key={i}>
                  <Icon n="target" size={20} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Tantangan numerasi</h4>
            <p style={{ marginTop: 6 }}>{c.tantangan}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Pertanyaan Penyelidikan</h3>
        <Field id="q1" label={'1. ' + c.pemantik[0]}>
          <textarea
            id="q1"
            className="in"
            value={e.q1}
            onChange={(x) => set('q1', x.target.value)}
          />
        </Field>
        <Field
          id="q2"
          label="2. Berapa jumlah air yang tersedia (liter)?"
          hint={
            e.q2 !== ''
              ? q2ok
                ? 'Benar!'
                : 'Belum tepat. Lihat baris Persediaan air di panel informasi.'
              : 'Tulis angkanya saja.'
          }
        >
          <input
            id="q2"
            className="in"
            type="number"
            inputMode="numeric"
            value={e.q2}
            onChange={(x) => set('q2', x.target.value)}
          />
        </Field>
        <Field id="q3" label={'3. ' + c.pemantik[1]}>
          <textarea
            id="q3"
            className="in"
            value={e.q3}
            onChange={(x) => set('q3', x.target.value)}
          />
        </Field>
        <div className="field">
          <label>4. Apakah persediaan air cukup untuk semua kebutuhan?</label>
          <div className="seg" role="group" aria-label="Apakah air cukup">
            {OPT.map(([v, l]) => (
              <button
                key={v}
                aria-pressed={e.q4 === v}
                onClick={() => set('q4', v)}
              >
                {l}
              </button>
            ))}
          </div>
          {e.q4 && (
            <span className="hint">
              {q4ok
                ? 'Benar: ' + fb
                : 'Belum tepat. Jumlahkan semua kebutuhan lalu bandingkan dengan persediaan.'}
            </span>
          )}
        </div>
        <Field id="q5" label={'5. ' + c.pemantik[2]}>
          <textarea
            id="q5"
            className="in"
            value={e.q5}
            onChange={(x) => set('q5', x.target.value)}
          />
        </Field>
        <span className="hint">Jawaban kelompokmu tersimpan otomatis.</span>
      </div>
    </MissionWrapper>
  );
}
