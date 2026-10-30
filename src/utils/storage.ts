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

export function loadAll(): StoredData {
  try {
    const r = localStorage.getItem(LS);
    if (r) {
      const d = JSON.parse(r);
      return {
        teachers: Array.isArray(d.teachers) ? d.teachers : [],
        classes: Array.isArray(d.classes) ? d.classes : [],
        groups: Array.isArray(d.groups) ? d.groups : [],
        projects: Array.isArray(d.projects) ? d.projects.map(migrate) : [],
        currentId: d.currentId || null,
        settings: {
          ...DEF_SETTINGS,
          ...(d.settings || {}),
          sb: { ...DEF_SETTINGS.sb, ...((d.settings || {}).sb || {}) },
        },
      };
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
