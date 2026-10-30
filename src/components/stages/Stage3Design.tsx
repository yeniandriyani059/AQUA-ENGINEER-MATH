import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { caseOf, evaluate, reachable, nameOf, glyphOf, fmt } from '../../utils/math';
import { nowIso, tgl, defPos } from '../../utils/storage';
import { MissionWrapper } from './MissionWrapper';
import { DesignCanvas } from '../canvas/DesignCanvas';
import { Glyph } from '../canvas/Glyph';
import { AllocTable } from '../common/AllocTable';
import { AquaTip, Btn } from '../common/UI';

export function Stage3Design() {
  const { proj, patch, toast } = useApp();
  const [rs, setRs] = useState(false);
  if (!proj) return null;

  const c = caseOf(proj);
  const d = proj.design;
  const ev = evaluate(proj, 'normal', true);
  const IDS = ['tank', ...c.fac.map((f) => f.id)];
  const reach = reachable(d, []);

  const toggle = (id: string) => {
    patch((x) => {
      if (x.design.placed[id]) {
        delete x.design.placed[id];
        x.design.edges = x.design.edges.filter((k) => !k.split('|').includes(id));
      } else {
        x.design.placed[id] = true;
      }
    });
  };

  const nPlaced = IDS.filter((i) => d.placed[i]).length;
  const nConn = c.fac.filter((f) => reach.has(f.id)).length;

  const reqs = [
    { ok: nPlaced === IDS.length, text: 'Tempatkan tangki dan semua fasilitas di peta.' },
    { ok: nConn === c.fac.length, text: 'Hubungkan semua fasilitas ke tangki lewat pipa.' },
    { ok: ev.overall === 'ok', text: 'Alokasi air memenuhi semua aturan.' },
    { ok: !!d.savedAt, text: 'Simpan desain.' },
  ];

  return (
    <MissionWrapper
      n={3}
      title={'Design — Rancang ' + c.nama}
      reqs={reqs}
      tip="Tempatkan bangunan, seret ke posisi yang kamu suka, lalu hubungkan dengan pipa. Air hanya sampai ke bangunan yang tersambung ke tangki."
    >
      <div className="split">
        <div className="card">
          <DesignCanvas project={proj} onPatchProject={patch} scen="normal" />
        </div>

        <div className="main" style={{ gap: 14 }}>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Komponen</h3>
            <ul className="list">
              {IDS.map((id) => (
                <li
                  key={id}
                  style={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="38" height="38" viewBox="-44 -50 88 90" aria-hidden="true">
                      <Glyph id={glyphOf(c, id)} />
                    </svg>
                    {nameOf(c, id)}
                  </span>
                  <Btn
                    sm
                    kind={d.placed[id] ? '' : 'mint'}
                    onClick={() => toggle(id)}
                  >
                    {d.placed[id] ? 'Angkat' : 'Tempatkan'}
                  </Btn>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Pipa ({d.edges.length})</h3>
            {d.edges.length === 0 ? (
              <AquaTip mood="think">
                Belum ada pipa. Pilih mode Hubungkan pipa lalu ketuk dua bangunan.
              </AquaTip>
            ) : (
              <ul className="list">
                {d.edges.map((k) => {
                  const [a, b] = k.split('|');
                  return (
                    <li
                      key={k}
                      style={{ justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <span>
                        {nameOf(c, a)} ↔ {nameOf(c, b)}
                      </span>
                      <Btn
                        sm
                        aria-label={'Hapus pipa ' + nameOf(c, a) + ' ke ' + nameOf(c, b)}
                        icon="trash"
                        onClick={() =>
                          patch((x) => {
                            x.design.edges = x.design.edges.filter((e) => e !== k);
                          })
                        }
                      >
                        Hapus
                      </Btn>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Ringkasan Proyek</h3>
            <div className="kpi">
              <div>
                <span className="hint">Bangunan</span>
                <b>
                  {nPlaced}/{IDS.length}
                </b>
              </div>
              <div>
                <span className="hint">Terhubung</span>
                <b>
                  {nConn}/{c.fac.length}
                </b>
              </div>
              <div>
                <span className="hint">Alokasi</span>
                <b>{fmt(ev.total)} L</b>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <Btn
                kind="mint"
                icon="save"
                onClick={() => {
                  patch((x) => {
                    x.design.savedAt = nowIso();
                  });
                  toast('Desain jaringan pipa berhasil disimpan.');
                }}
              >
                Simpan
              </Btn>
              {rs ? (
                <>
                  <Btn
                    kind="coral"
                    icon="rotate"
                    onClick={() => {
                      patch((x) => {
                        x.design = {
                          pos: defPos(caseOf(x)),
                          placed: { tank: true },
                          edges: [],
                          savedAt: null,
                        };
                      });
                      setRs(false);
                      toast('Desain dikembalikan ke awal.');
                    }}
                  >
                    Ya, reset
                  </Btn>
                  <Btn sm onClick={() => setRs(false)}>
                    Batal
                  </Btn>
                </>
              ) : (
                <Btn icon="rotate" onClick={() => setRs(true)}>
                  Reset
                </Btn>
              )}
            </div>
            {d.savedAt && (
              <p className="hint" style={{ marginTop: 8 }}>
                Disimpan {tgl(d.savedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Alokasi Air untuk Desainmu</h3>
        <AllocTable project={proj} onPatchProject={patch} scen="normal" useRoute={true} />
      </div>
    </MissionWrapper>
  );
}
