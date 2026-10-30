import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { nowIso, tgl } from '../../utils/storage';
import { MissionWrapper } from './MissionWrapper';
import { Slides } from './Slides';
import { Field, Btn } from '../common/UI';

const txt = (s?: string, n = 15) => (s || '').trim().length >= n;

export function Stage7Present() {
  const { proj, patch, toast } = useApp();
  const [show, setShow] = useState(false);
  if (!proj) return null;

  const r = proj.present.reflection;
  const Q: [keyof typeof r, string][] = [
    ['r1', 'Apa yang kalian pelajari?'],
    ['r2', 'Bagaimana matematika membantu menyelesaikan masalah distribusi air?'],
    ['r3', 'Bagian mana dari desain kalian yang paling berhasil?'],
    [
      'r4',
      'Jika memiliki kesempatan memperbaiki proyek, apa yang akan kalian ubah?',
    ],
  ];

  const reqs = [
    {
      ok: Q.every(([k]) => txt(r[k], 15)),
      text: 'Jawab keempat pertanyaan refleksi (min. 15 huruf).',
    },
    { ok: !!proj.present.savedAt, text: 'Simpan data presentasi.' },
  ];

  return (
    <MissionWrapper
      n={7}
      title="Present — Tampilkan Hasil Karya"
      reqs={reqs}
      tip="Saatnya bercerita! Mode presentasi memakai data asli proyek kalian dan cocok untuk layar interaktif."
    >
      <div className="card">
        <h3>{proj.title}</h3>
        <p>
          Kelompok {proj.group.name} · Kelas {proj.group.kelas}
        </p>
        <p>Anggota: {proj.group.members || '-'}</p>
        <div className="row" style={{ marginTop: 12 }}>
          <Btn kind="orange" icon="play" onClick={() => setShow(true)}>
            Mulai presentasi
          </Btn>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Refleksi</h3>
        {Q.map(([k, q]) => (
          <Field key={k} id={'r-' + k} label={q}>
            <textarea
              id={'r-' + k}
              className="in"
              value={r[k]}
              onChange={(e) =>
                patch((d) => {
                  d.present.reflection[k] = e.target.value;
                })
              }
            />
          </Field>
        ))}
        <div className="row" style={{ marginTop: 12 }}>
          <Btn
            kind="mint"
            icon="save"
            onClick={() => {
              patch((d) => {
                d.present.savedAt = nowIso();
              });
              toast('Refleksi & data presentasi berhasil disimpan.');
            }}
          >
            Simpan presentasi
          </Btn>
          {proj.present.savedAt && (
            <span className="hint">Disimpan {tgl(proj.present.savedAt)}</span>
          )}
        </div>
      </div>

      {show && <Slides project={proj} onClose={() => setShow(false)} />}
    </MissionWrapper>
  );
}
