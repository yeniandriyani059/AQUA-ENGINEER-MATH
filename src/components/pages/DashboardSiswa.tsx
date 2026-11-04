import React from 'react';
import { useApp } from '../../context/AppContext';
import { sameGroup, doneCount, pct, curStage, stageState, tgl } from '../../utils/storage';
import { evaluate, fmt } from '../../utils/math';
import { STAGES } from '../../data/stages';
import { Aqua, StageArt } from '../common/Mascot';
import { AquaTip, Btn, Stat } from '../common/UI';
import { Icon } from '../icons/Icon';
import { Project } from '../../types';

const STLBL: Record<string, string> = {
  done: 'Selesai',
  current: 'Sedang dikerjakan',
  locked: 'Terkunci',
  open: 'Terbuka',
  none: 'Belum ada proyek',
};

export function DashboardSiswa() {
  const { data, setData, proj, session, logoutStudent, go, openAccess, toast } = useApp();

  if (!session) {
    return (
      <div className="main">
        <h1>Dashboard Siswa</h1>
        <div className="card" style={{ background: 'linear-gradient(135deg,var(--sky),#fff)' }}>
          <div className="row" style={{ gap: 16 }}>
            <Aqua size={76} mood="happy" />
            <div className="grow">
              <span className="chip" style={{ background: '#FFF1BF' }}>
                <Icon n="users" size={16} /> Akses Kelompok Siswa
              </span>
              <h2 style={{ marginTop: 6 }}>Masuk dengan Kode Kelas & Kode Kelompok</h2>
              <p className="hint" style={{ marginTop: 4 }}>
                Masukkan <b>Kode Kelas</b> (contoh: <code>AQUA-5A-26</code>) dan <b>Kode Kelompok</b> (contoh: <code>LUMBA-01</code>) yang diberikan oleh Ibu/Bapak Guru untuk membuka proyek kelompokmu.
              </p>
              <div className="row" style={{ marginTop: 14 }}>
                <Btn kind="orange" icon="lock" onClick={() => openAccess(null, 'siswa')}>
                  Masuk sebagai Siswa
                </Btn>
                <Btn kind="blue" icon="eye" onClick={() => go('guru')}>
                  Masuk sebagai Guru
                </Btn>
                <Btn icon="left" onClick={() => go('beranda')}>
                  Kembali ke Halaman Awal
                </Btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mine = data.projects
    .filter((p) => sameGroup(p.group, session))
    .sort((a, b) => (b.updated > a.updated ? 1 : -1));
  const cs = proj ? curStage(proj) : 1;
  const S = STAGES[cs - 1];
  const all = proj && proj.stageDone[7];
  const ev = proj && (doneCount(proj) >= 2 || proj.plan.savedAt) ? evaluate(proj, 'normal', true) : null;
  const lastSim = proj ? proj.sim.history.slice(-1)[0] : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(proj, null, 2));
      toast('Ringkasan proyek berhasil disalin dan siap dibagikan kepada guru.');
    } catch {
      toast('Gagal menyalin hasil proyek.', true);
    }
  };

  const open = (p: Project) => {
    setData((d) => ({ ...d, currentId: p.id }));
    go('petualangan', curStage(p), true);
  };

  return (
    <div className="main dash">
      <div className="card" style={{ background: 'linear-gradient(135deg,var(--sky),#fff)' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 14 }}>
            <Aqua size={74} mood="happy" />
            <div className="grow">
              <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                <span className="chip" style={{ background: '#E8FAFF' }}>
                  <Icon n="users" size={15} /> Nama Kelas: <b>{/^kelas\b/i.test(session.kelas) ? session.kelas : `Kelas ${session.kelas}`}</b>
                </span>
                {session.classCode && (
                  <span className="chip">
                    Kode Kelas: <b>{session.classCode}</b>
                  </span>
                )}
                <span className="chip" style={{ background: '#FFD84D' }}>
                  Kode Kelompok: <b>{session.groupCode || '-'}</b>
                </span>
              </div>
              <h1 style={{ marginTop: 2 }}>Kelompok: {session.name}</h1>
              <p className="hint">
                Anggota Kelompok: <b>{session.members || 'Belum diisi'}</b>
              </p>
            </div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Btn sm icon="flag" onClick={() => go('misi')}>
              Pilih Misi
            </Btn>
            <Btn sm icon="folder" onClick={() => go('proyek')}>
              Proyek Saya
            </Btn>
            <Btn sm kind="coral" onClick={logoutStudent}>
              Keluar Kelompok
            </Btn>
          </div>
        </div>

        {/* Ringkasan Identitas Kelas, Kelompok, Misi Aktif & Progres */}
        <div className="kpi" style={{ marginTop: 14 }} aria-label="Informasi kelompok siswa">
          <div>
            <span className="hint">Nama Kelas</span>
            <b style={{ fontSize: '1.15rem' }}>{/^kelas\b/i.test(session.kelas) ? session.kelas : `Kelas ${session.kelas}`}</b>
          </div>
          <div>
            <span className="hint">Nama Kelompok</span>
            <b style={{ fontSize: '1.15rem' }}>{session.name}</b>
          </div>
          <div style={{ background: '#FFF8E8' }}>
            <span className="hint">Kode Kelompok</span>
            <b style={{ fontSize: '1.15rem', letterSpacing: '0.03em' }}>{session.groupCode || '-'}</b>
          </div>
          <div style={{ background: '#D8F7E7' }}>
            <span className="hint">Progres Proyek Aktif</span>
            <b style={{ fontSize: '1.15rem' }}>{proj ? `${pct(proj)}% (${doneCount(proj)}/7)` : '0%'}</b>
          </div>
        </div>
      </div>

      <div className="dgrid">
        <section className="card" aria-label="Progres petualangan">
          <h3 style={{ marginBottom: 8 }}>Misi yang Sedang Dikerjakan & Progres Proyek</h3>
          {proj ? (
            <>
              <div className="row" style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                <span className="chip" style={{ background: '#E8FAFF' }}>
                  Misi Aktif: <b>{proj.caseName}</b>
                </span>
                <b>{doneCount(proj)} dari 7 tahap selesai ({pct(proj)}%)</b>
              </div>
              <div
                className="progress"
                role="progressbar"
                aria-valuenow={pct(proj)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <i style={{ width: pct(proj) + '%' }} />
              </div>
            </>
          ) : (
            <p>Kelompokmu belum memilih misi aktif. Pilih satu misi untuk mulai berpetualang.</p>
          )}

          <div className="dpath" style={{ marginTop: 14 }}>
            {STAGES.map((st) => {
              const x = stageState(proj, st.n);
              const lock = x === 'locked' || x === 'none';
              return (
                <button
                  key={st.n}
                  className={'dstep ' + x}
                  style={{ '--c': st.c } as React.CSSProperties}
                  disabled={lock}
                  onClick={() => go('petualangan', st.n)}
                  aria-label={'Tahap ' + st.n + ': ' + st.t + ', ' + STLBL[x]}
                >
                  <b>
                    {x === 'done' ? (
                      <Icon n="check" size={18} sw={3.5} />
                    ) : x === 'locked' || x === 'none' ? (
                      <Icon n="lock" size={16} sw={3} />
                    ) : (
                      st.n
                    )}
                  </b>
                  <span>{st.t}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="card"
          style={{
            background: proj ? S.c : '#fff',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          aria-label="Langkah berikutnya"
        >
          <div>
            <span className="chip">Langkah berikutnya</span>
            {proj ? (
              <>
                <div className="row" style={{ margin: '12px 0' }}>
                  <div className="art" style={{ width: 84, height: 84 }}>
                    <StageArt k={cs} />
                  </div>
                  <div className="grow">
                    <h3>{all ? 'Semua tahap selesai!' : 'Tahap ' + cs + ' · ' + S.k}</h3>
                    <p>
                      <b>{all ? 'Hebat, insinyur cilik!' : S.t}</b>
                    </p>
                  </div>
                </div>
                <p>
                  {all
                    ? 'Kamu boleh membuka tahap mana saja untuk meninjau atau memperbaiki karyamu.'
                    : S.d}
                </p>
              </>
            ) : (
              <div style={{ margin: '12px 0' }}>
                <AquaTip mood="think">
                  Pilih salah satu misi air, lalu kita mulai berpetualang bersama kelompokmu!
                </AquaTip>
              </div>
            )}
          </div>
          <div style={{ marginTop: 14 }}>
            {proj ? (
              <Btn
                kind="orange"
                icon="rocket"
                onClick={() => go('petualangan', all ? null : cs)}
              >
                {all ? 'Lanjutkan Proyek (Tinjau)' : 'Lanjutkan Proyek · Tahap ' + cs}
              </Btn>
            ) : (
              <Btn kind="orange" icon="flag" onClick={() => go('misi')}>
                Pilih Misi
              </Btn>
            )}
          </div>
        </section>
      </div>

      {/* Hasil Pekerjaan Kelompok yang Sudah Tersimpan */}
      <section className="card" aria-label="Hasil pekerjaan kelompok yang sudah tersimpan">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0 }}>Hasil Pekerjaan Kelompok yang Sudah Tersimpan ({mine.length})</h3>
            <p className="hint">
              Seluruh hasil perhitungan matematika, rancangan pipa distribusi air, simulasi, dan perbaikan solusi milik <b>{session.name}</b>.
            </p>
          </div>
          <Btn sm icon="flag" onClick={() => go('misi')}>
            Tambah / Pilih Misi Lain
          </Btn>
        </div>

        {proj && (
          <div className="card soft" style={{ marginBottom: 14, padding: '14px 16px' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <h4>Ringkasan Hasil Proyek Aktif: {proj.caseName}</h4>
              <span className="chip" style={{ background: '#FFD84D' }}>
                {doneCount(proj)} / 7 Tahap Selesai
              </span>
            </div>
            <div className="kpi">
              <div>
                <span className="hint">Perhitungan Alokasi</span>
                <b style={{ fontSize: '1rem' }}>
                  {ev ? `${fmt(ev.total)} / ${fmt(ev.S.supply)} L` : 'Belum dihitung'}
                </b>
              </div>
              <div>
                <span className="hint">Rancangan Pipa</span>
                <b style={{ fontSize: '1rem' }}>
                  {proj.design.edges.length > 0
                    ? `${proj.design.edges.length} Jalur Pipa`
                    : 'Belum dirancang'}
                </b>
              </div>
              <div>
                <span className="hint">Uji Simulasi</span>
                <div style={{ marginTop: 4 }}>
                  {lastSim ? <Stat st={lastSim.overall} /> : <span className="hint">Belum diuji</span>}
                </div>
              </div>
              <div>
                <span className="hint">Status Pengumpulan</span>
                <b style={{ fontSize: '1rem' }}>
                  {proj.present.savedAt ? 'Siap Presentasi' : 'Sedang Dikerjakan'}
                </b>
              </div>
            </div>
          </div>
        )}

        {mine.length === 0 ? (
          <p className="hint">
            Belum ada proyek misi yang dimulai oleh kelompokmu. Tekan <b>"Pilih Misi"</b> untuk memulai proyek pertama kelompokmu!
          </p>
        ) : (
          <div className="pcards">
            {mine.map((p) => (
              <div
                key={p.id}
                className={'card soft' + (proj && p.id === proj.id ? ' dnow' : '')}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="chip">{p.caseName}</span>
                  {proj && p.id === proj.id && (
                    <span className="chip" style={{ background: '#FFD84D' }}>Sedang Dikerjakan</span>
                  )}
                </div>
                <h4 style={{ margin: '8px 0 6px' }}>{p.title}</h4>
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={pct(p)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: pct(p) + '%' }} />
                </div>
                <p className="hint" style={{ margin: '6px 0 10px' }}>
                  {pct(p)}% selesai · diperbarui {tgl(p.updated)}
                </p>
                <Btn
                  sm
                  kind={proj && p.id === proj.id ? 'orange' : ''}
                  onClick={() => open(p)}
                >
                  {proj && p.id === proj.id ? 'Lanjutkan Proyek' : 'Buka Proyek Ini'}
                </Btn>
              </div>
            ))}
          </div>
        )}
      </section>

      {proj && (
        <section className="card soft" aria-label="Simpan dan Bagikan Hasil">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>Pengumpulan & Presentasi Proyek</h3>
              <p className="hint">
                {proj.present && proj.present.savedAt
                  ? 'Refleksi akhir sudah lengkap dan siap dipresentasikan di Dashboard Guru (' + tgl(proj.present.savedAt) + ').'
                  : 'Lengkapi refleksi akhir pada Tahap 7 (PRESENT) untuk mengumpulkan dan menyiapkan presentasi kelompok.'}
              </p>
            </div>
            <div className="row">
              <Btn sm icon="rocket" onClick={() => go('petualangan', 7)}>
                Buka Tahap PRESENT
              </Btn>
              <Btn sm icon="copy" onClick={copy}>
                Salin Ringkasan Proyek
              </Btn>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
