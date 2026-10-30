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
  group_name: string; // Contoh: "Kelompok Lumba-Lumba"
  group_code: string; // Contoh: "LUMBA-01" (UNIQUE per class_id)
  group_code_hash: string; // SHA-256 hash
  members: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseProjectRow {
  id: string; // UUID
  class_id: string; // FK -> classes.id
  group_id: string; // FK -> groups.id
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
  group_id: string; // FK -> groups.id
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
  group_id: string; // FK -> groups.id
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
-- Tabel: profiles, classes, groups, projects, project_results, presentations
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

-- 2. CLASSES (Kelas yang dibuat oleh Guru dengan Kode Kelas otomatis)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_name text not null,
  class_code text not null unique,
  created_at timestamptz not null default now()
);

-- 3. GROUPS (Kelompok Siswa di dalam Kelas dengan Kode Kelompok otomatis)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  group_name text not null,
  group_code text not null,
  group_code_hash text not null,
  members text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, group_code)
);

-- 4. PROJECTS (Metadata Proyek Misi per Kelompok)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  case_id text not null,
  case_name text not null,
  title text not null,
  stage_done jsonb not null default '{}'::jsonb,
  current_stage int not null default 1,
  status text not null default 'belum' check (status in ('belum', 'sedang', 'selesai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. PROJECT_RESULTS (Data Jawaban, Perhitungan, Desain Pipa, Simulasi, & Refleksi)
create table if not exists public.project_results (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  explore_data jsonb not null default '{}'::jsonb,
  plan_data jsonb not null default '{}'::jsonb,
  alloc_data jsonb not null default '{}'::jsonb,
  design_data jsonb not null default '{}'::jsonb,
  sim_history jsonb not null default '[]'::jsonb,
  create_data jsonb not null default '{}'::jsonb,
  improve_data jsonb not null default '{}'::jsonb,
  present_data jsonb not null default '{}'::jsonb,
  lkpd_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 6. PRESENTATIONS (Sesi Mode Presentasi Kelas yang dikontrol Guru pada Laptop / PID)
create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  is_active boolean not null default false,
  teacher_notes text,
  presented_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.groups enable row level security;
alter table public.projects enable row level security;
alter table public.project_results enable row level security;
alter table public.presentations enable row level security;

-- Kebijakan Guru (Menggunakan Supabase Auth auth.uid())
create policy "Guru membaca dan mengubah profil sendiri"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Guru mengelola kelas miliknya sendiri"
  on public.classes for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

create policy "Guru mengelola kelompok pada kelas miliknya"
  on public.groups for all
  using (
    exists (
      select 1 from public.classes c
      where c.id = groups.class_id and c.teacher_id = auth.uid()
    )
  );

create policy "Guru memantau seluruh proyek pada kelas miliknya"
  on public.projects for select
  using (
    exists (
      select 1 from public.classes c
      where c.id = projects.class_id and c.teacher_id = auth.uid()
    )
  );

create policy "Guru membaca hasil proyek pada kelas miliknya"
  on public.project_results for select
  using (
    exists (
      select 1 from public.projects p
      join public.classes c on c.id = p.class_id
      where p.id = project_results.project_id and c.teacher_id = auth.uid()
    )
  );

create policy "Guru mengelola presentasi kelas miliknya"
  on public.presentations for all
  using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- Fungsi RPC Aman untuk Akses Siswa dengan KODE KELAS + KODE KELOMPOK
-- Siswa tidak menggunakan login email individual dan tidak bisa melihat kelompok lain.
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
  members text
)
language sql
security definer
as $$
  select
    c.id as class_id,
    c.class_name,
    c.class_code,
    g.id as group_id,
    g.group_name,
    g.group_code,
    g.members
  from public.classes c
  join public.groups g on g.class_id = c.id
  where upper(trim(c.class_code)) = upper(trim(p_class_code))
    and upper(trim(g.group_code)) = upper(trim(p_group_code))
  limit 1;
$$;
`;
