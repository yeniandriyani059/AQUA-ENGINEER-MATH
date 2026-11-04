import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Logo, Aqua } from '../common/Mascot';
import { CityArt } from '../canvas/CityArt';
import { Btn, Field, AquaTip } from '../common/UI';
import { STAGES } from '../../data/stages';
import { curStage, pct, sameGroup } from '../../utils/storage';
import { validateStudentAccess } from '../../utils/access';
import { findStudentGroupInSupabase } from '../../services/classGroupService';
import { SessionInfo } from '../../types';
import { Icon } from '../icons/Icon';

export function Beranda() {
  const { data, setData, proj, session, setSession, unlock, toast, go, openMat } = useApp();
  const [view, setView] = useState<'welcome' | 'siswa'>('welcome');
  const [classCode, setClassCode] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);

    const trimmedClassCode = classCode.trim().toUpperCase();
    const trimmedGroupCode = groupCode.trim().toUpperCase();

    try {
      // 1. Validasi sisi server / RPC (tanpa mengekspos seluruh data kelas dan kelompok ke browser siswa)
      const sbResult = await findStudentGroupInSupabase(trimmedClassCode, trimmedGroupCode);

      let sess: SessionInfo | null = null;
      let errorMsg = '';

      if (sbResult.ok && sbResult.classRoom && sbResult.group) {
        const { classRoom, group } = sbResult;

        sess = {
          groupId: group.id,
          classId: classRoom.id,
          classCode: classRoom.code,
          groupCode: group.code,
          kelas: classRoom.name,
          name: group.name,
          members: group.members,
          codeHash: group.codeHash,
          studentToken: sbResult.studentToken,
          expiresAt: sbResult.expiresAt,
          role: 'student',
        };
      } else {
        errorMsg = sbResult.error || '';
        // 2. Fallback hanya jika memori state memiliki kelas yang dibuat di sesi yang sama saat offline
        if (data.classes.length > 0) {
          const localRes = validateStudentAccess(
            data.classes,
            data.groups,
            trimmedClassCode,
            trimmedGroupCode
          );
          if (localRes.ok && localRes.session) {
            sess = {
              ...localRes.session,
              role: 'student',
            };
          } else if (!errorMsg) {
            errorMsg = localRes.error || '';
          }
        }
      }

      if (!sess) {
        setErr(
          errorMsg ||
            'Kode kelas tidak ditemukan: Periksa kembali Kode Kelas dan Kode Kelompok bersama Ibu/Bapak Guru.'
        );
        return;
      }

      const activeSess = sess;
      const serverProjects = Array.isArray(sbResult.projects) ? sbResult.projects : [];
      const mergedGroupProjs = [
        ...data.projects.filter((p) => sameGroup(p.group, activeSess)),
        ...serverProjects.filter(
          (sp) =>
            sameGroup(sp.group, activeSess) &&
            !data.projects.some((ep) => ep.id === sp.id)
        ),
      ];

      setSession(activeSess);
      mergedGroupProjs.forEach((p) => unlock(p.id));

      if (mergedGroupProjs.length > 0) {
        const latest = mergedGroupProjs
          .slice()
          .sort((a, b) => (b.updated > a.updated ? 1 : -1))[0];
        setData((d) => ({ ...d, projects: mergedGroupProjs, currentId: latest.id }));
      } else {
        setData((d) => ({ ...d, projects: [], currentId: null }));
      }

      toast(`Selamat datang di Aqua City, ${activeSess.name} (${activeSess.kelas})!`);
      go('dashboard');
    } catch {
      setErr(
        'Koneksi Supabase bermasalah: Gagal memverifikasi Kode Kelas & Kode Kelompok. Periksa jaringan internet Anda.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (view === 'siswa') {
    return (
      <div className="main home">
        <section className="card hero" aria-label="Halaman Masuk Siswa">
          <div className="hero-content">
            <div className="row" style={{ gap: 12 }}>
              <div className="hero-logo-wrap" style={{ marginBottom: 0 }}>
                <Logo width={180} />
              </div>
              <Aqua size={58} mood="happy" />
              <div className="grow">
                <span className="chip" style={{ background: '#FFF1BF', marginBottom: 4 }}>
                  <Icon n="users" size={15} /> Akses Kelompok Siswa
                </span>
                <h1 className="greet" style={{ fontSize: 'clamp(1.35rem, 2.1vw, 1.95rem)' }}>
                  Masuk sebagai Siswa
                </h1>
              </div>
            </div>

            <p className="hint" style={{ fontSize: '0.94rem' }}>
              Masukkan <b>Kode Kelas</b> dan <b>Kode Kelompok</b> yang diberikan oleh gurumu. Kamu tidak perlu email atau membuat akun sendiri.
            </p>

            <form onSubmit={handleStudentLogin} style={{ marginTop: 4 }}>
              <Field
                id="home-class-code"
                label="Kode Kelas"
                hint="Contoh: AQUA-5-26 (diberikan oleh Guru)"
              >
                <input
                  id="home-class-code"
                  className="in"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  placeholder="AQUA-5-26"
                  disabled={busy}
                  style={{ fontWeight: 800, letterSpacing: '0.04em' }}
                />
              </Field>

              <Field
                id="home-group-code"
                label="Kode Kelompok"
                hint="Contoh: GURITA-01 atau HIU-01 (diberikan oleh Guru)"
              >
                <input
                  id="home-group-code"
                  className="in"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  placeholder="GURITA-01"
                  disabled={busy}
                  style={{ fontWeight: 800, letterSpacing: '0.04em' }}
                />
              </Field>

              {err && (
                <div style={{ marginTop: 10 }}>
                  <AquaTip mood="sad" tone="bad">
                    {err}
                  </AquaTip>
                </div>
              )}

              <div className="row" style={{ marginTop: 14 }}>
                <Btn
                  kind="orange"
                  type="submit"
                  icon="rocket"
                  disabled={busy || !classCode.trim() || !groupCode.trim()}
                >
                  {busy ? 'Memeriksa Kode...' : 'Masuk ke Ruang Proyek'}
                </Btn>
                <Btn
                  type="button"
                  icon="left"
                  disabled={busy}
                  onClick={() => {
                    setView('welcome');
                    setErr('');
                  }}
                >
                  Kembali ke Halaman Awal
                </Btn>
              </div>
            </form>
          </div>

          <div className="hero-art">
            <CityArt people={true} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="main home">
      <section className="card hero" aria-label="Sambutan Aqua City">
        <div className="hero-content">
          <div className="row" style={{ gap: 14, alignItems: 'center' }}>
            <div className="hero-logo-wrap">
              <Logo width={230} />
            </div>
            <Aqua size={66} mood="happy" />
          </div>
          <p className="slogan">Hitung • Rancang • Bangun • Selamatkan Kota!</p>
          <h1 className="greet">
            Selamat Datang di Aqua City!
          </h1>
          <p className="big-t">
            Mari berpetualang menjadi insinyur cilik! Pelajari matematika untuk menghitung kebutuhan air, merancang jaringan pipa distribusi, dan menguji simulasi agar seluruh warga Aqua City mendapatkan air bersih secara adil.
          </p>

          <div className="row hero-actions" role="group" aria-label="Pilihan akses utama">
            <Btn
              kind="orange"
              icon="users"
              onClick={() => {
                setErr('');
                setView('siswa');
              }}
            >
              Masuk sebagai Siswa
            </Btn>
            <Btn
              kind="blue"
              icon="eye"
              onClick={() => go('guru')}
            >
              Masuk sebagai Guru
            </Btn>
            <Btn icon="book" onClick={() => openMat('video')}>
              Tonton Pengantar
            </Btn>
          </div>

          {session && (
            <div className="hero-progress-box">
              <div className="row" style={{ marginBottom: 6, justifyContent: 'space-between' }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="chip" style={{ background: '#D8F7E7' }}>
                    Aktif: {session.name} (Kelas {session.kelas})
                  </span>
                  {proj && (
                    <span className="chip" style={{ background: '#FFF1BF' }}>
                      Misi: {proj.caseName} · Tahap {curStage(proj)}/{STAGES.length}
                    </span>
                  )}
                </div>
                <Btn sm kind="yellow" icon="rocket" onClick={() => go('dashboard')}>
                  Ke Dashboard Siswa
                </Btn>
              </div>
              {proj && (
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={pct(proj)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <i style={{ width: pct(proj) + '%' }} />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="hero-art">
          <CityArt people={true} />
        </div>
      </section>
    </div>
  );
}
