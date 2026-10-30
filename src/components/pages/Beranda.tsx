import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Logo, Aqua } from '../common/Mascot';
import { CityArt } from '../canvas/CityArt';
import { Btn, Field, AquaTip } from '../common/UI';
import { STAGES } from '../../data/stages';
import { curStage, pct, sameGroup } from '../../utils/storage';
import { validateStudentAccess } from '../../utils/access';
import { Icon } from '../icons/Icon';

export function Beranda() {
  const { data, setData, proj, session, setSession, unlock, toast, go, openMat } = useApp();
  const [view, setView] = useState<'welcome' | 'siswa'>('welcome');
  const [classCode, setClassCode] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [err, setErr] = useState('');

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    const res = validateStudentAccess(data.classes, data.groups, classCode, groupCode);
    if (!res.ok || !res.session) {
      setErr(
        res.error ||
          'Kode Kelas atau Kode Kelompok belum tepat. Coba periksa kembali bersama Ibu/Bapak Guru ya!'
      );
      return;
    }

    const sess = res.session;
    setSession(sess);

    const groupProjs = data.projects.filter((p) => sameGroup(p.group, sess));
    groupProjs.forEach((p) => unlock(p.id));

    if (groupProjs.length > 0) {
      const latest = groupProjs
        .slice()
        .sort((a, b) => (b.updated > a.updated ? 1 : -1))[0];
      setData((d) => ({ ...d, currentId: latest.id }));
    } else {
      setData((d) => ({ ...d, currentId: null }));
    }

    toast(`Selamat datang di Aqua City, ${sess.name} (Kelas ${sess.kelas})!`);
    go('dashboard');
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
                hint="Contoh: AQUA-5A-26 (diberikan oleh Guru)"
              >
                <input
                  id="home-class-code"
                  className="in"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  placeholder="AQUA-5A-26"
                  style={{ fontWeight: 800, letterSpacing: '0.04em' }}
                />
              </Field>

              <Field
                id="home-group-code"
                label="Kode Kelompok"
                hint="Contoh: LUMBA-01 (diberikan oleh Guru)"
              >
                <input
                  id="home-group-code"
                  className="in"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  placeholder="LUMBA-01"
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
                  disabled={!classCode.trim() || !groupCode.trim()}
                >
                  Masuk ke Ruang Proyek
                </Btn>
                <Btn
                  type="button"
                  icon="left"
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
