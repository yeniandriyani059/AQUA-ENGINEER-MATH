import { StoredData, ClassRoom, Project, StudentGroup, SessionInfo } from '../types';
import { caseById } from '../data/cases';
import { defPos, doneCount, newProject } from './storage';

export function createSalt(): string {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return (
      Date.now().toString(36) +
      '-' +
      Math.random().toString(36).slice(2, 12)
    );
  }
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const payload = `aem-teacher-v1:${salt}:${password}`;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  if (!password || !salt || !expectedHash) return false;
  const computed = await hashPassword(password, salt);
  return computed === expectedHash;
}

export function normalizeCode(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function extractClassSlug(className: string): string {
  const cleaned = (className || '')
    .trim()
    .toUpperCase()
    .replace(/^KELAS\s+/i, '')
    .trim();

  // Look for patterns like 5A, 5B, 6C, IV-A, etc.
  const gradeMatch = cleaned.match(/\b([1-6][A-Z0-9]{0,3})\b/);
  if (gradeMatch) {
    return gradeMatch[1].replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  const alphaNum = cleaned.replace(/[^A-Z0-9]/g, '');
  if (alphaNum.length > 0) {
    return alphaNum.slice(0, 6);
  }
  return 'KLS';
}

export function generateClassCode(
  className: string,
  existingCodes: string[] = []
): string {
  const slug = extractClassSlug(className);
  const taken = new Set(existingCodes.map((c) => normalizeCode(c)));

  // Start with suffix 26 (e.g. AQUA-5A-26) and increment if already used
  for (let num = 26; num <= 99; num++) {
    const candidate = `AQUA-${slug}-${String(num).padStart(2, '0')}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  // Fallback with 3 digits if 26..99 are all exhausted
  for (let num = 100; num <= 999; num++) {
    const candidate = `AQUA-${slug}-${num}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `AQUA-${slug}-${Date.now().toString().slice(-4)}`;
}

export function extractGroupPrefix(groupName: string): string {
  const stripped = (groupName || '')
    .trim()
    .replace(/^(kelompok|tim|grup|regu)\s+/i, '')
    .trim();

  const words = stripped
    .toUpperCase()
    .split(/[\s\-_]+/)
    .map((w) => w.replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean);

  if (words.length > 0 && words[0].length >= 2) {
    return words[0].slice(0, 8);
  }

  const fallback = stripped.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return fallback.length >= 2 ? fallback.slice(0, 8) : 'AQUA';
}

export function generateGroupCode(
  groupName: string,
  existingCodesInClass: string[] = []
): string {
  const prefix = extractGroupPrefix(groupName);
  const taken = new Set(existingCodesInClass.map((c) => normalizeCode(c)));

  for (let i = 1; i <= 99; i++) {
    const candidate = `${prefix}-${String(i).padStart(2, '0')}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  for (let i = 100; i <= 999; i++) {
    const candidate = `${prefix}-${i}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${prefix}-${Date.now().toString().slice(-3)}`;
}

export interface StudentAccessValidationResult {
  ok: boolean;
  error?: string;
  classRoom?: ClassRoom;
  group?: StudentGroup;
  session?: SessionInfo;
}

export function validateStudentAccess(
  classes: ClassRoom[],
  groups: StudentGroup[],
  classCodeInput: string,
  groupCodeInput: string
): StudentAccessValidationResult {
  const normClassCode = normalizeCode(classCodeInput);
  const normGroupCode = normalizeCode(groupCodeInput);

  if (!normClassCode) {
    return {
      ok: false,
      error: 'Masukkan Kode Kelas dari Ibu/Bapak Guru terlebih dahulu ya (contoh: AQUA-5A-26).',
    };
  }

  if (!normGroupCode) {
    return {
      ok: false,
      error: 'Masukkan Kode Kelompok yang diberikan gurumu ya (contoh: LUMBA-01).',
    };
  }

  const foundClass = classes.find((c) => normalizeCode(c.code) === normClassCode);
  if (!foundClass) {
    return {
      ok: false,
      error:
        'Kode Kelas tidak ditemukan. Coba periksa kembali huruf dan angkanya bersama Ibu/Bapak Guru ya (contoh: AQUA-5A-26).',
    };
  }

  const foundGroup = groups.find(
    (g) =>
      g.classId === foundClass.id &&
      normalizeCode(g.code) === normGroupCode
  );

  if (!foundGroup) {
    const existsInOtherClass = groups.some(
      (g) =>
        g.classId !== foundClass.id &&
        normalizeCode(g.code) === normGroupCode
    );
    if (existsInOtherClass) {
      return {
        ok: false,
        error: `Kode Kelompok "${normGroupCode}" terdaftar di kelas lain, bukan di kelas ${foundClass.name} (${foundClass.code}). Periksa kembali Kode Kelas dan Kode Kelompokmu ya!`,
      };
    }
    return {
      ok: false,
      error: `Kode Kelompok "${normGroupCode}" belum terdaftar pada kelas ${foundClass.name} (${foundClass.code}). Mintalah Kode Kelompok yang benar kepada Ibu/Bapak Guru ya.`,
    };
  }

  const session: SessionInfo = {
    groupId: foundGroup.id,
    classId: foundClass.id,
    classCode: foundClass.code,
    groupCode: foundGroup.code,
    kelas: foundClass.name,
    name: foundGroup.name,
    members: foundGroup.members,
    codeHash: foundGroup.codeHash,
  };

  return {
    ok: true,
    classRoom: foundClass,
    group: foundGroup,
    session,
  };
}

export function projectBelongsToClass(p: Project, classId: string): boolean {
  return Boolean(classId && p.group.classId === classId);
}

export function projectBelongsToGroup(p: Project, groupId: string): boolean {
  return Boolean(groupId && p.group.groupId === groupId);
}

export function getClassImpact(data: StoredData, classId: string) {
  const affectedGroups = data.groups.filter((g) => g.classId === classId);
  const affectedGroupIds = new Set(affectedGroups.map((g) => g.id));
  const affectedProjects = data.projects.filter(
    (p) =>
      projectBelongsToClass(p, classId) ||
      (p.group.groupId ? affectedGroupIds.has(p.group.groupId) : false)
  );
  return {
    groupCount: affectedGroups.length,
    projectCount: affectedProjects.length,
    affectedGroups,
    affectedProjects,
  };
}

export function getGroupImpact(data: StoredData, groupId: string) {
  const affectedProjects = data.projects.filter((p) =>
    projectBelongsToGroup(p, groupId)
  );
  return {
    projectCount: affectedProjects.length,
    affectedProjects,
  };
}

export function updateClassById(
  data: StoredData,
  session: SessionInfo | null,
  classId: string,
  newClassName: string
): { data: StoredData; session: SessionInfo | null } {
  const cleanName = newClassName.trim();
  const targetClass = data.classes.find((c) => c.id === classId);
  if (!targetClass || !cleanName) {
    return { data, session };
  }

  const groupIdsInClass = new Set(
    data.groups.filter((g) => g.classId === classId).map((g) => g.id)
  );

  // Preserve original class code (Kode Kelas tidak berubah)
  const updatedClasses = data.classes.map((c) =>
    c.id === classId ? { ...c, name: cleanName } : c
  );

  const updatedGroups = data.groups.map((g) =>
    g.classId === classId ? { ...g, className: cleanName } : g
  );

  const updatedProjects = data.projects.map((p) =>
    projectBelongsToClass(p, classId) ||
    (p.group.groupId ? groupIdsInClass.has(p.group.groupId) : false)
      ? {
          ...p,
          group: {
            ...p.group,
            kelas: cleanName,
          },
        }
      : p
  );

  const updatedSession =
    session &&
    (session.classId === classId ||
      (session.groupId ? groupIdsInClass.has(session.groupId) : false))
      ? {
          ...session,
          kelas: cleanName,
        }
      : session;

  return {
    data: {
      ...data,
      classes: updatedClasses,
      groups: updatedGroups,
      projects: updatedProjects,
    },
    session: updatedSession,
  };
}

export function deleteClassById(
  data: StoredData,
  session: SessionInfo | null,
  classId: string
): { data: StoredData; session: SessionInfo | null } {
  const targetClass = data.classes.find((c) => c.id === classId);
  if (!targetClass) {
    return { data, session };
  }

  const removedGroupIds = new Set(
    data.groups.filter((g) => g.classId === classId).map((g) => g.id)
  );

  const updatedClasses = data.classes.filter((c) => c.id !== classId);
  const updatedGroups = data.groups.filter((g) => g.classId !== classId);
  const updatedProjects = data.projects.filter(
    (p) =>
      !(
        projectBelongsToClass(p, classId) ||
        (p.group.groupId ? removedGroupIds.has(p.group.groupId) : false)
      )
  );

  const updatedSession =
    session &&
    (session.classId === classId ||
      (session.groupId ? removedGroupIds.has(session.groupId) : false))
      ? null
      : session;

  return {
    data: {
      ...data,
      classes: updatedClasses,
      groups: updatedGroups,
      projects: updatedProjects,
    },
    session: updatedSession,
  };
}

export function updateGroupById(
  data: StoredData,
  session: SessionInfo | null,
  groupId: string,
  newGroupName: string,
  newMembers: string,
  updatedAtIso: string
): { data: StoredData; session: SessionInfo | null } {
  const cleanName = newGroupName.trim();
  const cleanMembers = newMembers.trim();
  const targetGroup = data.groups.find((g) => g.id === groupId);
  if (!targetGroup || !cleanName) {
    return { data, session };
  }

  // Preserve original group code (Kode Kelompok tetap sama)
  const updatedGroups = data.groups.map((g) =>
    g.id === groupId
      ? {
          ...g,
          name: cleanName,
          members: cleanMembers,
          updatedAt: updatedAtIso,
        }
      : g
  );

  const updatedProjects = data.projects.map((p) =>
    projectBelongsToGroup(p, groupId)
      ? {
          ...p,
          group: {
            ...p.group,
            name: cleanName,
            members: cleanMembers,
          },
        }
      : p
  );

  const updatedSession =
    session && session.groupId === groupId
      ? {
          ...session,
          name: cleanName,
          members: cleanMembers,
        }
      : session;

  return {
    data: {
      ...data,
      groups: updatedGroups,
      projects: updatedProjects,
    },
    session: updatedSession,
  };
}

export function getProjectImpact(p: Project) {
  const doneStages = doneCount(p);
  const simCount = p.sim.history.length;
  const hasCalc = Boolean(
    p.plan.savedAt ||
      Object.values(p.alloc?.normal || {}).some((v) => Number(v) > 0)
  );
  const hasDesign = Boolean(
    p.design.savedAt || (p.design.edges && p.design.edges.length > 0)
  );
  const hasAnswers =
    Object.values(p.explore || {}).some((v) => String(v || '').trim().length > 0) ||
    Object.values(p.improve?.fields || {}).some(
      (v) => String(v || '').trim().length > 0
    ) ||
    Object.values(p.present?.reflection || {}).some(
      (v) => String(v || '').trim().length > 0
    );

  return {
    doneStages,
    simCount,
    hasCalc,
    hasDesign,
    hasAnswers,
    hasProgress:
      doneStages > 0 || simCount > 0 || hasCalc || hasDesign || hasAnswers,
  };
}

export function updateProjectById(
  data: StoredData,
  projectId: string,
  updates: { title: string; caseId?: string },
  updatedAtIso: string
): StoredData {
  const cleanTitle = updates.title.trim();
  const target = data.projects.find((p) => p.id === projectId);
  if (!target || !cleanTitle) {
    return data;
  }

  const nextCaseId = updates.caseId ? updates.caseId.trim() : target.caseId;
  const missionChanged = Boolean(nextCaseId && nextCaseId !== target.caseId);
  const c = caseById(nextCaseId || target.caseId);

  const updatedProjects = data.projects.map((p) => {
    if (p.id !== projectId) return p;

    if (!missionChanged) {
      return {
        ...p,
        title: cleanTitle,
        updated: updatedAtIso,
      };
    }

    const adaptedAlloc = Object.fromEntries(
      c.fac.map((f) => [f.id, p.alloc?.normal?.[f.id] ?? 0])
    );

    return {
      ...p,
      title: cleanTitle,
      caseId: c.id,
      caseName: c.nama,
      alloc: {
        ...p.alloc,
        normal: adaptedAlloc,
      },
      design: {
        ...p.design,
        pos: defPos(c),
        placed: { tank: true, ...(p.design?.placed || {}) },
      },
      updated: updatedAtIso,
    };
  });

  return {
    ...data,
    projects: updatedProjects,
  };
}

export function resetProjectProgressById(
  data: StoredData,
  projectId: string,
  updatedAtIso: string
): StoredData {
  const target = data.projects.find((p) => p.id === projectId);
  if (!target) {
    return data;
  }

  const fresh = newProject({
    caseId: target.caseId,
    title: target.title,
    group: target.group,
  });

  const resetProject: Project = {
    ...fresh,
    id: target.id,
    created: target.created,
    updated: updatedAtIso,
    title: target.title,
    caseId: target.caseId,
    caseName: target.caseName,
    group: { ...target.group },
  };

  return {
    ...data,
    projects: data.projects.map((p) => (p.id === projectId ? resetProject : p)),
  };
}

export function deleteProjectById(
  data: StoredData,
  projectId: string
): StoredData {
  const exists = data.projects.some((p) => p.id === projectId);
  if (!exists) {
    return data;
  }

  return {
    ...data,
    projects: data.projects.filter((p) => p.id !== projectId),
    currentId: data.currentId === projectId ? null : data.currentId,
  };
}


export function deleteGroupById(
  data: StoredData,
  session: SessionInfo | null,
  groupId: string
): { data: StoredData; session: SessionInfo | null } {
  const targetGroup = data.groups.find((g) => g.id === groupId);
  if (!targetGroup) {
    return { data, session };
  }

  // Only delete the selected group and its projects; keep parent class intact
  const updatedGroups = data.groups.filter((g) => g.id !== groupId);
  const updatedProjects = data.projects.filter(
    (p) => !projectBelongsToGroup(p, groupId)
  );

  const updatedSession =
    session && session.groupId === groupId ? null : session;

  return {
    data: {
      ...data,
      groups: updatedGroups,
      projects: updatedProjects,
    },
    session: updatedSession,
  };
}

