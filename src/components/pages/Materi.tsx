import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { caseOf, demandOf, scenesOf, fmt } from '../../utils/math';
import { CASES } from '../../data/cases';
import { STAGES } from '../../data/stages';
import { StageArt } from '../common/Mascot';
import { AquaTip, Btn, Field } from '../common/UI';
import { Icon } from '../icons/Icon';
import { Rules } from '../common/AllocTable';

export const MATERI: { k: 'video' | 'ringkasan' | 'lkpd'; t: string; i: string; c: string }[] = [
  { k: 'video', t: 'Video Pembelajaran', i: 'play', c: '#8DE2FF' },
  { k: 'ringkasan', t: 'Ringkasan Materi', i: 'book', c: '#FFD84D' },
  { k: 'lkpd', t: 'LKPD Digital', i: 'folder', c: '#8CE6B2' },
];

export function VideoMat() {
  const { proj } = useApp();
  const c = proj ? caseOf(proj) : CASES[0];
  const SCENES = scenesOf(c);

  const [i, setI] = useState(0);
  const [pl, setPl] = useState(false);

  useEffect(() => {
    if (!pl) return;
    const t = setInterval(
      () =>
        setI((x) => {
          if (x >= SCENES.length - 1) {
            setPl(false);
            return x;
          }
          return x + 1;
        }),
      4500
    );
    return () => clearInterval(t);
  }, [pl, SCENES.length]);

  const sc = SCENES[i];

  return (
    <div className="main">
      <p className="hint">
        Contoh misi: {c.nama}
        {proj ? '' : ' (pilih misi untuk melihat misimu)'}
      </p>
      <div className="card" style={{ background: STAGES[sc[2] - 1].c }}>
        <div className="row">
          <div className="art" style={{ width: 90, height: 90 }}>
            <StageArt k={sc[2]} />
          </div>
          <div className="grow">
            <span className="chip">
              Adegan {i + 1} dari {SCENES.length}
            </span>
            <h3 style={{ marginTop: 6 }}>{sc[0]}</h3>
          </div>
        </div>
      </div>
      <AquaTip>
        <span className="big-t">{sc[1]}</span>
      </AquaTip>
      <div className="row">
        <Btn
          sm
          icon="left"
          disabled={i === 0}
          onClick={() => {
            setPl(false);
            setI(i - 1);
          }}
        >
          Sebelumnya
        </Btn>
        <Btn
          kind="blue"
          icon={pl ? 'pause' : 'play'}
          onClick={() => {
            if (i >= SCENES.length - 1) setI(0);
            setPl(!pl);
          }}
        >
          {pl ? 'Jeda' : 'Putar'}
        </Btn>
        <Btn
          sm
          disabled={i === SCENES.length - 1}
          onClick={() => {
            setPl(false);
            setI(i + 1);
          }}
        >
          Berikutnya
          <Icon n="right" size={18} />
        </Btn>
      </div>
      <p className="hint">
        Ini animasi penjelasan singkat tanpa suara, dibuat khusus untuk aplikasi ini.
      </p>
    </div>
  );
}

export function RingkasanMat() {
  const { proj } = useApp();
  const c = proj ? caseOf(proj) : CASES[0];
  const f0 = c.fac[0];

  const O: [string, string, string, string][] = [
    [
      'Penjumlahan (+)',
      'Menggabungkan jumlah.',
      `${c.fac.map((f) => fmt(f.need)).join(' + ')} = ${fmt(demandOf(c))} L`,
      '#8DE2FF',
    ],
    [
      'Pengurangan (−)',
      'Mencari sisa atau selisih.',
      `${fmt(c.supply)} − ${fmt(f0.need)} = ${fmt(c.supply - f0.need)} L`,
      '#FFD84D',
    ],
    [
      'Perkalian (×)',
      'Penjumlahan berulang.',
      `${c.mul.a} × ${c.mul.b} = ${fmt(c.mul.a * c.mul.b)} L`,
      '#8CE6B2',
    ],
    [
      'Pembagian (÷)',
      'Membagi sama rata.',
      `${fmt(c.div.total)} ÷ ${c.div.parts} = ${fmt(c.div.total / c.div.parts)} L`,
      '#FF8BA7',
    ],
  ];

  return (
    <div className="main">
      <p className="hint">Contoh dari misi: {c.nama}</p>
      <div className="pcards">
        {O.map((o) => (
          <div key={o[0]} className="card" style={{ background: o[3] }}>
            <h3>{o[0]}</h3>
            <p>{o[1]}</p>
            <p style={{ marginTop: 8, fontWeight: 800 }}>{o[2]}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Cara berpikir insinyur</h3>
        <ol style={{ margin: 0, paddingLeft: 22 }}>
          {STAGES.map((s) => (
            <li key={s.n}>
              <b>{s.k}</b>: {s.t}
            </li>
          ))}
        </ol>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Aturan alokasi: {c.nama}</h3>
        <Rules c={c} />
      </div>
    </div>
  );
}

export function LKPDMat() {
  const { proj, patch, go } = useApp();

  if (!proj) {
    return (
      <AquaTip mood="think">
        LKPD disimpan di proyek kelompok. Pilih misi dan masuk dulu ya.{' '}
        <Btn sm kind="orange" onClick={() => go('misi')}>
          Pilih Misi
        </Btn>
      </AquaTip>
    );
  }

  const c = caseOf(proj);
  const l = proj.lkpd;
  const set = (k: string, v: string) =>
    patch((d) => {
      d.lkpd[k] = v;
    });
  const d = demandOf(c);
  const kurang = d - c.kurang;

  const LK: [string, string][] = [
    ['l1', `Tulis kalimat matematika untuk total kebutuhan air semua fasilitas di misi ${c.nama}.`],
    [
      'l2',
      `Persediaan air turun menjadi ${fmt(c.kurang)} liter, sedangkan kebutuhan ${fmt(d)} liter. Berapa liter air yang kurang?`,
    ],
    ['l3', 'Fasilitas mana yang paling penting dilindungi saat air kurang? Berikan alasanmu.'],
    ['l4', 'Ceritakan rencana pipa yang akan kamu buat.'],
  ];

  return (
    <div className="main">
      <p className="hint">
        Misi {c.nama}. Jawaban tersimpan otomatis pada proyek {proj.title}.
      </p>
      {LK.map(([k, q], i) => (
        <Field
          key={k}
          id={k}
          label={i + 1 + '. ' + q}
          hint={
            k === 'l2' && l.l2 !== undefined && l.l2 !== ''
              ? +l.l2 === kurang
                ? `Benar: ${fmt(d)} − ${fmt(c.kurang)} = ${fmt(kurang)} liter.`
                : `Belum tepat. Kurangkan ${fmt(c.kurang)} dari ${fmt(d)}.`
              : null
          }
        >
          {k === 'l2' ? (
            <input
              id={k}
              className="in"
              type="number"
              inputMode="numeric"
              value={l[k] || ''}
              onChange={(e) => set(k, e.target.value)}
            />
          ) : (
            <textarea
              id={k}
              className="in"
              value={l[k] || ''}
              onChange={(e) => set(k, e.target.value)}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

export function Materi() {
  const { openMat } = useApp();

  return (
    <div className="main">
      <h1>Materi Belajar</h1>
      <AquaTip>Pilih materi yang ingin kamu buka. Semuanya ada di dalam aplikasi.</AquaTip>
      <div className="three">
        {MATERI.map((m) => (
          <div key={m.k} className="card" style={{ background: m.c }}>
            <Icon n={m.i} size={40} />
            <h3 style={{ margin: '8px 0' }}>{m.t}</h3>
            <p style={{ marginBottom: 12 }}>
              {m.k === 'video'
                ? 'Animasi singkat lima adegan tentang masalah air di Aqua City.'
                : m.k === 'ringkasan'
                ? 'Empat operasi hitung dengan contoh dari Aqua City.'
                : 'Lembar kerja yang tersimpan di proyek kelompokmu.'}
            </p>
            <Btn onClick={() => openMat(m.k)}>Buka</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}
