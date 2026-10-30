import React from 'react';
import { useApp } from '../../context/AppContext';
import { caseOf, evaluate, practiceOf } from '../../utils/math';
import { nowIso, tgl } from '../../utils/storage';
import { MissionWrapper } from './MissionWrapper';
import { AllocTable, SuccessChecks } from '../common/AllocTable';
import { Calc, Field, Btn, Stat } from '../common/UI';

const txt = (s?: string, n = 10) => (s || '').trim().length >= n;

export function Stage2Plan() {
  const { proj, patch, toast } = useApp();
  if (!proj) return null;

  const c = caseOf(proj);
  const PR = practiceOf(c);
  const pl = proj.plan;
  const ev = evaluate(proj, 'normal', false);

  const setP = (k: string, patchObj: { v?: string; c?: boolean }) =>
    patch((d) => {
      d.plan.practice[k] = {
        ...(d.plan.practice[k] || { v: '', c: false }),
        ...patchObj,
      };
    });

  const pOk = (k: string) => {
    const x = pl.practice[k];
    const item = PR.find((p) => p.k === k);
    return x && x.c && item && +x.v === item.a;
  };

  const reqs = [
    { ok: PR.every((p) => pOk(p.k)), text: 'Jawab keempat latihan hitung dengan benar.' },
    { ok: ev.overall === 'ok', text: 'Alokasi memenuhi semua syarat keberhasilan (hijau).' },
    { ok: txt(pl.notes), text: 'Tulis strategi pembagian air.' },
    { ok: !!pl.savedAt, text: 'Simpan rencana.' },
  ];

  return (
    <MissionWrapper
      n={2}
      title="Plan — Hitung dan Rancang Strategi"
      reqs={reqs}
      tip="Gunakan penjumlahan, pengurangan, perkalian, dan pembagian untuk membagi air. Perhatikan kolom Status, ia menghitung ulang setiap kali kamu mengubah angka."
    >
      <div className="split">
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Latihan Empat Operasi Hitung</h3>
          <div className="main" style={{ gap: 12 }}>
            {PR.map((p) => {
              const x = pl.practice[p.k] || { v: '', c: false };
              return (
                <div key={p.k} className="card soft" style={{ padding: 12 }}>
                  <span className="chip">{p.op}</span>
                  <p style={{ margin: '8px 0' }}>{p.q}</p>
                  <div className="row">
                    <input
                      className="num-in"
                      style={{ width: 120 }}
                      type="number"
                      inputMode="numeric"
                      aria-label={'Jawaban ' + p.op}
                      value={x.v}
                      onChange={(e) => setP(p.k, { v: e.target.value, c: false })}
                    />
                    <Btn
                      sm
                      kind="yellow"
                      disabled={x.v === ''}
                      onClick={() => setP(p.k, { c: true })}
                    >
                      Periksa
                    </Btn>
                    {x.c && (
                      <Stat st={+x.v === p.a ? 'ok' : 'bad'}>
                        {+x.v === p.a ? 'Benar' : 'Coba hitung lagi'}
                      </Stat>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Kalkulator</h3>
          <Calc />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Tabel Alokasi Air: {c.nama}</h3>
        <p className="hint" style={{ marginBottom: 10 }}>
          Ubah angka alokasi. Sisa Air menunjukkan persediaan yang masih ada setelah fasilitas pada baris itu dibagi.
        </p>
        <AllocTable project={proj} onPatchProject={patch} scen="normal" />
        <h4 style={{ margin: '14px 0 6px' }}>Pemeriksaan matematis</h4>
        <SuccessChecks ev={ev} />
      </div>

      <div className="card">
        <Field
          id="notes"
          label="Strategi pembagian air kami"
          hint="Jelaskan alasanmu dalam satu atau dua kalimat."
        >
          <textarea
            id="notes"
            className="in"
            value={pl.notes}
            onChange={(e) =>
              patch((d) => {
                d.plan.notes = e.target.value;
              })
            }
          />
        </Field>
        <div className="row">
          <Btn
            kind="mint"
            icon="save"
            onClick={() => {
              patch((d) => {
                d.plan.savedAt = nowIso();
              });
              toast('Rencana strategi berhasil disimpan.');
            }}
          >
            Simpan rencana
          </Btn>
          {pl.savedAt && (
            <span className="hint" style={{ marginLeft: 10 }}>
              Terakhir disimpan {tgl(pl.savedAt)}
            </span>
          )}
        </div>
      </div>
    </MissionWrapper>
  );
}
