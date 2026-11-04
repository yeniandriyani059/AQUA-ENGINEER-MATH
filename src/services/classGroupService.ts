import { supabase } from '../lib/supabase';
import { ClassRoom, Project, StudentGroup } from '../types';
import { generateClassCode, generateGroupCode, normalizeCode } from '../utils/access';
import { STUDENT_TOKEN_TTL_MS } from '../utils/studentToken';

/**
 * Konversi input anggota (string koma atau array) menjadi Array String ["Aisyah", "Bima", "Rara"]
 * Menghilangkan spasi berlebih dan mengabaikan item kosong.
 */
export function parseMembersInput(membersInput: string | string[] | null | undefined): string[] {
  if (!membersInput) return [];
  if (Array.isArray(membersInput)) {
    return membersInput.map((m) => String(m).trim()).filter(Boolean);
  }
  return String(membersInput)
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * Konversi output anggota dari Supabase (Array String atau String) menjadi format baca "Aisyah, Bima, Rara"
 */
export function formatMembersOutput(membersFromDb: string[] | string | null | undefined): string {
  if (!membersFromDb) return '';
  if (Array.isArray(membersFromDb)) {
    return membersFromDb.map((m) => String(m).trim()).filter(Boolean).join(', ');
  }
  return String(membersFromDb).trim();
}

export type StudentAccessErrorCode =
  | 'EMPTY_INPUT'
  | 'CLASS_NOT_FOUND'
  | 'GROUP_NOT_FOUND'
  | 'GROUP_WRONG_CLASS'
  | 'SUPABASE_CONNECTION_ERROR'
  | 'RLS_ACCESS_DENIED';

export interface StudentGroupLookupResult {
  ok: boolean;
  errorCode?: StudentAccessErrorCode;
  error?: string;
  classRoom?: ClassRoom;
  group?: StudentGroup;
  studentToken?: string;
  expiresAt?: number;
  projects?: Project[];
  source?: 'server-verified' | 'supabase-rpc' | 'supabase';
}

/**
 * Klasifikasi error dari Supabase menjadi pesan spesifik (Koneksi Bermasalah vs Ditolak RLS)
 */
export function classifySupabaseError(err: {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}): { errorCode: StudentAccessErrorCode; error: string } {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || '').toLowerCase();
  const details = String(err?.details || '').toLowerCase();

  if (
    code === '42501' ||
    code === 'PGRST301' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('insufficient_privilege') ||
    details.includes('row-level security')
  ) {
    return {
      errorCode: 'RLS_ACCESS_DENIED',
      error:
        'Akses data ditolak oleh RLS: Kebijakan Row Level Security (RLS) pada tabel Supabase menolak pembacaan data untuk perangkat siswa.',
    };
  }

  return {
    errorCode: 'SUPABASE_CONNECTION_ERROR',
    error:
      'Koneksi Supabase bermasalah: Gagal terhubung ke server database. Periksa koneksi internet pada perangkat ini lalu coba kembali.',
  };
}

/**
 * Sinkronisasi otomatis daftar kelas, kelompok, dan proyek dari sesi Guru ke backend
 */
async function pushMirrorSync(
  classes: ClassRoom[],
  groups: StudentGroup[],
  projects?: Project[]
): Promise<void> {
  try {
    if (typeof fetch === 'undefined') return;
    await fetch('/api/supabase-mirror/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes, groups, projects }),
    });
  } catch {
    // Abaikan jika dijalankan di lingkungan tanpa endpoint lokal
  }
}

async function pushMirrorDelete(payload: {
  classId?: string;
  classCode?: string;
  groupId?: string;
  groupCode?: string;
}): Promise<void> {
  try {
    if (typeof fetch === 'undefined') return;
    await fetch('/api/supabase-mirror/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Abaikan jika tidak tersedia
  }
}

export async function fetchStudentGroupProjects(studentToken: string): Promise<Project[]> {
  if (!studentToken || typeof fetch === 'undefined') return [];
  try {
    const res = await fetch('/api/student/projects', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.projects) ? data.projects : [];
  } catch {
    return [];
  }
}

export async function saveStudentGroupProject(
  studentToken: string,
  project: Project
): Promise<boolean> {
  if (!studentToken || typeof fetch === 'undefined') return false;
  try {
    const res = await fetch('/api/student/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ project }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTeacherClassesAndGroups(teacherId: string): Promise<{
  classes: ClassRoom[];
  groups: StudentGroup[];
  projects: Project[];
}> {
  if (!teacherId) return { classes: [], groups: [], projects: [] };

  let sbClasses: ClassRoom[] = [];
  let sbGroups: StudentGroup[] = [];

  try {
    const { data: cData, error: cErr } = await supabase
      .from('classes')
      .select('id, teacher_id, class_name, class_code, created_at')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: true });

    if (!cErr && cData) {
      sbClasses = cData.map((c) => ({
        id: c.id,
        teacherId: c.teacher_id,
        name: c.class_name,
        code: normalizeCode(c.class_code),
        createdAt: c.created_at,
      }));
    }

    const classIds = sbClasses.map((c) => c.id);
    if (classIds.length > 0) {
      const { data: gData, error: gErr } = await supabase
        .from('student_groups')
        .select('id, class_id, group_name, group_code, members, created_at')
        .in('class_id', classIds)
        .order('created_at', { ascending: true });

      if (!gErr && gData) {
        const classMap = new Map(sbClasses.map((c) => [c.id, c]));
        sbGroups = gData.map((g) => {
          const cls = classMap.get(g.class_id);
          const cleanGroupCode = normalizeCode(g.group_code);
          return {
            id: g.id,
            classId: g.class_id,
            className: cls ? cls.name : '',
            classCode: cls ? cls.code : '',
            name: g.group_name,
            code: cleanGroupCode,
            codeHash: cleanGroupCode,
            members: formatMembersOutput(g.members),
            createdAt: g.created_at,
            updatedAt: (g as any).updated_at || g.created_at,
          };
        });
      }
    }
  } catch (e) {
    console.warn('Supabase teacher fetch warning:', e);
  }

  if (sbClasses.length > 0 || sbGroups.length > 0) {
    await pushMirrorSync(sbClasses, sbGroups);
  }

  // Gabungkan dengan data kelas, kelompok, dan seluruh proyek siswa yang tersinkronisasi di server
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/teacher/dashboard', {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'x-teacher-id': teacherId,
        },
      });
      if (res.ok) {
        const backendData = await res.json();
        const classMap = new Map<string, ClassRoom>();
        for (const bc of backendData.classes || []) {
          const code = normalizeCode(bc.class_code || bc.code);
          classMap.set(code, {
            id: bc.id,
            teacherId: bc.teacher_id || teacherId,
            name: bc.class_name || bc.name,
            code,
            createdAt: bc.created_at || bc.createdAt || new Date().toISOString(),
          });
        }
        for (const sc of sbClasses) {
          classMap.set(normalizeCode(sc.code), sc);
        }

        const mergedClasses = Array.from(classMap.values());
        const classById = new Map(mergedClasses.map((c) => [c.id, c]));

        const groupMap = new Map<string, StudentGroup>();
        for (const bg of backendData.student_groups || []) {
          const gCode = normalizeCode(bg.group_code || bg.code);
          const cls = classById.get(bg.class_id || bg.classId);
          const key = `${bg.class_id || bg.classId}::${gCode}`;
          groupMap.set(key, {
            id: bg.id,
            classId: bg.class_id || bg.classId,
            className: cls ? cls.name : bg.className || '',
            classCode: cls ? cls.code : bg.classCode || '',
            name: bg.group_name || bg.name,
            code: gCode,
            codeHash: gCode,
            members: formatMembersOutput(bg.members),
            createdAt: bg.created_at || bg.createdAt || new Date().toISOString(),
            updatedAt: bg.updated_at || bg.updatedAt || bg.created_at || new Date().toISOString(),
          });
        }
        for (const sg of sbGroups) {
          const key = `${sg.classId}::${normalizeCode(sg.code)}`;
          groupMap.set(key, sg);
        }

        return {
          classes: mergedClasses,
          groups: Array.from(groupMap.values()),
          projects: Array.isArray(backendData.projects) ? backendData.projects : [],
        };
      }
    }
  } catch {
    // Abaikan jika endpoint lokal tidak tersedia
  }

  return { classes: sbClasses, groups: sbGroups, projects: [] };
}

export async function createClassInSupabase({
  teacherId,
  className,
  existingCodes,
}: {
  teacherId: string;
  className: string;
  existingCodes: string[];
}): Promise<ClassRoom> {
  const cleanName = className.trim();
  const classCode = normalizeCode(generateClassCode(cleanName, existingCodes));

  const { data, error } = await supabase
    .from('classes')
    .insert({
      teacher_id: teacherId,
      class_name: cleanName,
      class_code: classCode,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating class in Supabase:', error);
    throw new Error('Gagal menyimpan kelas. Periksa koneksi Anda.');
  }

  const created: ClassRoom = {
    id: data.id,
    teacherId: data.teacher_id,
    name: data.class_name,
    code: normalizeCode(data.class_code),
    createdAt: data.created_at,
  };

  await pushMirrorSync([created], []);

  return created;
}

export async function updateClassInSupabase(
  classId: string,
  newClassName: string
): Promise<void> {
  const cleanName = newClassName.trim();
  const { data, error } = await supabase
    .from('classes')
    .update({ class_name: cleanName })
    .eq('id', classId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating class in Supabase:', error);
    throw new Error('Gagal memperbarui nama kelas.');
  }

  if (data) {
    await pushMirrorSync(
      [
        {
          id: data.id,
          teacherId: data.teacher_id,
          name: data.class_name,
          code: normalizeCode(data.class_code),
          createdAt: data.created_at,
        },
      ],
      []
    );
  }
}

export async function deleteClassInSupabase(classId: string): Promise<void> {
  await supabase.from('student_groups').delete().eq('class_id', classId);

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', classId);

  if (error) {
    console.error('Error deleting class in Supabase:', error);
    throw new Error('Gagal menghapus kelas.');
  }

  await pushMirrorDelete({ classId });
}

export async function createGroupInSupabase({
  classId,
  className,
  classCode,
  groupName,
  members,
  existingCodesInClass,
}: {
  classId: string;
  className: string;
  classCode: string;
  groupName: string;
  members: string;
  existingCodesInClass: string[];
}): Promise<StudentGroup> {
  const cleanName = groupName.trim();
  const membersArray = parseMembersInput(members);
  const groupCode = normalizeCode(generateGroupCode(cleanName, existingCodesInClass));

  const { data, error } = await supabase
    .from('student_groups')
    .insert({
      class_id: classId,
      group_name: cleanName,
      group_code: groupCode,
      members: membersArray,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating group in Supabase:', error);
    throw new Error('Gagal menyimpan kelompok. Periksa koneksi Anda.');
  }

  const createdGroup: StudentGroup = {
    id: data.id,
    classId: data.class_id,
    className,
    classCode: normalizeCode(classCode),
    name: data.group_name,
    code: normalizeCode(data.group_code),
    codeHash: normalizeCode(data.group_code),
    members: formatMembersOutput(data.members || membersArray),
    createdAt: data.created_at,
    updatedAt: data.updated_at || data.created_at,
  };

  await pushMirrorSync(
    [
      {
        id: classId,
        teacherId: '',
        name: className,
        code: normalizeCode(classCode),
        createdAt: data.created_at,
      },
    ],
    [createdGroup]
  );

  return createdGroup;
}

export async function updateGroupInSupabase(
  groupId: string,
  newGroupName: string,
  newMembers: string
): Promise<void> {
  const cleanName = newGroupName.trim();
  const membersArray = parseMembersInput(newMembers);

  const { data, error } = await supabase
    .from('student_groups')
    .update({
      group_name: cleanName,
      members: membersArray,
    })
    .eq('id', groupId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating group in Supabase:', error);
    throw new Error('Gagal memperbarui kelompok.');
  }

  if (data) {
    await pushMirrorSync(
      [],
      [
        {
          id: data.id,
          classId: data.class_id,
          className: '',
          classCode: '',
          name: data.group_name,
          code: normalizeCode(data.group_code),
          codeHash: normalizeCode(data.group_code),
          members: formatMembersOutput(data.members || membersArray),
          createdAt: data.created_at,
          updatedAt: data.updated_at || data.created_at,
        },
      ]
    );
  }
}

export async function deleteGroupInSupabase(groupId: string): Promise<void> {
  const { error } = await supabase
    .from('student_groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Error deleting group from Supabase:', error);
    throw new Error('Gagal menghapus kelompok.');
  }

  await pushMirrorDelete({ groupId });
}

export async function syncLocalClassesAndGroupsToSupabase(
  teacherId: string,
  localClasses: ClassRoom[],
  localGroups: StudentGroup[]
): Promise<void> {
  if (!teacherId || localClasses.length === 0) return;

  try {
    const { data: dbClasses } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId);

    const existingClassCodes = new Set((dbClasses || []).map((c) => normalizeCode(c.class_code)));
    const existingClassIdMap = new Map((dbClasses || []).map((c) => [c.id, c.id]));

    for (const lc of localClasses) {
      if (!existingClassCodes.has(normalizeCode(lc.code)) && !existingClassIdMap.has(lc.id)) {
        const { data: insertedClass, error: cErr } = await supabase
          .from('classes')
          .insert({
            id: lc.id,
            teacher_id: teacherId,
            class_name: lc.name,
            class_code: normalizeCode(lc.code),
            created_at: lc.createdAt || new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (!cErr && insertedClass) {
          existingClassIdMap.set(insertedClass.id, insertedClass.id);
        }
      }
    }

    const classIds = Array.from(existingClassIdMap.keys());
    if (classIds.length === 0) return;

    const { data: dbGroups } = await supabase
      .from('student_groups')
      .select('*')
      .in('class_id', classIds);

    const existingGroupCodes = new Set(
      (dbGroups || []).map((g) => `${g.class_id}::${normalizeCode(g.group_code)}`)
    );

    for (const lg of localGroups) {
      const key = `${lg.classId}::${normalizeCode(lg.code)}`;
      if (existingClassIdMap.has(lg.classId) && !existingGroupCodes.has(key)) {
        const membersArray = parseMembersInput(lg.members);
        await supabase
          .from('student_groups')
          .insert({
            id: lg.id,
            class_id: lg.classId,
            group_name: lg.name,
            group_code: normalizeCode(lg.code),
            members: membersArray,
            created_at: lg.createdAt || new Date().toISOString(),
          });
      }
    }
  } catch (e) {
    console.warn('[AEM Sync] Exception while syncing local data to Supabase:', e);
  }
}

/**
 * Validasi dari struktur data tabel (digunakan oleh unit test & evaluasi terisolasi)
 */
export function evaluateClassAndGroupRows(
  normClassCode: string,
  normGroupCode: string,
  classRows: Array<{
    id: string;
    teacher_id: string;
    class_name: string;
    class_code: string;
    created_at: string;
  }>,
  groupRows: Array<{
    id: string;
    class_id: string;
    group_name: string;
    group_code: string;
    members: string[] | string;
    created_at: string;
    updated_at?: string;
  }>,
  source: 'server-verified' | 'supabase-rpc' | 'supabase' = 'server-verified'
): StudentGroupLookupResult {
  const foundClass = classRows.find((c) => normalizeCode(c.class_code) === normClassCode);

  if (!foundClass) {
    return {
      ok: false,
      errorCode: 'CLASS_NOT_FOUND',
      error: `Kode kelas tidak ditemukan: Kode Kelas "${normClassCode}" belum terdaftar di database. Periksa kembali penulisan huruf, tanda hubung (-), dan angkanya bersama Ibu/Bapak Guru (contoh: AQUA-5-26).`,
    };
  }

  const classGroups = groupRows.filter((g) => g.class_id === foundClass.id);
  const foundGroup = classGroups.find((g) => normalizeCode(g.group_code) === normGroupCode);

  if (!foundGroup) {
    const groupInOtherClass = groupRows.find(
      (g) => g.class_id !== foundClass.id && normalizeCode(g.group_code) === normGroupCode
    );

    if (groupInOtherClass) {
      return {
        ok: false,
        errorCode: 'GROUP_WRONG_CLASS',
        error: `Kelompok bukan bagian dari kelas tersebut: Kode Kelompok "${normGroupCode}" terdaftar pada kelas lain, bukan bagian dari kelas ${foundClass.class_name} (${normalizeCode(foundClass.class_code)}).`,
      };
    }

    return {
      ok: false,
      errorCode: 'GROUP_NOT_FOUND',
      error: `Kode kelompok tidak ditemukan: Kode Kelompok "${normGroupCode}" belum terdaftar pada kelas ${foundClass.class_name} (${normalizeCode(foundClass.class_code)}).`,
    };
  }

  const cleanClassCode = normalizeCode(foundClass.class_code);
  const cleanGroupCode = normalizeCode(foundGroup.group_code);

  const classRoom: ClassRoom = {
    id: foundClass.id,
    teacherId: foundClass.teacher_id,
    name: foundClass.class_name,
    code: cleanClassCode,
    createdAt: foundClass.created_at,
  };

  const group: StudentGroup = {
    id: foundGroup.id,
    classId: foundGroup.class_id,
    className: foundClass.class_name,
    classCode: cleanClassCode,
    name: foundGroup.group_name,
    code: cleanGroupCode,
    codeHash: cleanGroupCode,
    members: formatMembersOutput(foundGroup.members),
    createdAt: foundGroup.created_at,
    updatedAt: foundGroup.updated_at || foundGroup.created_at,
  };

  return {
    ok: true,
    classRoom,
    group,
    source,
  };
}

/**
 * Validasi Utama Masuk Siswa (Tanpa Memerlukan Login Guru & Tanpa Mengekspos Seluruh Data Kelas/Kelompok):
 * 1. Mengirimkan `classCode` dan `groupCode` yang telah dinormalisasi ke endpoint backend `/api/student/verify-code`.
 * 2. Server memvalidasi kode melalui RPC Supabase `verify_student_group_access` atau basis data backend,
 *    kemudian menerbitkan `studentToken` bertanda tangan HMAC dengan masa berlaku terbatas (12 jam)
 *    yang hanya memberi izin pada kelompok tersebut.
 * 3. Browser siswa HANYA menerima informasi kelompok miliknya sendiri, bukan daftar kelas/kelompok lain.
 */
export async function findStudentGroupInSupabase(
  classCodeInput: string,
  groupCodeInput: string
): Promise<StudentGroupLookupResult> {
  const normClassCode = normalizeCode(classCodeInput);
  const normGroupCode = normalizeCode(groupCodeInput);

  if (!normClassCode) {
    return {
      ok: false,
      errorCode: 'EMPTY_INPUT',
      error: 'Masukkan Kode Kelas terlebih dahulu (contoh: AQUA-5-26).',
    };
  }
  if (!normGroupCode) {
    return {
      ok: false,
      errorCode: 'EMPTY_INPUT',
      error: 'Masukkan Kode Kelompok yang diberikan gurumu (contoh: GURITA-01 atau HIU-01).',
    };
  }

  // 1. Validasi Sisi Server melalui Endpoint Backend (/api/student/verify-code)
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/student/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          classCode: normClassCode,
          groupCode: normGroupCode,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (payload && typeof payload.ok === 'boolean') {
        if (payload.ok && payload.classRoom && payload.group) {
          return {
            ok: true,
            classRoom: payload.classRoom,
            group: payload.group,
            studentToken: payload.studentToken,
            expiresAt: payload.expiresAt || Date.now() + STUDENT_TOKEN_TTL_MS,
            projects: Array.isArray(payload.projects) ? payload.projects : [],
            source: payload.source || 'server-verified',
          };
        }
        return {
          ok: false,
          errorCode: payload.errorCode || 'CLASS_NOT_FOUND',
          error:
            payload.error ||
            `Kode kelas atau kode kelompok tidak ditemukan. Periksa kembali penulisan kode bersama Ibu/Bapak Guru.`,
        };
      }
    }
  } catch {
    // Jika endpoint lokal tidak terjangkau, lanjutkan ke RPC SECURITY DEFINER Supabase
  }

  // 2. Fallback RPC SECURITY DEFINER Supabase (`verify_student_group_access`)
  // Tidak pernah melakukan SELECT * bebas ke tabel classes atau student_groups dari browser siswa!
  try {
    const { data: rpcRows, error: rpcErr } = await supabase.rpc('verify_student_group_access', {
      p_class_code: normClassCode,
      p_group_code: normGroupCode,
    });

    if (rpcErr) {
      const classified = classifySupabaseError(rpcErr);
      return { ok: false, ...classified };
    }

    if (Array.isArray(rpcRows) && rpcRows.length > 0) {
      const row = rpcRows[0];
      const cleanClassCode = normalizeCode(row.class_code);
      const cleanGroupCode = normalizeCode(row.group_code);
      return {
        ok: true,
        source: 'supabase-rpc',
        expiresAt: Date.now() + STUDENT_TOKEN_TTL_MS,
        classRoom: {
          id: row.class_id,
          teacherId: row.teacher_id || '',
          name: row.class_name,
          code: cleanClassCode,
          createdAt: row.created_at || new Date().toISOString(),
        },
        group: {
          id: row.group_id,
          classId: row.class_id,
          className: row.class_name,
          classCode: cleanClassCode,
          name: row.group_name,
          code: cleanGroupCode,
          codeHash: cleanGroupCode,
          members: formatMembersOutput(row.members),
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        },
      };
    }

    return {
      ok: false,
      errorCode: 'CLASS_NOT_FOUND',
      error: `Kode kelas tidak ditemukan: Kode Kelas "${normClassCode}" atau Kode Kelompok "${normGroupCode}" tidak terdaftar.`,
    };
  } catch (networkErr: any) {
    const classified = classifySupabaseError(networkErr);
    return {
      ok: false,
      ...classified,
    };
  }
}
