import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { pct, curStage, tgl, sameGroup } from '../../utils/storage';
import { STAGES } from '../../data/stages';
import { evaluate, fmt } from '../../utils/math';
import { Project } from '../../types';
import { DesignCanvas } from '../canvas/DesignCanvas';
import { AquaTip, Btn, Stat } from '../common/UI';
import { Icon } from '../icons/Icon';

export function ProjDetail({ p }: { p: Project }) {
  const ev = evaluate(p, 'normal', true);

  return (
    <div className="main">
      <div className="row">
        <span className="chip" style={{ background: '#E8FAFF' }}>
          Misi: {p.caseName}
        </span>
        {STAGES.map((s) => (
          <span
            key={s.n}
            className="chip"
            style={{ background: p.stageDone[s.n] ? '#D8F7E7' : '#fff' }}
          >
            {p.stageDone[s.n] && <Icon n="check" size={14} sw={3.5} />}
            {s.k}
          </span>
        ))}
      </div>
      <div className="split">
        <div>
          <h4 style={{ marginBottom: 6 }}>Desain tersimpan</h4>
          <DesignCanvas project={p} editable={false} scen="normal" />
        </div>
        <div>
          <h4 style={{ marginBottom: 6 }}>Perhitungan</h4>
          <p>
            Total alokasi {fmt(ev.total)} L dari {fmt(ev.S.supply)} L.
          </p>
          <Stat st={ev.overall} />
          <h4 style={{ margin: '14px 0 6px' }}>Revisi ({p.improve.revisions.length})</h4>
          {p.improve.revisions.length ? (
            <ul className="list">
              {p.improve.revisions.map((r) => (
                <li key={r.id}>
                  <span>
                    {tgl(r.at)}: {r.fields.perubahan}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Belum ada revisi.</p>
          )}
        </div>
      </div>
      <div className="card soft">
        <h4>Ringkasan akhir</h4>
        {p.present.savedAt ? (
          <ul className="list" style={{ marginTop: 8 }}>
            {Object.values(p.present.reflection).map((v, i) => (
              <li key={i}>{v}</li>
            ))}
          </ul>
        ) : (
          <p className="hint">Refleksi akhir belum disimpan di tahap Present.</p>
        )}
      </div>
    </div>
  );
}

export function ProyekSaya() {
  const { data, setData, session, go, openAccess, toast } = useApp();
  const [sel, setSel] = useState<string | null>(null);
  const [del, setDel] = useState<string | null>(null);

  // Strictly scope projects to the currently logged-in student group
  const mine = session
    ? data.projects.filter((p) => sameGroup(p.group, session))
    : [];

  const copy = async (p: Project) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(p, null, 2));
      toast('Data proyek disalin.');
    } catch {
      toast('Penyalinan ditolak oleh peramban ini.', true);
    }
  };

  const detail = mine.find((p) => p.id === sel);

  return (
    <div className="main">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Proyek Saya</h1>
          {session && (
            <p className="hint">
              Menampilkan proyek khusus untuk <b>{session.name}</b> · Kelas <b>{session.kelas}</b> (Kode Kelompok: <b>{session.groupCode || '-'}</b>).
            </p>
          )}
        </div>
        <div className="row">
          <Btn icon="flag" onClick={() => go('misi')}>
            Pilih misi baru
          </Btn>
          {!session && (
            <Btn kind="orange" icon="lock" onClick={() => openAccess(null, 'siswa')}>
              Masuk dengan kode
            </Btn>
          )}
        </div>
      </div>

      {!session ? (
        <div className="card">
          <AquaTip mood="think">
            Masuk terlebih dahulu menggunakan <b>Kode Kelas</b> dan <b>Kode Kelompok</b> dari gurumu untuk membuka daftar proyek kelompokmu.
          </AquaTip>
          <div className="row" style={{ marginTop: 14 }}>
            <Btn kind="orange" icon="lock" onClick={() => openAccess(null, 'siswa')}>
              Masuk ke Kelompok
            </Btn>
          </div>
        </div>
      ) : mine.length === 0 ? (
        <div className="card">
          <AquaTip mood="think">
            Kelompok <b>{session.name}</b> belum memiliki proyek misi yang tersimpan. Pilih salah satu misi untuk memulai proyek pertama kelompokmu!
          </AquaTip>
          <div className="row" style={{ marginTop: 14 }}>
            <Btn kind="orange" icon="flag" onClick={() => go('misi')}>
              Pilih Misi Sekarang
            </Btn>
          </div>
        </div>
      ) : (
        <div className="pcards">
          {mine.map((p) => (
            <div key={p.id} className="card">
              <span className="chip" style={{ background: '#E8FAFF' }}>
                Misi: {p.caseName}
              </span>
              <h3 style={{ marginTop: 6 }}>{p.title}</h3>
              <p>
                <b>{p.group.name}</b> · Kelas {p.group.kelas}
                {p.group.groupCode ? ` (${p.group.groupCode})` : ''}
              </p>
              <div style={{ margin: '10px 0' }}>
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={pct(p)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: pct(p) + '%' }} />
                </div>
                <b>{pct(p)}% selesai</b>
              </div>
              <p className="hint">
                Tahap saat ini: {STAGES[curStage(p) - 1].k}
                {p.stageDone[7] ? ' (semua selesai)' : ''}
              </p>
              <p className="hint">Dibuat {tgl(p.created)}</p>
              <p className="hint">Terakhir disimpan {tgl(p.updated)}</p>
              <div className="row" style={{ marginTop: 10 }}>
                <Btn
                  sm
                  kind="orange"
                  onClick={() => {
                    setData((d) => ({ ...d, currentId: p.id }));
                    go('petualangan', curStage(p), true);
                  }}
                >
                  Lanjutkan
                </Btn>
                <Btn
                  sm
                  icon="eye"
                  onClick={() => setSel(sel === p.id ? null : p.id)}
                >
                  {sel === p.id ? 'Tutup detail' : 'Lihat detail'}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <h2>Detail: {detail.title}</h2>
            <div className="row">
              <Btn sm icon="copy" onClick={() => copy(detail)}>
                Salin data
              </Btn>
              {del === detail.id ? (
                <>
                  <Btn
                    sm
                    kind="coral"
                    icon="trash"
                    onClick={() => {
                      setData((d) => ({
                        ...d,
                        projects: d.projects.filter((x) => x.id !== detail.id),
                        currentId: d.currentId === detail.id ? null : d.currentId,
                      }));
                      setSel(null);
                      setDel(null);
                      toast('Proyek berhasil dihapus.');
                    }}
                  >
                    Ya, hapus
                  </Btn>
                  <Btn sm onClick={() => setDel(null)}>
                    Batal
                  </Btn>
                </>
              ) : (
                <Btn sm icon="trash" onClick={() => setDel(detail.id)}>
                  Hapus
                </Btn>
              )}
            </div>
          </div>
          <ProjDetail p={detail} />
        </div>
      )}
    </div>
  );
}
