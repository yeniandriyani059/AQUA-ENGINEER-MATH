import { AppSettings } from '../types';

/**
 * Skema Tabel Supabase & Struktur Relasi Data AQUA ENGINEER MATH
 * Disiapkan untuk integrasi penuh dengan Supabase Auth + PostgreSQL + Row Level Security (RLS).
 */

export interface SupabaseProfileRow {
  id: string; // UUID dari auth.users.id (Guru)
  full_name: string;
  email: string;
  school_name: string | null;
  role: 'teacher';
  created_at: string;
}

export interface SupabaseClassRow {
  id: string; // UUID
  teacher_id: string; // FK -> profiles.id
  class_name: string; // Contoh: "5A"
  class_code: string; // UNIQUE, contoh: "AQUA-5A-26"
  created_at: string;
}

export interface SupabaseGroupRow {
  id: string; // UUID
  class_id: string; // FK -> classes.id
  group_name: string; // Contoh: "Kelompok Gurita"
  group_code: string; // Contoh: "GURITA-01" (UNIQUE per class_id)
  members: string[]; // Array nama anggota kelompok (text[])
  created_at: string;
  updated_at?: string;
}

export interface SupabaseProjectRow {
  id: string; // UUID
  class_id: string; // FK -> classes.id
  group_id: string; // FK -> student_groups.id
  case_id: string;
  case_name: string;
  title: string;
  stage_done: Record<number, boolean>;
  current_stage: number;
  status: 'belum' | 'sedang' | 'selesai';
  created_at: string;
  updated_at: string;
}

export interface SupabaseProjectResultRow {
  id: string; // UUID
  project_id: string; // FK -> projects.id (UNIQUE)
  group_id: string; // FK -> student_groups.id
  explore_data: Record<string, string>;
  plan_data: Record<string, unknown>;
  alloc_data: Record<string, Record<string, number>>;
  design_data: Record<string, unknown>;
  sim_history: unknown[];
  create_data: { checks: boolean[] };
  improve_data: Record<string, unknown>;
  present_data: Record<string, unknown>;
  lkpd_data: Record<string, string>;
  updated_at: string;
}

export interface SupabasePresentationRow {
  id: string; // UUID
  class_id: string; // FK -> classes.id
  teacher_id: string; // FK -> profiles.id
  project_id: string; // FK -> projects.id
  group_id: string; // FK -> student_groups.id
  is_active: boolean;
  teacher_notes: string | null;
  presented_at: string;
}

import { SUPABASE_URL } from '../lib/supabase';

export function getPersistenceMode(settings?: AppSettings): {
  isCloudConnected: boolean;
  label: string;
  description: string;
} {
  const hasConfiguredClient = Boolean(SUPABASE_URL && SUPABASE_URL.startsWith('https://'));
  const hasCustomSettings = Boolean(
    settings?.sb?.url?.trim().startsWith('https://') &&
    settings?.sb?.key?.trim().length > 20
  );

  if (hasConfiguredClient || hasCustomSettings) {
    return {
      isCloudConnected: true,
      label: 'Supabase Cloud Terhubung',
      description: `Koneksi Supabase aktif (${SUPABASE_URL}). Autentikasi Guru dan sinkronisasi data cloud siap digunakan.`,
    };
  }

  return {
    isCloudConnected: false,
    label: 'Mode Perangkat Lokal',
    description:
      'Data akun guru, kelas, kelompok, dan proyek disimpan secara lokal pada peramban perangkat ini.',
  };
}

export const SUPABASE_SQL_BLUEPRINT = `-- =====================================================================
-- AQUA ENGINEER MATH — SUPABASE DATABASE SCHEMA & RLS BLUEPRINT
-- Tabel: profiles, classes, student_groups, projects, project_results, presentations
-- =====================================================================

-- 1. PROFILES (Akun Guru terhubung dengan Supabase Auth auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  school_name text,
  role text not null default 'teacher' check (role in ('teacher')),
  created_at timestamptz not null default now()
);

-- 2. CLASSES (Kelas yang dibuat oleh Guru dengan Kode Kelas otomatis, mis. AQUA-5-26)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_name text not null,
  class_code text not null unique,
  created_at timestamptz not null default now()
);

-- 3. STUDENT_GROUPS (Kelompok Siswa di dalam Kelas dengan Kode Kelompok otomatis, mis. GURITA-01, HIU-01)
create table if not exists public.student_groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  group_name text not null,
  group_code text not null,
  members text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, group_code)
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES — PEMISAHAN KETAT AKSES GURU & SISWA
-- Tanpa menonaktifkan RLS dan tanpa memberi akses SELECT * bebas ke seluruh tabel!
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.student_groups enable row level security;

-- A. Kebijakan PROFILES (Hanya Guru pemilik akun)
drop policy if exists "Guru membaca dan mengubah profil sendiri" on public.profiles;
create policy "Guru membaca dan mengubah profil sendiri"
  on public.profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- B. Kebijakan CLASSES (Hanya Guru pemilik kelas; TIDAK ada SELECT * bebas untuk anon)
drop policy if exists "Publik dan siswa dapat membaca kode kelas" on public.classes;
drop policy if exists "Guru mengelola kelas miliknya sendiri" on public.classes;
create policy "Guru mengelola kelas miliknya sendiri"
  on public.classes for all
  to authenticated
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- C. Kebijakan STUDENT_GROUPS (Hanya Guru pemilik kelas; TIDAK ada SELECT * bebas untuk anon)
drop policy if exists "Publik dan siswa dapat membaca kelompok" on public.student_groups;
drop policy if exists "Guru mengelola kelompok pada kelas miliknya" on public.student_groups;
create policy "Guru mengelola kelompok pada kelas miliknya"
  on public.student_groups for all
  to authenticated
  using (
    exists (
      select 1 from public.classes c
      where c.id = student_groups.class_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.classes c
      where c.id = student_groups.class_id and c.teacher_id = auth.uid()
    )
  );

-- D. FUNGSI RPC KEAMANAN TERBATAS (SECURITY DEFINER) UNTUK VALIDASI KODE SISWA
-- Hanya mengembalikan 1 baris kelompok yang cocok (tanpa mengekspos kelas/kelompok lain atau data pribadi Guru)
create or replace function public.verify_student_group_access(
  p_class_code text,
  p_group_code text
)
returns table (
  class_id uuid,
  class_name text,
  class_code text,
  group_id uuid,
  group_name text,
  group_code text,
  members text[],
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id as class_id,
    c.class_name,
    c.class_code,
    g.id as group_id,
    g.group_name,
    g.group_code,
    g.members,
    g.created_at
  from public.classes c
  join public.student_groups g on g.class_id = c.id
  where upper(trim(c.class_code)) = upper(trim(p_class_code))
    and upper(trim(g.group_code)) = upper(trim(p_group_code))
  limit 1;
$$;

grant execute on function public.verify_student_group_access(text, text) to anon, authenticated;
`;
