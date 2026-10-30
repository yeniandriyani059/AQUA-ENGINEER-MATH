import { Project, StoredData, GroupInfo, CaseMission, AppSettings } from '../types';
import { caseById } from '../data/cases';
import { STAGES } from '../data/stages';

export const LS = 'aem.v1';

export const DEF_SETTINGS: AppSettings = {
  sb: { url: '', key: '' },
};

export const nowIso = (): string => new Date().toISOString();

export const tgl = (iso?: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

export const uid = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
};

export async function sha(s: string): Promise<string> {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('aem:' + s));
    return Array.from(new Uint8Array(b))
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return 'hash:' + s;
  }
}

export const POS4 = [
  { x: 90, y: 275 },
  { x: 225, y: 295 },
  { x: 380, y: 295 },
  { x: 520, y: 265 },
];

export const POS5 = [
  { x: 65, y: 265 },
  { x: 180, y: 298 },
  { x: 300, y: 282 },
  { x: 420, y: 298 },
  { x: 535, y: 265 },
];

export const defPos = (c: CaseMission): Record<string, { x: number; y: number }> => {
  const P = c.fac.length > 4 ? POS5 : POS4;
  const o: Record<string, { x: number; y: number }> = { tank: { x: 300, y: 75 } };
  c.fac.forEach((f, i) => {
    o[f.id] = { ...P[i] };
  });
  return o;
};

export function newProject({
  caseId,
  title,
  group,
}: {
  caseId: string;
  title: string;
  group: GroupInfo;
}): Project {
  const c = caseById(caseId);
  const zero = Object.fromEntries(c.fac.map((f) => [f.id, 0]));
  return {
    id: uid(),
    caseId: c.id,
    caseName: c.nama,
    title,
    group: { ...group },
    created: nowIso(),
    updated: nowIso(),
    stageDone: {},
    explore: { q1: '', q2: '', q3: '', q4: '', q5: '' },
    plan: { practice: {}, notes: '', savedAt: null },
    alloc: { normal: zero },
    design: { pos: defPos(c), placed: { tank: true }, edges: [], savedAt: null },
    sim: { history: [] },
    create: { checks: [false, false, false, false, false, false] },
    improve: {
      fields: { masalah: '', awal: '', perubahan: '', hasil: '', kesimpulan: '' },
      revisions: [],
    },
    present: {
      reflection: { r1: '', r2: '', r3: '', r4: '' },
      savedAt: null,
    },
    lkpd: {},
  };
}

export function migrate(p: Project): Project {
  if (!p.caseId) {
    p.caseId = 'aquacity';
    p.caseName = 'Aqua City';
  }
  if (!p.caseName) {
    p.caseName = caseById(p.caseId).nama;
  }
  const c = caseById(p.caseId);
  if (!p.design) {
    p.design = { pos: defPos(c), placed: { tank: true }, edges: [], savedAt: null };
  } else {
    if (!p.design.pos || Object.keys(p.design.pos).length === 0) {
      p.design.pos = defPos(c);
    }
    p.design.placed = { tank: true, ...(p.design.placed || {}) };
    p.design.edges = Array.isArray(p.design.edges)
      ? p.design.edges.filter((e): e is string => typeof e === 'string')
      : [];
  }
  return p;
}

export const CLEAN_TRIAL_FLAG = 'aem.cleaned_pre_supabase_v2';

/**
 * Mendeteksi apakah entri merupakan data percobaan lokal sebelum integrasi Supabase
 * (seperti 'Kelas 5', 'AQUA1', atau anggota 'yeni, eren, devaro').
 */
export function isTrialItem(val: unknown): boolean {
  if (!val || typeof val !== 'string') return false;
  const s = val.trim().toLowerCase();
  const isExactKelas5 = s === 'kelas 5' || s === 'kelas5';
  return (
    s === 'aqua1' ||
    s.includes('aqua1') ||
    isExactKelas5 ||
    s.includes('yeni') ||
    s.includes('eren') ||
    s.includes('devaro')
  );
}

/**
 * Membersihkan data kelas, kelompok, dan proyek percobaan lokal
 * sambil mempertahankan akun guru (teachers) dan konfigurasi Supabase (settings).
 */
export function cleanTrialDataFromStore(d: any): StoredData {
  if (!d || typeof d !== 'object') {
    return {
      teachers: [],
      classes: [],
      groups: [],
      projects: [],
      currentId: null,
      settings: { ...DEF_SETTINGS },
    };
  }

  const teachers = Array.isArray(d.teachers) ? d.teachers : [];
  const settings = {
    ...DEF_SETTINGS,
    ...(d.settings || {}),
    sb: { ...DEF_SETTINGS.sb, ...((d.settings || {}).sb || {}) },
  };

  const rawClasses = Array.isArray(d.classes) ? d.classes : [];
  const rawGroups = Array.isArray(d.groups) ? d.groups : [];
  const rawProjects = Array.isArray(d.projects) ? d.projects : [];

  // Cari ID kelompok percobaan (misal AQUA1 / yeni, eren, devaro)
  const trialGroupIds = new Set<string>();
  rawGroups.forEach((g: any) => {
    if (
      isTrialItem(g.name) ||
      isTrialItem(g.code) ||
      isTrialItem(g.members)
    ) {
      trialGroupIds.add(g.id);
    }
  });

  // Cari ID kelas percobaan (misal Kelas 5 atau kelas yang menaungi kelompok percobaan)
  const trialClassIds = new Set<string>();
  rawClasses.forEach((c: any) => {
    if (isTrialItem(c.name) || isTrialItem(c.code)) {
      trialClassIds.add(c.id);
    }
  });

  rawClasses.forEach((c: any) => {
    const classGroups = rawGroups.filter((g: any) => g.classId === c.id);
    if (classGroups.length > 0 && classGroups.every((g: any) => trialGroupIds.has(g.id))) {
      trialClassIds.add(c.id);
    }
  });

  const classes = rawClasses.filter(
    (c: any) => !trialClassIds.has(c.id) && !isTrialItem(c.name) && !isTrialItem(c.code)
  );

  const groups = rawGroups.filter(
    (g: any) =>
      !trialGroupIds.has(g.id) &&
      !trialClassIds.has(g.classId) &&
      !isTrialItem(g.name) &&
      !isTrialItem(g.code) &&
      !isTrialItem(g.members)
  );

  const projects = rawProjects
    .filter((p: any) => {
      if (p.group) {
        if (
          isTrialItem(p.group.name) ||
          isTrialItem(p.group.kelas) ||
          isTrialItem(p.group.members) ||
          isTrialItem(p.group.classCode) ||
          isTrialItem(p.group.groupCode)
        ) {
          return false;
        }
        if (p.group.groupId && trialGroupIds.has(p.group.groupId)) return false;
        if (p.group.classId && trialClassIds.has(p.group.classId)) return false;
      }
      return true;
    })
    .map(migrate);

  return {
    teachers,
    classes,
    groups,
    projects,
    currentId: d.currentId || null,
    settings,
  };
}

/**
 * Melakukan pembersihan data percobaan lokal satu kali secara selektif pada localStorage
 * tanpa menghapus akun guru, session Supabase, atau konfigurasi aplikasi.
 */
export function purgeLegacyTrialStorage(): void {
  try {
    if (typeof localStorage === 'undefined') return;

    const raw = localStorage.getItem(LS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const cleaned = cleanTrialDataFromStore(parsed);
      const { currentId, ...rest } = cleaned;
      localStorage.setItem(LS, JSON.stringify(rest));
    }

    // Bersihkan sesi siswa jika berasal dari kelompok percobaan
    const rawSession = localStorage.getItem('aem.session');
    if (rawSession) {
      try {
        const s = JSON.parse(rawSession);
        if (
          isTrialItem(s.name) ||
          isTrialItem(s.kelas) ||
          isTrialItem(s.members) ||
          isTrialItem(s.classCode) ||
          isTrialItem(s.groupCode)
        ) {
          localStorage.removeItem('aem.session');
        }
      } catch {
        localStorage.removeItem('aem.session');
      }
    }

    localStorage.setItem(CLEAN_TRIAL_FLAG, 'true');
  } catch (err) {
    console.error('Error in purgeLegacyTrialStorage:', err);
  }
}

export function loadAll(): StoredData {
  try {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(CLEAN_TRIAL_FLAG)) {
      purgeLegacyTrialStorage();
    }

    const r = typeof localStorage !== 'undefined' ? localStorage.getItem(LS) : null;
    if (r) {
      const d = JSON.parse(r);
      return cleanTrialDataFromStore(d);
    }
  } catch (e) {
    console.error('Error loading stored data:', e);
  }
  return {
    teachers: [],
    classes: [],
    groups: [],
    projects: [],
    currentId: null,
    settings: { ...DEF_SETTINGS },
  };
}

export const sameGroup = (g: GroupInfo, s: GroupInfo | null): boolean => {
  if (!s) return false;
  if (g.groupId && s.groupId) {
    return g.groupId === s.groupId && g.classId === s.classId;
  }
  return (
    g.kelas === s.kelas &&
    g.name.toLowerCase() === s.name.toLowerCase() &&
    g.codeHash === s.codeHash
  );
};

export const doneCount = (p: Project): number =>
  STAGES.filter((s) => p.stageDone[s.n]).length;

export const pct = (p: Project): number =>
  Math.round((doneCount(p) / 7) * 100);

export const curStage = (p: Project): number => {
  const s = STAGES.find((st) => !p.stageDone[st.n]);
  return s ? s.n : 7;
};

export const stageState = (
  p: Project | null,
  n: number
): 'done' | 'current' | 'open' | 'locked' | 'none' => {
  if (!p) return 'none';
  if (p.stageDone[n]) return 'done';
  if (n === curStage(p)) return 'current';
  if (n < curStage(p)) return 'open';
  return 'locked';
};

export function groupProjects(
  data: StoredData,
  session: GroupInfo | null,
  caseId: string
): Project[] {
  return session
    ? data.projects.filter(
        (p) => p.caseId === caseId && sameGroup(p.group, session)
      )
    : [];
}
