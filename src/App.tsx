import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Logo } from './components/common/Mascot';
import { Icon } from './components/icons/Icon';
import { Btn } from './components/common/UI';
import { AccessModal } from './components/modals/AccessModal';
import { MatModal } from './components/modals/MatModal';

import { Beranda } from './components/pages/Beranda';
import { DashboardSiswa } from './components/pages/DashboardSiswa';
import { Tujuan } from './components/pages/Tujuan';
import { Materi } from './components/pages/Materi';
import { Misi } from './components/pages/Misi';
import { Petualangan } from './components/pages/Petualangan';
import { ProyekSaya } from './components/pages/ProyekSaya';
import { PapanPrestasi } from './components/pages/PapanPrestasi';
import { DashboardGuru } from './components/pages/DashboardGuru';
import { Tentang } from './components/pages/Tentang';

const NAV: [string, string, string, string][] = [
  ['beranda', 'Beranda', 'Beranda', 'home'],
  ['dashboard', 'Dashboard Siswa', 'Dashboard', 'users'],
  ['tujuan', 'Tujuan Pembelajaran', 'Tujuan', 'target'],
  ['materi', 'Materi Belajar', 'Materi', 'book'],
  ['misi', 'Pilih Misi', 'Misi', 'flag'],
  ['petualangan', 'Mulai Petualangan', 'Petualangan', 'rocket'],
  ['proyek', 'Proyek Saya', 'Proyek', 'folder'],
  ['prestasi', 'Papan Prestasi', 'Prestasi', 'trophy'],
  ['guru', 'Dashboard Guru', 'Guru', 'eye'],
  ['tentang', 'Tentang Aplikasi', 'Tentang', 'info'],
];

function MainApp() {
  const {
    proj,
    go,
    session,
    teacherSession,
    route,
    openAccess,
    accessModalOpen,
    closeAccessModal,
    pendingAccessMission,
    activeMatModal,
    closeMatModal,
    toastM,
  } = useApp();

  // Keep active mobile nav item centered
  useEffect(() => {
    try {
      const activeEl = document.querySelector(
        '.bottom .nav[aria-current="page"], .stepper .step[aria-current="step"]'
      );
      if (activeEl && 'scrollIntoView' in activeEl) {
        (activeEl as HTMLElement).scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    } catch {
      // ignore
    }
  }, [route]);

  const Page = route.page;

  return (
    <div className="shell">
      <aside className="side" aria-label="Navigasi utama">
        <div className="brand">
          <Logo width={176} />
        </div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n[0]}
              className="nav"
              aria-current={route.page === n[0] ? 'page' : undefined}
              onClick={() => go(n[0], null, n[0] === 'petualangan')}
            >
              <Icon n={n[3]} size={24} />
              {n[1]}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="pill-save">
            Powered by Bu Guru Yennia
          </div>
        </div>
      </aside>

      <main className="main" id="konten">
        <div className="topbar">
          <div className="row">
            <div className="chip">
              <Icon n="users" size={16} />
              {session
                ? `${session.name} · ${/^kelas\b/i.test(session.kelas) ? session.kelas : `Kelas ${session.kelas}`}${session.groupCode ? ` (${session.groupCode})` : ''}`
                : 'Belum masuk kelompok'}
            </div>
            {proj && (
              <div className="chip" style={{ background: '#E8FAFF' }}>
                Misi: {proj.caseName}
              </div>
            )}
            {teacherSession && (
              <div className="chip" style={{ background: '#D8F7E7' }}>
                <Icon n="eye" size={15} /> Guru: {teacherSession.name}
              </div>
            )}
          </div>
          <div className="row">
            <Btn sm icon="flag" onClick={() => go('misi')}>
              Pilih misi
            </Btn>
            <Btn
              sm
              icon={session ? 'folder' : 'lock'}
              onClick={() => (session ? go('proyek') : openAccess(null, 'siswa'))}
            >
              {session ? 'Proyek saya' : 'Masuk dengan kode'}
            </Btn>
          </div>
        </div>

        {Page === 'beranda' && <Beranda />}
        {Page === 'dashboard' && <DashboardSiswa />}
        {Page === 'tujuan' && <Tujuan />}
        {Page === 'materi' && <Materi />}
        {Page === 'misi' && <Misi />}
        {Page === 'petualangan' && <Petualangan stage={route.stage} />}
        {Page === 'proyek' && <ProyekSaya />}
        {Page === 'prestasi' && <PapanPrestasi />}
        {Page === 'guru' && <DashboardGuru />}
        {Page === 'tentang' && <Tentang />}

        <footer className="app-footer">
          <span>Aqua Engineer Math</span>
          <span className="dot">•</span>
          <strong>Powered by Bu Guru Yennia</strong>
        </footer>
      </main>

      <nav className="bottom" aria-label="Navigasi utama (ponsel)">
        {NAV.map((n) => (
          <button
            key={n[0]}
            className="nav"
            aria-current={route.page === n[0] ? 'page' : undefined}
            onClick={() => go(n[0], null, n[0] === 'petualangan')}
          >
            <Icon n={n[3]} size={22} />
            {n[2]}
          </button>
        ))}
      </nav>

      {accessModalOpen && (
        <AccessModal pending={pendingAccessMission} onClose={closeAccessModal} />
      )}

      {activeMatModal && (
        <MatModal k={activeMatModal} onClose={closeMatModal} />
      )}

      {toastM && (
        <div className={'toast' + (toastM.err ? ' err' : '')} role="status">
          {toastM.msg}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
