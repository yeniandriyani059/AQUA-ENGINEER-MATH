import { supabase } from '../lib/supabase';
import { TeacherSession } from '../types';

export interface TeacherProfile {
  id: string;
  full_name: string;
  email: string;
  school_name?: string | null;
  role: 'teacher';
  created_at?: string;
}

/**
 * Menerjemahkan pesan error Supabase Auth menjadi pesan ramah dalam Bahasa Indonesia
 */
export function formatAuthError(err: unknown): string {
  if (!err) return 'Terjadi kesalahan tidak dikenal.';
  const msg = typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message)
    : String(err);

  const lower = msg.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Email ini sudah terdaftar. Silakan gunakan tab "Masuk Guru".';
  }
  if (lower.includes('password should be at least 6 characters')) {
    return 'Kata sandi minimal harus 6 karakter.';
  }
  if (lower.includes('signup requires a valid password')) {
    return 'Silakan masukkan kata sandi yang valid.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Silakan periksa kotak masuk email Anda untuk melakukan verifikasi.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan. Harap tunggu beberapa saat sebelum mencoba kembali.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch')) {
    return 'Gagal terhubung ke layanan. Periksa koneksi internet Anda.';
  }
  return msg;
}

/**
 * Pendaftaran Akun Guru dengan Supabase Auth + Profil Supabase
 */
export async function signUpTeacher({
  email,
  password,
  fullName,
  schoolName,
}: {
  email: string;
  password: string;
  fullName: string;
  schoolName?: string;
}): Promise<{ session: TeacherSession | null; requiresEmailConfirmation: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();
  const cleanSchool = (schoolName || '').trim();

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        full_name: cleanName,
        school_name: cleanSchool || null,
        role: 'teacher',
      },
    },
  });

  if (error) {
    throw new Error(formatAuthError(error));
  }

  if (!data.user) {
    throw new Error('Gagal membuat pengguna pada Supabase.');
  }

  // Jika session aktif langsung terbentuk (auto confirm enabled di Supabase)
  const user = data.user;
  let teacherSession: TeacherSession | null = null;

  if (data.session) {
    // Sinkronisasi profil ke tabel profiles
    try {
      const { error: upErr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: cleanName,
        email: cleanEmail,
        school_name: cleanSchool || null,
        role: 'teacher',
      });
      if (upErr) {
        // Fallback jika kolom full_name/school_name belum ditambahkan via SQL migration di Supabase
        await supabase.from('profiles').upsert({
          id: user.id,
          email: cleanEmail,
        });
      }
    } catch (e) {
      console.warn('Sinkronisasi profil saat signup:', e);
    }

    teacherSession = {
      id: user.id,
      name: cleanName,
      email: cleanEmail,
      school: cleanSchool || undefined,
      loggedInAt: new Date().toISOString(),
    };
    return { session: teacherSession, requiresEmailConfirmation: false };
  }

  // Jika Supabase membutuhkan konfirmasi email terlebih dahulu
  return { session: null, requiresEmailConfirmation: true };
}

/**
 * Masuk Guru menggunakan Supabase Auth (Email + Password)
 */
export async function signInTeacher({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<TeacherSession> {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    throw new Error(formatAuthError(error));
  }

  if (!data.user) {
    throw new Error('Pengguna Supabase tidak ditemukan.');
  }

  const user = data.user;
  const metaName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Bapak/Ibu Guru';
  const metaSchool = user.user_metadata?.school_name || undefined;

  let fullName = metaName;
  let schoolName = metaSchool;

  // Coba ambil profil dari tabel public.profiles di Supabase
  try {
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!pError && profile) {
      if (profile.full_name) fullName = profile.full_name;
      if (profile.school_name !== undefined) schoolName = profile.school_name || undefined;
    } else {
      // Jika profil belum ada di tabel profiles, buat/sinkronkan sekarang
      const { error: insErr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        email: cleanEmail,
        school_name: schoolName || null,
        role: 'teacher',
      });
      if (insErr) {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: cleanEmail,
        });
      }
    }
  } catch (e) {
    console.warn('Gagal membaca/menyimpan ke tabel profiles:', e);
  }

  return {
    id: user.id,
    name: fullName,
    email: user.email || cleanEmail,
    school: schoolName,
    loggedInAt: new Date().toISOString(),
  };
}

/**
 * Keluar Akun Guru Supabase
 * Menggunakan supabase.auth.signOut() resmi
 */
export async function signOutTeacher(): Promise<void> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Error saat sign out Supabase:', error);
    }
  } catch (e) {
    console.warn('Pengecualian saat sign out Supabase:', e);
  }
}

/**
 * Mengambil sesi guru saat ini langsung dari Supabase Auth
 * Memeriksa supabase.auth.getSession() dan data tabel profiles
 */
export async function fetchCurrentTeacherSession(): Promise<TeacherSession | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;

    const user = session.user;
    let fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Bapak/Ibu Guru';
    let schoolName = user.user_metadata?.school_name || undefined;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.full_name) fullName = profile.full_name;
        if (profile.school_name !== undefined) schoolName = profile.school_name || undefined;
      }
    } catch {
      // ignore
    }

    return {
      id: user.id,
      name: fullName,
      email: user.email || '',
      school: schoolName,
      loggedInAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
