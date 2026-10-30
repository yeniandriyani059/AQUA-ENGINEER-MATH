import React from 'react';
import { useApp } from '../../context/AppContext';
import { caseOf, getAlloc, fmt } from '../../utils/math';
import { MissionWrapper } from './MissionWrapper';
import { DesignCanvas } from '../canvas/DesignCanvas';
import { Icon } from '../icons/Icon';

const MATS = [
  'Kardus bekas',
  'Kertas putih',
  'Kertas warna',
  'Sedotan',
  'Lem',
  'Gunting',
  'Token distribusi air (tutup botol atau kancing)',
  'Bahan daur ulang lain',
];

const CSTEPS = [
  [
    'Menyiapkan bahan',
    'Kumpulkan semua bahan di meja. Minta bantuan guru saat memakai gunting.',
  ],
  [
    'Membuat dasar kota',
    'Potong kardus menjadi papan dasar. Tempel kertas biru dan hijau sebagai sungai dan tanah.',
  ],
  [
    'Menempatkan fasilitas',
    'Buat bangunan dari kertas warna. Letakkan sesuai posisi di desain digital.',
  ],
  [
    'Membuat jalur distribusi',
    'Potong sedotan menjadi pipa. Tempelkan persis seperti sambungan di desain digital.',
  ],
  [
    'Menambahkan penanda alokasi air',
    'Letakkan token pada tiap fasilitas sesuai tabel alokasi (1 token = 50 liter atau sesuai misimu).',
  ],
  [
    'Membandingkan artefak dengan desain digital',
    'Cocokkan posisi, pipa, dan jumlah token dengan layar. Catat bila ada yang berbeda.',
  ],
];

export function Stage5Create() {
  const { proj, patch } = useApp();
  if (!proj) return null;

  const c = caseOf(proj);
  const ck = proj.create.checks;
  const al = getAlloc(proj, 'normal');

  const reqs = [
    {
      ok: ck.length === 6 && ck.every(Boolean),
      text: 'Tandai keenam langkah pembuatan sebagai selesai.',
    },
  ];

  return (
    <MissionWrapper
      n={5}
      title="Create — Wujudkan Desain Menjadi Artefak"
      reqs={reqs}
      tip="Aplikasi ini adalah ruang berpikir dan merancang. Kalian sendiri yang membuat Aqua City Smart Board dengan tangan, mengikuti desain di layar."
    >
      <div className="card">
        <h3>Aqua City Smart Board</h3>
        <p style={{ margin: '6px 0 10px' }}>
          Papan kota dari bahan sederhana. Bahan yang disarankan:
        </p>
        <div className="row">
          {MATS.map((m) => (
            <span key={m} className="chip" style={{ background: '#FFF1BF' }}>
              {m}
            </span>
          ))}
        </div>
      </div>

      <div className="split">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Cetak Biru Digital Kalian</h3>
          <DesignCanvas project={proj} editable={false} scen="normal" />
          {!proj.design.savedAt && (
            <p className="hint" style={{ marginTop: 8 }}>
              Desain belum disimpan di tahap Design. Kembali dan simpan agar cetak biru lengkap.
            </p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Penanda Alokasi (token)</h3>
          <ul className="list">
            {c.fac.map((f) => (
              <li key={f.id} style={{ justifyContent: 'space-between' }}>
                <span>{f.nama}</span>
                <b>
                  {fmt(al[f.id] || 0)} L ={' '}
                  {Math.round(((al[f.id] || 0) / c.token) * 10) / 10} token
                </b>
              </li>
            ))}
          </ul>
          <p className="hint" style={{ marginTop: 8 }}>
            1 token = {c.token} liter. Pembagian ini adalah hitungan nyata dari alokasi kalian.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Daftar Langkah</h3>
        <div className="main" style={{ gap: 10 }}>
          {CSTEPS.map((s, i) => (
            <div key={i}>
              <button
                className="check"
                role="checkbox"
                aria-checked={ck[i]}
                onClick={() =>
                  patch((d) => {
                    d.create.checks[i] = !d.create.checks[i];
                  })
                }
              >
                <span className="box">
                  {ck[i] && <Icon n="check" size={20} sw={4} />}
                </span>
                <span>
                  {i + 1}. {s[0]}
                </span>
              </button>
              <p className="hint" style={{ margin: '4px 0 0 8px' }}>
                {s[1]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </MissionWrapper>
  );
}
