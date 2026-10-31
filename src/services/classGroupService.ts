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

export async function fetchTeacherClassesAndGroups(teacherId: string): Promise<{
  classes: ClassRoom[];
  groups: StudentGroup[];
}> {
  if (!teacherId) return { classes: [], groups: [] };

  const { data: cData, error: cErr } = await supabase
    .from('classes')
    .select('*')
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
    code: c.class_code,
    createdAt: c.created_at,
  }));

  const classIds = classes.map((c) => c.id);
  if (classIds.length === 0) {
    return { classes: [], groups: [] };
  }

  const { data: gData, error: gErr } = await supabase
    .from('student_groups')
    .select('*')
    .in('class_id', classIds)
    .order('created_at', { ascending: true });

  if (gErr) {
    console.error('Error fetching student_groups:', gErr);
    throw new Error('Gagal mengambil data kelompok. Periksa koneksi internet Anda.');
  }

  const classMap = new Map(classes.map((c) => [c.id, c]));

  const groups: StudentGroup[] = (gData || []).map((g) => {
    const cls = classMap.get(g.class_id);
    return {
      id: g.id,
      classId: g.class_id,
      className: cls ? cls.name : '',
      classCode: cls ? cls.code : '',
      name: g.group_name,
      code: g.group_code,
      codeHash: g.group_code,
      members: formatMembersOutput(g.members),
      createdAt: g.created_at,
      updatedAt: g.updated_at || g.created_at,
    };
  });

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
  const classCode = generateClassCode(cleanName, existingCodes);

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

  return {
    id: data.id,
    teacherId: data.teacher_id,
    name: data.class_name,
    code: data.class_code,
    createdAt: data.created_at,
  };
}

export async function updateClassInSupabase(
  classId: string,
  newClassName: string
): Promise<void> {
  const cleanName = newClassName.trim();
  const { error } = await supabase
    .from('classes')
    .update({ class_name: cleanName })
    .eq('id', classId);

  if (error) {
    console.error('Error updating class in Supabase:', error);
    throw new Error('Gagal memperbarui nama kelas.');
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
  const groupCode = generateGroupCode(cleanName, existingCodesInClass);

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

  return {
    id: data.id,
    classId: data.class_id,
    className,
    classCode,
    name: data.group_name,
    code: data.group_code,
    codeHash: data.group_code,
    members: formatMembersOutput(data.members || membersArray),
    createdAt: data.created_at,
    updatedAt: data.updated_at || data.created_at,
  };
}

export async function updateGroupInSupabase(
  groupId: string,
  newGroupName: string,
  newMembers: string
): Promise<void> {
  const cleanName = newGroupName.trim();
  const membersArray = parseMembersInput(newMembers);

  const { error } = await supabase
    .from('student_groups')
    .update({
      group_name: cleanName,
      members: membersArray,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId);

  if (error) {
    console.error('Error updating group in Supabase:', error);
    throw new Error('Gagal memperbarui kelompok.');
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
}

export async function findStudentGroupInSupabase(
  classCodeInput: string,
  groupCodeInput: string
): Promise<{ ok: boolean; error?: string; classRoom?: ClassRoom; group?: StudentGroup }> {
  const normClassCode = normalizeCode(classCodeInput);
  const normGroupCode = normalizeCode(groupCodeInput);

  if (!normClassCode) {
    return { ok: false, error: 'Masukkan Kode Kelas terlebih dahulu (contoh: AQUA-5A-26).' };
  }
  if (!normGroupCode) {
    return { ok: false, error: 'Masukkan Kode Kelompok yang diberikan gurumu (contoh: LUMBA-01).' };
  }

  const { data: classes, error: cErr } = await supabase
    .from('classes')
    .select('*');

  if (cErr) {
    console.error('Error fetching classes:', cErr);
    return { ok: false, error: 'Gagal terhubung ke database. Periksa koneksi internet Anda.' };
  }

  if (!classes || classes.length === 0) {
    return {
      ok: false,
      error: `Kode Kelas "${normClassCode}" tidak ditemukan. Pastikan Ibu/Bapak Guru sudah membuat kelas di Dashboard Guru.`,
    };
  }

  const foundClass = classes.find((c) => normalizeCode(c.class_code) === normClassCode);
  if (!foundClass) {
    return {
      ok: false,
      error: `Kode Kelas "${normClassCode}" tidak ditemukan. Coba periksa kembali huruf dan angkanya bersama gurumu ya!`,
    };
  }

  const { data: groups, error: gErr } = await supabase
    .from('student_groups')
    .select('*')
    .eq('class_id', foundClass.id);

  if (gErr) {
    console.error('Error fetching groups:', gErr);
    return { ok: false, error: 'Gagal mengambil data kelompok.' };
  }

  if (!groups || groups.length === 0) {
    return {
      ok: false,
      error: `Belum ada kelompok yang terdaftar pada kelas ${foundClass.class_name} (${foundClass.class_code}).`,
    };
  }

  const foundGroup = groups.find((g) => normalizeCode(g.group_code) === normGroupCode);
  if (!foundGroup) {
    return {
      ok: false,
      error: `Kode Kelompok "${normGroupCode}" belum terdaftar pada kelas ${foundClass.class_name} (${foundClass.class_code}).`,
    };
  }

  const classRoom: ClassRoom = {
    id: foundClass.id,
    teacherId: foundClass.teacher_id,
    name: foundClass.class_name,
    code: foundClass.class_code,
    createdAt: foundClass.created_at,
  };

  const group: StudentGroup = {
    id: foundGroup.id,
    classId: foundGroup.class_id,
    className: foundClass.class_name,
    classCode: foundClass.class_code,
    name: foundGroup.group_name,
    code: foundGroup.group_code,
    codeHash: foundGroup.group_code,
    members: formatMembersOutput(foundGroup.members),
    createdAt: foundGroup.created_at,
    updatedAt: foundGroup.updated_at || foundGroup.created_at,
  };

  return { ok: true, classRoom, group };
}
