import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://ddaudswxkxzmpqvoiuss.supabase.co';

export const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkYXVkc3d4a3h6bXBxdm9pdXNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0OTczNTEsImV4cCI6MjEwNTA3MzM1MX0.agwd-zj-stiF5we-liIDXlVQ23RRQ_ssEcQrzm6ccME';

/**
 * Client resmi Supabase untuk Aqua Engineer Math
 * Digunakan untuk Supabase Auth (Akun Guru) dan sinkronisasi data profil/kelas/kelompok/proyek.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
