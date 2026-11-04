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
import {
  decodeStudentTokenPayload,
  isStudentTokenExpired,
  canStudentTokenAccessGroup,
  canStudentTokenAccessTeacherDashboard,
  isValidStudentSession,
} from '../utils/studentToken';

process.env.AEM_SKIP_LISTEN = 'true';

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

test('Scenario A & B: AQUA-5-26 + GURITA-01 and AQUA-5-26 + HIU-01 succeed and link to Kelas 5', () => {
  const resGurita = evaluateClassAndGroupRows(
    normalizeCode('  aqua-5-26 '),
    normalizeCode(' gurita-01 '),
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(resGurita.ok, true);
  assert.equal(resGurita.classRoom?.code, 'AQUA-5-26');
  assert.equal(resGurita.group?.code, 'GURITA-01');

  const resHiu = evaluateClassAndGroupRows(
    normalizeCode('AQUA-5-26'),
    normalizeCode('HIU-01'),
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(resHiu.ok, true);
  assert.equal(resHiu.classRoom?.code, 'AQUA-5-26');
  assert.equal(resHiu.group?.code, 'HIU-01');
  assert.equal(resHiu.group?.members, 'Aisyah, Bima, Rara');
});

test('Security & Token Scoping: Student token for GURITA-01 cannot access HIU-01 or Teacher Dashboard', async () => {
  const { signStudentToken, verifyStudentTokenOnServer } = await import('../../server');
  const now = Date.now();

  const guritaSigned = signStudentToken({
    sub: 'grp-aqua-5-26-gurita-01',
    classId: 'cls-aqua-5-26',
    classCode: 'AQUA-5-26',
    groupId: 'grp-aqua-5-26-gurita-01',
    groupCode: 'GURITA-01',
    nowMs: now,
  });

  // Verify token signature on server
  const verified = verifyStudentTokenOnServer(guritaSigned.token, now + 1000);
  assert.equal(verified.ok, true);
  assert.equal(verified.payload?.groupCode, 'GURITA-01');
  assert.equal(verified.payload?.role, 'student');

  // Decode on client
  const decoded = decodeStudentTokenPayload(guritaSigned.token);
  assert.ok(decoded);
  assert.equal(isStudentTokenExpired(decoded, now + 1000), false);

  // GURITA-01 CAN access GURITA-01
  assert.equal(
    canStudentTokenAccessGroup(decoded, 'grp-aqua-5-26-gurita-01', 'GURITA-01', now + 1000),
    true
  );

  // GURITA-01 CANNOT access HIU-01
  assert.equal(
    canStudentTokenAccessGroup(decoded, 'grp-aqua-5-26-hiu-01', 'HIU-01', now + 1000),
    false
  );

  // Student token CANNOT access Teacher Dashboard
  assert.equal(canStudentTokenAccessTeacherDashboard(decoded), false);

  // Tampered token is rejected by server
  const tampered = guritaSigned.token.slice(0, -4) + 'XXXX';
  assert.equal(verifyStudentTokenOnServer(tampered, now + 1000).ok, false);

  // Expired token is rejected by server and client
  assert.equal(
    verifyStudentTokenOnServer(guritaSigned.token, guritaSigned.expiresAt + 1).ok,
    false
  );
  assert.equal(isStudentTokenExpired(decoded, guritaSigned.expiresAt + 1), true);

  // Student session remains valid independently of teacher login/logout
  assert.equal(
    isValidStudentSession(
      {
        groupId: 'grp-aqua-5-26-gurita-01',
        classId: 'cls-aqua-5-26',
        classCode: 'AQUA-5-26',
        groupCode: 'GURITA-01',
        kelas: 'Kelas 5',
        name: 'Kelompok Gurita',
        members: 'Dina, Edo',
        codeHash: 'GURITA-01',
        studentToken: guritaSigned.token,
        expiresAt: guritaSigned.expiresAt,
        role: 'student',
      },
      now + 5000
    ),
    true
  );
});

test('Error Messages: Distinguishes all 5 required error states accurately', () => {
  const errClass = evaluateClassAndGroupRows(
    'AQUA-99-26',
    'GURITA-01',
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(errClass.ok, false);
  assert.equal(errClass.errorCode, 'CLASS_NOT_FOUND');
  assert.match(errClass.error || '', /Kode kelas tidak ditemukan/i);

  const errGroup = evaluateClassAndGroupRows(
    'AQUA-5-26',
    'PAUS-99',
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(errGroup.ok, false);
  assert.equal(errGroup.errorCode, 'GROUP_NOT_FOUND');
  assert.match(errGroup.error || '', /Kode kelompok tidak ditemukan/i);

  const errWrongClass = evaluateClassAndGroupRows(
    'AQUA-5-26',
    'LUMBA-01',
    SAMPLE_CLASSES,
    SAMPLE_GROUPS
  );
  assert.equal(errWrongClass.ok, false);
  assert.equal(errWrongClass.errorCode, 'GROUP_WRONG_CLASS');
  assert.match(errWrongClass.error || '', /Kelompok bukan bagian dari kelas tersebut/i);

  const errNet = classifySupabaseError({ message: 'Failed to fetch' });
  assert.equal(errNet.errorCode, 'SUPABASE_CONNECTION_ERROR');
  assert.match(errNet.error, /Koneksi Supabase bermasalah/i);

  const errRls = classifySupabaseError({
    code: '42501',
    message: 'new row violates row-level security policy',
  });
  assert.equal(errRls.errorCode, 'RLS_ACCESS_DENIED');
  assert.match(errRls.error, /Akses data ditolak oleh RLS/i);
});
