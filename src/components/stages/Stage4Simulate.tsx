import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { caseOf, scenOf, evaluate, fmt } from '../../utils/math';
import { nowIso, tgl } from '../../utils/storage';
import { MissionWrapper } from './MissionWrapper';
import { DesignCanvas } from '../canvas/DesignCanvas';
import { AllocTable, SimResult, Rules } from '../common/AllocTable';
import { Btn, AquaTip, Stat } from '../common/UI';

export function Stage4Simulate() {
  const { proj, patch, toast } = useApp();
  const [sc, setSc] = useState<string>('normal');
  if (!proj) return null;

  const c = caseOf(proj);
  const SC = scenOf(c);
  const ev = evaluate(proj, sc, true);
  const h = proj.sim.history;

  const run = () => {
    patch((d) => {
      d.sim.history.push({
        at: nowIso(),
        scen: sc,
        supply: ev.S.supply,
        total: ev.total,
        left: ev.left,
        overall: ev.overall,
        text: ev.text,
      });
    });
    toast('Simulasi dijalankan dan hasilnya dicatat.');
  };

  const reqs = [
    {
      ok: h.some((x) => x.scen === 'normal' && x.overall === 'ok'),
      text: 'Jalankan simulasi Normal sampai hasilnya hijau.',
    },
    {
      ok: h.some((x) => x.scen === 'kurang' && x.overall !== 'bad'),
      text: 'Jalankan simulasi Air berkurang tanpa hasil merah.',
    },
  ];

  return (
    <MissionWrapper
      n={4}
      title={'Simulate — Uji Solusi ' + c.nama}
      reqs={reqs}
      tip="Pilih keadaan, ubah alokasi bila perlu, lalu tekan Jalankan simulasi. Hasilnya dihitung dari desain dan angka milikmu."
    >
      <div className="card">
        <div className="seg" role="group" aria-label="Pilih keadaan">
          {['normal', 'kurang'].map((k) => (
            <button
              key={k}
              aria-pressed={sc === k}
              onClick={() => setSc(k)}
            >
              {SC[k].nama} ({fmt(SC[k].supply)} L)
            </button>
          ))}
        </div>
        <p style={{ margin: '10px 0' }}>
          <b>{SC[sc].teks}</b>
        </p>
        <div className="split">
          <DesignCanvas project={proj} editable={false} scen={sc} flow={true} />
          <SimResult ev={ev} />
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <Btn kind="orange" icon="play" onClick={run}>
            Jalankan simulasi
          </Btn>
          {sc !== 'normal' && proj.alloc[sc] && (
            <Btn
              sm
              onClick={() =>
                patch((d) => {
                  delete d.alloc[sc];
                })
              }
            >
              Salin ulang dari rencana normal
            </Btn>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>
          Ubah Alokasi untuk Keadaan "{SC[sc].nama}"
        </h3>
        {sc !== 'normal' && !proj.alloc[sc] && (
          <p className="hint" style={{ marginBottom: 8 }}>
            Sekarang masih memakai angka dari rencana normal. Mengubah satu angka membuat rencana khusus untuk keadaan ini.
          </p>
        )}
        <AllocTable project={proj} onPatchProject={patch} scen={sc} useRoute={true} />
      </div>

      <div className="split">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Aturan Simulasi</h3>
          <Rules c={c} />
          <p className="hint" style={{ marginTop: 8 }}>
            Simulasi ini disederhanakan: air dianggap sampai penuh jika bangunan tersambung ke tangki lewat pipa, tanpa memperhitungkan tekanan atau panjang pipa.
          </p>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Riwayat Simulasi</h3>
          {h.length === 0 ? (
            <AquaTip mood="think">
              Belum ada simulasi. Tekan Jalankan simulasi.
            </AquaTip>
          ) : (
            <ul className="list">
              {h
                .slice(-6)
                .reverse()
                .map((x, i) => (
                  <li
                    key={i}
                    style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}
                  >
                    <span>
                      {SC[x.scen]?.nama || x.scen}: {fmt(x.total)} dari {fmt(x.supply)} L
                      <div className="hint">{tgl(x.at)}</div>
                    </span>
                    <Stat st={x.overall} />
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </MissionWrapper>
  );
}
