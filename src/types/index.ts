export interface Facility {
  id: string;
  nama: string;
  need: number;
  min: number; // percentage
  glyph: string;
  ket: string;
}

export interface CaseMission {
  id: string;
  nama: string;
  level: 'Mudah' | 'Sedang' | 'Menantang';
  fokus: string;
  tank: string;
  supply: number;
  kurang: number;
  gangguan: string;
  token: number;
  maxPct?: number;
  desc: string;
  cerita: string;
  fac: Facility[];
  pemantik: string[];
  tujuan: string[];
  tantangan: string;
  mul: { q: string; a: number; b: number };
  div: { q: string; total: number; parts: number };
  art: { sky: string; ground: string; decor: 'sun' | 'flower' | 'dry' | 'heart' | 'storm' | 'fest' };
}

export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  school?: string;
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
}

export interface TeacherSession {
  id: string;
  name: string;
  email: string;
  school?: string;
  loggedInAt: string;
}

export interface ClassRoom {
  id: string;
  teacherId: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface StudentGroup {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  name: string;
  code: string;
  codeHash: string;
  members: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupInfo {
  groupId?: string;
  classId?: string;
  classCode?: string;
  groupCode?: string;
  kelas: string;
  name: string;
  members: string;
  codeHash: string;
}

export interface ExploreData {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
}

export interface PlanData {
  practice: Record<string, { v: string; c: boolean }>;
  notes: string;
  savedAt: string | null;
}

export interface DesignData {
  pos: Record<string, { x: number; y: number }>;
  placed: Record<string, boolean>;
  edges: string[];
  savedAt: string | null;
}

export interface SimHistoryItem {
  at: string;
  scen: string;
  supply: number;
  total: number;
  left: number;
  overall: 'ok' | 'warn' | 'bad';
  text: string;
}

export interface CreateData {
  checks: boolean[];
}

export interface ImproveRevision {
  id: string;
  at: string;
  fields: {
    masalah: string;
    awal: string;
    perubahan: string;
    hasil: string;
    kesimpulan: string;
  };
  edges?: string[];
  alloc?: Record<string, number>;
  overall?: 'ok' | 'warn' | 'bad';
}

export interface ImproveData {
  fields: {
    masalah: string;
    awal: string;
    perubahan: string;
    hasil: string;
    kesimpulan: string;
  };
  revisions: ImproveRevision[];
}

export interface PresentData {
  reflection: {
    r1: string;
    r2: string;
    r3: string;
    r4: string;
  };
  savedAt: string | null;
}

export interface Project {
  id: string;
  caseId: string;
  caseName: string;
  title: string;
  group: GroupInfo;
  created: string;
  updated: string;
  stageDone: Record<number, boolean>;
  explore: ExploreData;
  plan: PlanData;
  alloc: Record<string, Record<string, number>>;
  design: DesignData;
  sim: { history: SimHistoryItem[] };
  create: CreateData;
  improve: ImproveData;
  present: PresentData;
  lkpd: Record<string, string>;
  mock?: boolean;
}

export interface Stage {
  n: number;
  k: string;
  t: string;
  d: string;
  c: string;
}

export interface ScenarioInfo {
  nama: string;
  supply: number;
  cut: string[];
  teks: string;
}

export interface AllocRow extends Facility {
  alloc: number;
  got: number;
  min: number; // in liters
  max: number | null; // in liters if maxPct
  over: boolean;
  placed: boolean;
  conn: boolean;
  remain: number;
  status: 'ok' | 'warn' | 'bad';
}

export interface EvaluationResult {
  S: ScenarioInfo;
  rows: AllocRow[];
  total: number;
  over: boolean;
  left: number;
  overall: 'ok' | 'warn' | 'bad';
  text: string;
  diff: number;
  demand: number;
  goalMin: boolean;
  checks: { ok: boolean; text: string }[];
}

export interface AppSettings {
  sb: {
    url: string;
    key: string;
  };
}

export interface StoredData {
  teachers: TeacherAccount[];
  classes: ClassRoom[];
  groups: StudentGroup[];
  projects: Project[];
  currentId: string | null;
  settings: AppSettings;
}

export type SessionInfo = GroupInfo;
