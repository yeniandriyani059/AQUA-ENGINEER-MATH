import React from 'react';
import { useApp } from '../../context/AppContext';
import { caseOf, scenOf, evaluate, getAlloc } from '../../utils/math';
import { nowIso, tgl, uid } from '../../utils/storage';
import { MissionWrapper } from './MissionWrapper';
import { DesignCanvas } from '../canvas/DesignCanvas';
import { AllocTable, SimResult } from '../common/AllocTable';
import { Field, Btn, AquaTip, Stat } from '../common/UI';
import { Icon } from '../icons/Icon';

const txt = (s?: string, n = 10) => (s || '').trim().length >= n;

export function Stage6Improve() {
  const { proj, patch, toast } = useApp();
  if (!proj) return null;

  const c = caseOf(proj);
  const f = proj.improve.fields;
  const ev = evaluate(proj, 'gangguan', true);
  const rev = proj.improve.revisions;

  const setF = (k: keyof typeof f, v: string) =>
    patch((d) => {
      d.improve.fields[k] = v;
    });

  const full = Object.values(f).every((v) => txt(v, 5));

  const save = () => {
    patch((d) => {
      d.improve.revisions.push({
        id: uid(),
        at: nowIso(),
        fields: { ...d.improve.fields },
        edges: [...d.design.edges],
        alloc: { ...getAlloc(d, 'gangguan') },
        overall: evaluate(d, 'gangguan', true).overall,
      });
    });
    toast('Revisi disimpan.');
  };

  const reqs = [
    { ok: txt(f.masalah, 5), text: 'Tulis masalah yang ditemukan.' },
    {
      ok: ev.overall !== 'bad',
      text: 'Perbaiki desain atau alokasi sampai hasil gangguan tidak merah.',
    },
    {
      ok: rev.length > 0,
      text: 'Simpan minimal satu revisi dengan kelima kolom terisi.',
    },
  ];

  const L: [keyof typeof f, string][] = [
    ['masalah', 'Masalah yang ditemukan'],
    ['awal', 'Solusi awal'],
    ['perubahan', 'Perubahan yang dilakukan'],
    ['hasil', 'Hasil pengujian'],
    ['kesimpulan', 'Kesimpulan'],
  ];

  return (
    <MissionWrapper
      n={6}
      title="Test & Improve — Uji dan Perbaiki"
      reqs={reqs}
      tip="Ada gangguan baru! Uji artefak kalian, cari tahu apa yang salah, lalu perbaiki desain digital dan artefak fisiknya."
    >
      <div className="banner bad">
        <Icon n="alert" size={26} sw={3} />
        <span>{scenOf(c).gangguan.teks}</span>
      </div>

      <div className="card">
        <p className="hint" style={{ marginBottom: 8 }}>
          Tanda silang merah adalah pipa yang rusak. Tambahkan jalur lain agar air tetap sampai. Perubahan di sini memperbarui desain digital kalian.
        </p>
        <DesignCanvas project={proj} onPatchProject={patch} scen="gangguan" flow={true} />
        <div style={{ marginTop: 12 }}>
          <SimResult ev={ev} />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Hitung Ulang Alokasi (keadaan gangguan)</h3>
        <AllocTable project={proj} onPatchProject={patch} scen="gangguan" useRoute={true} />
        {proj.alloc.gangguan && (
          <div style={{ marginTop: 8 }}>
            <Btn
              sm
              onClick={() =>
                patch((d) => {
                  delete d.alloc.gangguan;
                })
              }
            >
              Salin ulang dari rencana normal
            </Btn>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Catatan Perbaikan</h3>
        {L.map(([k, l]) => (
          <Field key={k} id={'f-' + k} label={l}>
            <textarea
              id={'f-' + k}
              className="in"
              style={{ minHeight: 70 }}
              value={f[k]}
              onChange={(e) => setF(k, e.target.value)}
            />
          </Field>
        ))}
        <div className="row" style={{ marginTop: 12 }}>
          <Btn kind="mint" icon="save" disabled={!full} onClick={save}>
            Simpan revisi
          </Btn>
          {!full && (
            <span className="hint">Isi kelima kolom (min. 5 huruf).</span>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Riwayat Revisi ({rev.length})</h3>
        {rev.length === 0 ? (
          <AquaTip mood="think">Belum ada revisi tersimpan.</AquaTip>
        ) : (
          <ul className="list">
            {rev
              .slice()
              .reverse()
              .map((r, i) => (
                <li key={r.id} style={{ flexDirection: 'column', gap: 2 }}>
                  <span>
                    <b>Revisi {rev.length - i}</b> · {tgl(r.at)}{' '}
                    {r.overall && <Stat st={r.overall} />}
                  </span>
                  <span>{r.fields.perubahan}</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </MissionWrapper>
  );
}
