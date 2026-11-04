import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Project, StoredData, SessionInfo, TeacherSession } from '../types';
import { loadAll, LS, nowIso, sameGroup, curStage, stageState, newProject, isTrialItem, purgeLegacyTrialStorage } from '../utils/storage';
import { STAGES } from '../data/stages';
import { caseById } from '../data/cases';
import { supabase } from '../lib/supabase';
import type { AuthChangeEvent, Session as SupabaseSession } from '@supabase/supabase-js';
import { fetchCurrentTeacherSession, signOutTeacher } from '../services/authService';
import {
  fetchTeacherClassesAndGroups,
  syncLocalClassesAndGroupsToSupabase,
  fetchStudentGroupProjects,
  saveStudentGroupProject,
} from '../services/classGroupService';
import { isValidStudentSession } from '../utils/studentToken';

interface AppContextValue {
  data: StoredData;
  setData: React.Dispatch<React.SetStateAction<StoredData>>;
  proj: Project | null;
  patch: (fn: (d: Project) => void) => void;
  go: (page: string, stage?: number | null, force?: boolean) => void;
  toast: (msg: string, err?: boolean) => void;
  toastM: { msg: string; err?: boolean } | null;
  unlocked: string[];
  unlock: (id: string) => void;
  saveInfo: { ok: boolean; at: string | null };
  session: SessionInfo | null;
  setSession: (s: SessionInfo | null) => void;
  teacherSession: TeacherSession | null;
  setTeacherSession: (ts: TeacherSession | null) => void;
  logoutStudent: () => void;
  logoutTeacher: () => void;
  refreshTeacherData: () => Promise<void>;
  purgeTrialData: () => void;
  startMission: (caseId: string, sess?: SessionInfo | null, forceNew?: boolean) => void;
  openAccess: (pendingMission?: string | null, initialRole?: 'siswa' | 'guru') => void;
  accessInitialRole: 'siswa' | 'guru';
  openMat: (k: 'video' | 'ringkasan' | 'lkpd') => void;
  route: { page: string; stage: number | null };
  accessModalOpen: boolean;
  closeAccessModal: () => void;
  pendingAccessMission: string | null;
  activeMatModal: 'video' | 'ringkasan' | 'lkpd' | null;
  closeMatModal: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

const PAGES = [
  'beranda',
  'dashboard',
  'tujuan',
  'materi',
  'misi',
  'petualangan',
  'proyek',
  'prestasi',
  'guru',
  'tentang',
];

const SESSION_KEY = 'aem.session';
const TEACHER_SESSION_KEY = 'aem.teacherSession';
const CURRENT_ID_KEY = 'aem.currentId';

function parseHash(): { page: string; stage: number | null } {
  const h = (location.hash || '').replace('#', '');
  const m = h.match(/^([a-z]+)(?:-(\d))?$/);
  if (!m || !PAGES.includes(m[1])) return { page: 'beranda', stage: null };
  return { page: m[1], stage: m[2] ? Math.min(7, Math.max(1, +m[2])) : null };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoredData>(() => {
    const loaded = loadAll();
    const savedId = typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_ID_KEY) : null;
    const activeId = savedId && loaded.projects.some((p) => p.id === savedId)
      ? savedId
      : null;
    return { ...loaded, currentId: activeId };
  });

  const [route, setRoute] = useState(parseHash);
  const [toastM, setToastM] = useState<{ msg: string; err?: boolean } | null>(null);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessInitialRole, setAccessInitialRole] = useState<'siswa' | 'guru'>('siswa');
  const [pendingAccessMission, setPendingAccessMission] = useState<string | null>(null);
  const [activeMatModal, setActiveMatModal] = useState<'video' | 'ringkasan' | 'lkpd' | null>(null);

  const [session, setSessionState] = useState<SessionInfo | null>(() => {
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if (!s) return null;
      const parsed = JSON.parse(s);
      if (
        isTrialItem(parsed?.name) ||
        isTrialItem(parsed?.kelas) ||
        isTrialItem(parsed?.members) ||
        isTrialItem(parsed?.classCode) ||
        isTrialItem(parsed?.groupCode) ||
        !isValidStudentSession(parsed)
      ) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [teacherSession, setTeacherSessionState] = useState<TeacherSession | null>(() => {
    try {
      const ts = localStorage.getItem(TEACHER_SESSION_KEY);
      if (!ts) return null;
      const parsed = JSON.parse(ts);
      // Tolak sesi lokal / tiruan jika ada sisa data lama
      if (
        !parsed?.id ||
        parsed.id === 'guru-offline' ||
        parsed.id === 'teacher-local' ||
        !parsed?.email
      ) {
        localStorage.removeItem(TEACHER_SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [unlocked, setUnlocked] = useState<string[]>(() => {
    const loaded = loadAll();
    return loaded.projects.map((p) => p.id);
  });
  const [saveInfo, setSaveInfo] = useState<{ ok: boolean; at: string | null }>({ ok: true, at: null });

  const setSession = useCallback((s: SessionInfo | null) => {
    setSessionState(s);
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }, []);

  const setTeacherSession = useCallback((ts: TeacherSession | null) => {
    setTeacherSessionState(ts);
    try {
      if (ts) localStorage.setItem(TEACHER_SESSION_KEY, JSON.stringify(ts));
      else localStorage.removeItem(TEACHER_SESSION_KEY);
    } catch {
      // ignore
    }
  }, []);

  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Strictly scope active project to the currently logged-in student group!
  const rawCurrentProj = data.projects.find((p) => p.id === data.currentId) || null;
  const proj =
    session && rawCurrentProj && sameGroup(rawCurrentProj.group, session)
      ? rawCurrentProj
      : session
      ? data.projects
          .filter((p) => sameGroup(p.group, session))
          .slice()
          .sort((a, b) => (b.updated > a.updated ? 1 : -1))[0] || null
      : null;

  // Persist to localStorage
  useEffect(() => {
    try {
      const { currentId, ...rest } = data;
      localStorage.setItem(LS, JSON.stringify(rest));
      if (currentId) localStorage.setItem(CURRENT_ID_KEY, currentId);
      else localStorage.removeItem(CURRENT_ID_KEY);
      setSaveInfo({ ok: true, at: nowIso() });
    } catch {
      setSaveInfo({ ok: false, at: null });
    }
  }, [data]);

  // Sync hash routing
  useEffect(() => {
    const f = () => setRoute(parseHash());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  // Listen to Supabase Auth state changes & sync teacher session independently from student session
  useEffect(() => {
    fetchCurrentTeacherSession().then((ts) => {
      setTeacherSession(ts);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, sbSession: SupabaseSession | null) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && sbSession?.user) {
        const user = sbSession.user;
        let fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Bapak/Ibu Guru';
        let schoolName = user.user_metadata?.school_name || undefined;

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.full_name) fullName = profile.full_name;
          if (profile?.school_name !== undefined) schoolName = profile.school_name || undefined;
        } catch {
          // ignore
        }

        setTeacherSession({
          id: user.id,
          name: fullName,
          email: user.email || '',
          school: schoolName,
          loggedInAt: new Date().toISOString(),
        });
      } else if (event === 'SIGNED_OUT' || !sbSession) {
        setTeacherSession(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [setTeacherSession]);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const teacherSessionRef = useRef(teacherSession);
  useEffect(() => {
    teacherSessionRef.current = teacherSession;
  }, [teacherSession]);

  // Saat siswa aktif memiliki studentToken, muat proyek khusus kelompoknya saja & isolasi dari kelompok lain
  useEffect(() => {
    if (!session) return;
    if (!isValidStudentSession(session)) {
      setSession(null);
      return;
    }

    // Jika Guru sedang tidak login di browser ini, saring state proyek agar hanya berisi proyek milik kelompok siswa yang sedang aktif
    if (!teacherSessionRef.current) {
      setData((d) => ({
        ...d,
        classes: [],
        groups: [],
        projects: d.projects.filter((p) => sameGroup(p.group, session)),
      }));
    }

    if (session.studentToken) {
      fetchStudentGroupProjects(session.studentToken).then((serverProjects) => {
        if (!serverProjects || serverProjects.length === 0) return;
        setData((d) => {
          const map = new Map<string, Project>();
          const baseProjects = teacherSessionRef.current
            ? d.projects
            : d.projects.filter((p) => sameGroup(p.group, session));
          for (const p of baseProjects) map.set(p.id, p);
          for (const sp of serverProjects) {
            if (sameGroup(sp.group, session)) {
              const existing = map.get(sp.id);
              if (!existing || sp.updated >= existing.updated) {
                map.set(sp.id, sp);
              }
            }
          }
          return {
            ...d,
            projects: Array.from(map.values()),
          };
        });
      });
    }
  }, [session, setSession]);

  const refreshTeacherData = useCallback(async () => {
    const currentTeacherId = teacherSession?.id;
    if (!currentTeacherId) return;
    try {
      await syncLocalClassesAndGroupsToSupabase(
        currentTeacherId,
        dataRef.current.classes,
        dataRef.current.groups
      );

      const { classes, groups, projects: backendProjects } =
        await fetchTeacherClassesAndGroups(currentTeacherId);
      setData((d) => {
        const projMap = new Map<string, Project>();
        for (const p of d.projects) projMap.set(p.id, p);
        for (const bp of backendProjects || []) {
          if (bp?.id) {
            const ex = projMap.get(bp.id);
            if (!ex || bp.updated >= ex.updated) {
              projMap.set(bp.id, bp);
            }
          }
        }
        return {
          ...d,
          classes: classes.length > 0 ? classes : d.classes,
          groups: groups.length > 0 ? groups : d.groups,
          projects: Array.from(projMap.values()),
        };
      });
    } catch (e) {
      console.warn('Gagal menyinkronkan data kelas & kelompok Supabase:', e);
    }
  }, [teacherSession?.id]);

  // Sinkronisasi data khusus Guru saat teacherSession berubah (tanpa mengganggu session Siswa!)
  useEffect(() => {
    if (teacherSession?.id) {
      refreshTeacherData();
    } else {
      setData((d) => ({
        ...d,
        classes: [],
        groups: [],
        projects: sessionRef.current
          ? d.projects.filter((p) => sameGroup(p.group, sessionRef.current))
          : [],
      }));
    }
  }, [teacherSession?.id, refreshTeacherData]);

  const toast = useCallback((msg: string, err?: boolean) => {
    setToastM({ msg, err });
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToastM(null), 3800);
  }, []);

  const patch = useCallback(
    (fn: (d: Project) => void) => {
      const targetId = proj?.id;
      if (!targetId) return;
      let updatedProject: Project | null = null;
      setData((d) => ({
        ...d,
        projects: d.projects.map((p) => {
          if (p.id !== targetId) return p;
          const c: Project = JSON.parse(JSON.stringify(p));
          fn(c);
          c.updated = nowIso();
          updatedProject = c;
          return c;
        }),
      }));
      if (updatedProject && sessionRef.current?.studentToken) {
        saveStudentGroupProject(sessionRef.current.studentToken, updatedProject);
      }
    },
    [proj?.id]
  );

  const unlock = useCallback((id: string) => {
    setUnlocked((u) => (u.includes(id) ? u : [...u, id]));
  }, []);

  const goRaw = (page: string, stage?: number | null) => {
    const h = '#' + page + (stage ? '-' + stage : '');
    if (location.hash !== h) {
      try {
        location.hash = h;
      } catch {
        // ignore
      }
    }
    setRoute({ page, stage: stage || null });
    try {
      window.scrollTo({ top: 0 });
    } catch {
      // ignore
    }
  };

  const go = useCallback(
    (page: string, stage?: number | null, force?: boolean) => {
      if (page === 'petualangan' && !proj && !force) {
        toast('Pilih misi dulu ya, lalu masuk dengan Kode Kelas dan Kode Kelompok.', true);
        goRaw('misi');
        return;
      }
      if (
        page === 'petualangan' &&
        stage &&
        proj &&
        !force &&
        stageState(proj, stage) === 'locked'
      ) {
        toast(
          'Selesaikan tahap ' + STAGES[curStage(proj) - 1].k + ' dulu untuk membuka tahap ini.',
          true
        );
        return;
      }
      goRaw(page, stage);
    },
    [proj, toast]
  );

  const logoutStudent = useCallback(() => {
    setSession(null);
    setData((d) => ({
      ...d,
      currentId: null,
      projects: teacherSessionRef.current ? d.projects : [],
    }));
    toast('Kamu telah keluar dari sesi kelompok.');
  }, [setSession, toast]);

  const logoutTeacher = useCallback(async () => {
    try {
      await signOutTeacher();
    } catch {
      // ignore
    }
    setTeacherSession(null);
    // PENTING: Logout Guru TIDAK mengeluarkan Siswa yang sedang aktif mengerjakan misi!
    setData((d) => ({
      ...d,
      classes: [],
      groups: [],
      projects: sessionRef.current
        ? d.projects.filter((p) => sameGroup(p.group, sessionRef.current))
        : [],
    }));
    toast('Anda telah keluar dari akun Guru.');
  }, [setTeacherSession, toast]);

  const purgeTrialData = useCallback(() => {
    purgeLegacyTrialStorage();
    const clean = loadAll();
    setData(clean);
    if (session && (isTrialItem(session.name) || isTrialItem(session.kelas) || isTrialItem(session.members))) {
      setSession(null);
    }
    toast('Data percobaan lokal telah dibersihkan.');
  }, [session, setSession, toast]);

  const startMission = (caseId: string, sess?: SessionInfo | null, forceNew?: boolean) => {
    const curSess = sess || session;
    if (!curSess || !isValidStudentSession(curSess)) {
      setPendingAccessMission(caseId);
      setAccessInitialRole('siswa');
      setAccessModalOpen(true);
      return;
    }
    const c = caseById(caseId);
    const same = data.projects.filter(
      (p) => p.caseId === caseId && sameGroup(p.group, curSess)
    );
    const ex = !forceNew && same.slice().sort((a, b) => (b.updated > a.updated ? 1 : -1))[0];
    if (ex) {
      setData((d) => ({ ...d, currentId: ex.id }));
      unlock(ex.id);
      toast('Melanjutkan proyek misi ' + c.nama + '.');
      goRaw('petualangan', curStage(ex));
      return;
    }
    const np = newProject({
      caseId,
      title: c.nama + (same.length ? ' (' + (same.length + 1) + ')' : ''),
      group: curSess,
    });
    setData((d) => ({
      ...d,
      projects: [
        ...(teacherSessionRef.current
          ? d.projects
          : d.projects.filter((p) => sameGroup(p.group, curSess))),
        np,
      ],
      currentId: np.id,
    }));
    if (curSess.studentToken) {
      saveStudentGroupProject(curSess.studentToken, np);
    }
    unlock(np.id);
    toast('Misi ' + c.nama + ' dimulai. Selamat berpetualang!');
    goRaw('petualangan', 1);
  };

  const openAccess = (pendingMission?: string | null, initialRole: 'siswa' | 'guru' = 'siswa') => {
    setPendingAccessMission(pendingMission || null);
    setAccessInitialRole(initialRole);
    setAccessModalOpen(true);
  };

  const closeAccessModal = () => {
    setAccessModalOpen(false);
    setPendingAccessMission(null);
  };

  const openMat = (k: 'video' | 'ringkasan' | 'lkpd') => {
    setActiveMatModal(k);
  };

  const closeMatModal = () => {
    setActiveMatModal(null);
  };

  return (
    <AppContext.Provider
      value={{
        data,
        setData,
        proj,
        patch,
        go,
        toast,
        toastM,
        unlocked,
        unlock,
        saveInfo,
        session,
        setSession,
        teacherSession,
        setTeacherSession,
        logoutStudent,
        logoutTeacher,
        refreshTeacherData,
        purgeTrialData,
        startMission,
        openAccess,
        accessInitialRole,
        closeAccessModal,
        accessModalOpen,
        pendingAccessMission,
        openMat,
        closeMatModal,
        activeMatModal,
        route,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
