import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCode, generateClassCode, generateGroupCode } from '../utils/access';
import { isTrialItem } from '../utils/storage';
import {
  parseMembersInput,
  formatMembersOutput,
  evaluateClassAndGroupRows,
  classifySupabaseError,
} from './classGroupService';

const SAMPLE_CLASSES = [
  {
    id: 'cls-aqua-5-26',
    teacher_id: 'teacher-1',
    class_name: 'Kelas 5',
    class_code: 'AQUA-5-26',
    created_at: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'cls-aqua-5b-26',
    teacher_id: 'teacher-1',
    class_name: 'Kelas 5B',
    class_code: 'AQUA-5B-26',
    created_at: '2026-03-01T08:00:00.000Z',
  },
];

const SAMPLE_GROUPS = [
  {
    id: 'grp-gurita-01',
    class_id: 'cls-aqua-5-26',
    group_name: 'Kelompok Gurita',
    group_code: 'GURITA-01',
    members: ['Dina', 'Edo', 'Fajar'],
    created_at: '2026-03-01T08:05:00.000Z',
  },
  {
    id: 'grp-hiu-01',
    class_id: 'cls-aqua-5-26',
    group_name: 'Kelompok Hiu',
    group_code: 'HIU-01',
    members: ['Aisyah', 'Bima', 'Rara'],
    created_at: '2026-03-01T08:10:00.000Z',
  },
  {
    id: 'grp-lumba-01',
    class_id: 'cls-aqua-5b-26',
    group_name: 'Kelompok Lumba-Lumba',
    group_code: 'LUMBA-01',
    members: ['Siti', 'Budi'],
    created_at: '2026-03-01T08:15:00.000Z',
  },
];

test('normalizeCode trims spaces, uppercases, and preserves hyphens and numbers', () => {
  assert.equal(normalizeCode('  aqua-5-26  '), 'AQUA-5-26');
  assert.equal(normalizeCode(' gurita-01 '), 'GURITA-01');
  assert.equal(normalizeCode('hiu-01'), 'HIU-01');
  assert.equal(normalizeCode('AQUA–5–26'), 'AQUA-5-26');
});

test('generateClassCode and generateGroupCode produce expected codes for Kelas 5, Gurita, and Hiu', () => {
  assert.equal(generateClassCode('Kelas 5', []), 'AQUA-5-26');
  assert.equal(generateGroupCode('Gurita', []), 'GURITA-01');
  assert.equal(generateGroupCode('Hiu', ['GURITA-01']), 'HIU-01');
  assert.equal(generateGroupCode('Hiu', ['GURITA-01', 'HIU-01']), 'HIU-02');
});

test('isTrialItem does NOT flag Kelas 5, AQUA-5-26, GURITA-01, or HIU-01 as trial data', () => {
  assert.equal(isTrialItem('Kelas 5'), false);
  assert.equal(isTrialItem('AQUA-5-26'), false);
  assert.equal(isTrialItem('GURITA-01'), false);
  assert.equal(isTrialItem('HIU-01'), false);
  assert.equal(isTrialItem('Aisyah, Bima, Rara'), false);
  assert.equal(isTrialItem('AQUA1'), true);
});

test('parseMembersInput and formatMembersOutput handle text[] arrays properly', () => {
  assert.deepEqual(parseMembersInput('Aisyah, Bima, Rara'), ['Aisyah', 'Bima', 'Rara']);
  assert.equal(formatMembersOutput(['Aisyah', 'Bima', 'Rara']), 'Aisyah, Bima, Rara');
});

test('Scenario 1: AQUA-5-26 + GURITA-01 succeeds and links to Kelas 5', () => {
  const res = evaluateClassAndGroupRows(
    normalizeCode('  aqua-5-26 '),
    normalizeCode(' gurita-01 '),
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(res.ok, true);
  assert.equal(res.classRoom?.code, 'AQUA-5-26');
  assert.equal(res.classRoom?.id, 'cls-aqua-5-26');
  assert.equal(res.group?.code, 'GURITA-01');
  assert.equal(res.group?.classId, 'cls-aqua-5-26');
  assert.equal(res.group?.members, 'Dina, Edo, Fajar');
});

test('Scenario 2: AQUA-5-26 + HIU-01 succeeds and links to Kelas 5', () => {
  const res = evaluateClassAndGroupRows(
    normalizeCode('AQUA-5-26'),
    normalizeCode('HIU-01'),
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(res.ok, true);
  assert.equal(res.classRoom?.code, 'AQUA-5-26');
  assert.equal(res.group?.code, 'HIU-01');
  assert.equal(res.group?.classId, 'cls-aqua-5-26');
  assert.equal(res.group?.members, 'Aisyah, Bima, Rara');
});

test('Error Messages: Distinguishes all 5 required error states accurately', () => {
  // 1. Kode kelas tidak ditemukan
  const errClass = evaluateClassAndGroupRows(
    'AQUA-99-26',
    'GURITA-01',
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(errClass.ok, false);
  assert.equal(errClass.errorCode, 'CLASS_NOT_FOUND');
  assert.match(errClass.error || '', /Kode kelas tidak ditemukan/i);

  // 2. Kode kelompok tidak ditemukan
  const errGroup = evaluateClassAndGroupRows(
    'AQUA-5-26',
    'PAUS-99',
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(errGroup.ok, false);
  assert.equal(errGroup.errorCode, 'GROUP_NOT_FOUND');
  assert.match(errGroup.error || '', /Kode kelompok tidak ditemukan/i);

  // 3. Kelompok bukan bagian dari kelas tersebut
  const errWrongClass = evaluateClassAndGroupRows(
    'AQUA-5-26',
    'LUMBA-01',
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(errWrongClass.ok, false);
  assert.equal(errWrongClass.errorCode, 'GROUP_WRONG_CLASS');
  assert.match(errWrongClass.error || '', /Kelompok bukan bagian dari kelas tersebut/i);

  // 4. Koneksi Supabase bermasalah
  const errNet = classifySupabaseError({ message: 'Failed to fetch' });
  assert.equal(errNet.errorCode, 'SUPABASE_CONNECTION_ERROR');
  assert.match(errNet.error, /Koneksi Supabase bermasalah/i);

  // 5. Akses data ditolak oleh RLS
  const errRls = classifySupabaseError({
    code: '42501',
    message: 'new row violates row-level security policy',
  });
  assert.equal(errRls.errorCode, 'RLS_ACCESS_DENIED');
  assert.match(errRls.error, /Akses data ditolak oleh RLS/i);
});
