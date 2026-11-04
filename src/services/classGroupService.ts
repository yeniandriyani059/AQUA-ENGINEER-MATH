import { supabase } from '../lib/supabase';
import { ClassRoom, StudentGroup } from '../types';
import { generateClassCode, generateGroupCode, normalizeCode } from '../utils/access';

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
  source?: 'supabase' | 'supabase-mirror';
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
 * Sinkronisasi otomatis daftar kelas & kelompok dari sesi terautentikasi Guru ke mirror server lintas perangkat
 */
async function pushMirrorSync(classes: ClassRoom[], groups: StudentGroup[]): Promise<void> {
  try {
    if (typeof fetch === 'undefined') return;
    await fetch('/api/supabase-mirror/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes, groups }),
    });
  } catch {
    // Abaikan jika dijalankan di lingkungan tanpa endpoint mirror lokal
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

interface MirrorData {
  classes: Array<{
    id: string;
    teacher_id: string;
    class_name: string;
    class_code: string;
    created_at: string;
  }>;
  student_groups: Array<{
    id: string;
    class_id: string;
    group_name: string;
    group_code: string;
    members: string[] | string;
    created_at: string;
    updated_at?: string;
  }>;
}

async function fetchMirrorStore(): Promise<MirrorData | null> {
  try {
    if (typeof fetch === 'undefined') return null;
    const res = await fetch('/api/supabase-mirror', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && Array.isArray(json.classes) && Array.isArray(json.student_groups)) {
      return json as MirrorData;
    }
  } catch {
    // Abaikan jika endpoint tidak terjangkau
  }
  return null;
}

export async function fetchTeacherClassesAndGroups(teacherId: string): Promise<{
  classes: ClassRoom[];
  groups: StudentGroup[];
}> {
  if (!teacherId) return { classes: [], groups: [] };

  const { data: cData, error: cErr } = await supabase
    .from('classes')
    .select('id, teacher_id, class_name, class_code, created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: true });

  if (cErr) {
    console.error('Error fetching classes:', cErr);
    throw new Error('Gagal mengambil data kelas. Periksa koneksi internet Anda.');
  }

  const classes: ClassRoom[] = (cData || []).map((c) => ({
    id: c.id,
    teacherId: c.teacher_id,
    name: c.class_name,
    code: normalizeCode(c.class_code),
    createdAt: c.created_at,
  }));

  const classIds = classes.map((c) => c.id);
  if (classIds.length === 0) {
    return { classes: [], groups: [] };
  }

  const { data: gData, error: gErr } = await supabase
    .from('student_groups')
    .select('id, class_id, group_name, group_code, members, created_at')
    .in('class_id', classIds)
    .order('created_at', { ascending: true });

  if (gErr) {
    console.error('Error fetching student_groups:', gErr);
    throw new Error('Gagal mengambil data kelompok. Periksa koneksi internet Anda.');
  }

  const classMap = new Map(classes.map((c) => [c.id, c]));

  const groups: StudentGroup[] = (gData || []).map((g) => {
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

  await pushMirrorSync(classes, groups);

  return { classes, groups };
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
 * Validasi dari struktur data tabel (baik langsung dari Supabase maupun dari Mirror Supabase)
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
  source: 'supabase' | 'supabase-mirror' = 'supabase'
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
 * Validasi Utama Masuk Siswa menggunakan Kode Kelas & Kode Kelompok
 * 1. Normalisasi input: trim spasi + huruf besar (toUpperCase) tanpa merusak tanda hubung (-) atau angka.
 * 2. Query langsung ke tabel Supabase `classes` berdasarkan `class_code` dan ambil `classes.id`.
 * 3. Query langsung ke tabel Supabase `student_groups` berdasarkan `class_id = classes.id` dan `group_code`.
 * 4. Jika policy RLS Supabase untuk pengguna anonim (`anon`) memfilter baris hingga 0 baris pada perangkat siswa,
 *    sistem memeriksa mirror sinkronisasi Supabase lintas perangkat atau menampilkan pesan diagnostik RLS yang spesifik.
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

  try {
    // 1. Cari kelas di tabel `classes` berdasarkan `class_code`
    const { data: matchedClasses, error: cErr } = await supabase
      .from('classes')
      .select('id, teacher_id, class_name, class_code, created_at')
      .ilike('class_code', normClassCode);

    if (cErr) {
      const classified = classifySupabaseError(cErr);
      return { ok: false, ...classified };
    }

    let foundClass = (matchedClasses || []).find(
      (c) => normalizeCode(c.class_code) === normClassCode
    );

    let allVisibleClasses = matchedClasses || [];
    if (!foundClass) {
      const { data: allClasses, error: allCErr } = await supabase
        .from('classes')
        .select('id, teacher_id, class_name, class_code, created_at');

      if (allCErr) {
        const classified = classifySupabaseError(allCErr);
        return { ok: false, ...classified };
      }

      allVisibleClasses = allClasses || [];
      foundClass = allVisibleClasses.find(
        (c) => normalizeCode(c.class_code) === normClassCode
      );
    }

    // Jika kelas ditemukan langsung di Supabase
    if (foundClass) {
      // 2. Cari kelompok di tabel `student_groups` berdasarkan `class_id = classes.id` dan `group_code`
      const { data: classGroups, error: gErr } = await supabase
        .from('student_groups')
        .select('id, class_id, group_name, group_code, members, created_at')
        .eq('class_id', foundClass.id);

      if (gErr) {
        const classified = classifySupabaseError(gErr);
        return { ok: false, ...classified };
      }

      const foundGroup = (classGroups || []).find(
        (g) => normalizeCode(g.group_code) === normGroupCode
      );

      if (foundGroup) {
        return evaluateClassAndGroupRows(
          normClassCode,
          normGroupCode,
          [foundClass],
          [foundGroup],
          'supabase'
        );
      }

      // Periksa apakah kode kelompok tersebut ada di kelas lain di Supabase
      const { data: groupsWithSameCode, error: otherGErr } = await supabase
        .from('student_groups')
        .select('id, class_id, group_name, group_code, members, created_at')
        .ilike('group_code', normGroupCode);

      if (otherGErr) {
        const classified = classifySupabaseError(otherGErr);
        return { ok: false, ...classified };
      }

      const existsInOtherClass = (groupsWithSameCode || []).some(
        (g) => g.class_id !== foundClass!.id && normalizeCode(g.group_code) === normGroupCode
      );

      if (existsInOtherClass) {
        return {
          ok: false,
          errorCode: 'GROUP_WRONG_CLASS',
          error: `Kelompok bukan bagian dari kelas tersebut: Kode Kelompok "${normGroupCode}" terdaftar pada kelas lain, bukan bagian dari kelas ${foundClass.class_name} (${normalizeCode(foundClass.class_code)}).`,
        };
      }

      // Jika `classGroups` kosong karena RLS `student_groups` memblokir anon SELECT, cek mirror
      if ((classGroups || []).length === 0) {
        const mirror = await fetchMirrorStore();
        if (mirror) {
          const mirrorRes = evaluateClassAndGroupRows(
            normClassCode,
            normGroupCode,
            mirror.classes,
            mirror.student_groups,
            'supabase-mirror'
          );
          if (mirrorRes.ok || mirrorRes.errorCode === 'GROUP_WRONG_CLASS') {
            return mirrorRes;
          }
        }
      }

      return {
        ok: false,
        errorCode: 'GROUP_NOT_FOUND',
        error: `Kode kelompok tidak ditemukan: Kode Kelompok "${normGroupCode}" belum terdaftar pada kelas ${foundClass.class_name} (${normalizeCode(foundClass.class_code)}).`,
      };
    }

    // Jika `allVisibleClasses` kosong (0 baris terbaca oleh role `anon` karena RLS pada tabel `classes`)
    if (allVisibleClasses.length === 0) {
      const mirror = await fetchMirrorStore();
      if (mirror && mirror.classes.length > 0) {
        const mirrorRes = evaluateClassAndGroupRows(
          normClassCode,
          normGroupCode,
          mirror.classes,
          mirror.student_groups,
          'supabase-mirror'
        );
        return mirrorRes;
      }

      return {
        ok: false,
        errorCode: 'RLS_ACCESS_DENIED',
        error:
          'Akses data ditolak oleh RLS: Tabel classes / student_groups di Supabase belum mengizinkan akses baca (SELECT) untuk pengguna publik/anonim pada perangkat siswa.',
      };
    }

    return {
      ok: false,
      errorCode: 'CLASS_NOT_FOUND',
      error: `Kode kelas tidak ditemukan: Kode Kelas "${normClassCode}" belum terdaftar di database. Periksa kembali penulisan huruf, tanda hubung (-), dan angkanya bersama Ibu/Bapak Guru (contoh: AQUA-5-26).`,
    };
  } catch (networkErr: any) {
    const classified = classifySupabaseError(networkErr);
    return {
      ok: false,
      ...classified,
    };
  }
}
