import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isTrialItem, cleanTrialDataFromStore } from './storage';

describe('Trial Data Cleaner', () => {
  it('correctly identifies trial items (Kelas 5, AQUA1, yeni, eren, devaro)', () => {
    assert.strictEqual(isTrialItem('Kelas 5'), true);
    assert.strictEqual(isTrialItem('AQUA1'), true);
    assert.strictEqual(isTrialItem('yeni, eren, devaro'), true);
    assert.strictEqual(isTrialItem('Eren'), true);
    assert.strictEqual(isTrialItem('Devaro'), true);
    assert.strictEqual(isTrialItem('Kelompok Lumba-Lumba Resmi'), false);
    assert.strictEqual(isTrialItem('Kelas 6B'), false);
  });

  it('filters out trial classes, trial groups, and trial projects while preserving teachers and settings', () => {
    const mockStore = {
      teachers: [
        { id: 't1', name: 'Bu Guru', email: 'guru@sekolah.sch.id', createdAt: '2026-01-01' },
      ],
      classes: [
        { id: 'c-trial', name: 'Kelas 5', code: 'AQUA-5A-26', createdAt: '2026-01-01' },
        { id: 'c-real', name: 'Kelas 5B Resmi', code: 'AQUA-5B-99', createdAt: '2026-01-02' },
      ],
      groups: [
        {
          id: 'g-trial',
          classId: 'c-trial',
          name: 'AQUA1',
          code: 'AQUA1',
          members: 'yeni, eren, devaro',
          createdAt: '2026-01-01',
        },
        {
          id: 'g-real',
          classId: 'c-real',
          name: 'Kelompok Hiu',
          code: 'HIU-01',
          members: 'Budi, Siti',
          createdAt: '2026-01-02',
        },
      ],
      projects: [
        {
          id: 'p-trial',
          caseId: 'aquacity',
          caseName: 'Aqua City',
          title: 'Proyek Uji Coba',
          group: {
            name: 'AQUA1',
            kelas: 'Kelas 5',
            members: 'yeni, eren, devaro',
            classId: 'c-trial',
            groupId: 'g-trial',
          },
          stageDone: {},
        },
        {
          id: 'p-real',
          caseId: 'aquacity',
          caseName: 'Aqua City',
          title: 'Proyek Resmi',
          group: {
            name: 'Kelompok Hiu',
            kelas: 'Kelas 5B Resmi',
            members: 'Budi, Siti',
            classId: 'c-real',
            groupId: 'g-real',
          },
          stageDone: {},
        },
      ],
      settings: {
        sb: {
          url: 'https://ddaudswxkxzmpqvoiuss.supabase.co',
          key: 'valid-key',
        },
      },
    };

    const cleaned = cleanTrialDataFromStore(mockStore);

    // Teachers & Supabase settings must be preserved
    assert.strictEqual(cleaned.teachers.length, 1);
    assert.strictEqual(cleaned.teachers[0].id, 't1');
    assert.strictEqual(cleaned.settings.sb.url, 'https://ddaudswxkxzmpqvoiuss.supabase.co');

    // Trial class & group must be removed
    assert.strictEqual(cleaned.classes.length, 1);
    assert.strictEqual(cleaned.classes[0].id, 'c-real');
    assert.strictEqual(cleaned.classes[0].name, 'Kelas 5B Resmi');

    assert.strictEqual(cleaned.groups.length, 1);
    assert.strictEqual(cleaned.groups[0].id, 'g-real');
    assert.strictEqual(cleaned.groups[0].name, 'Kelompok Hiu');

    // Trial project must be removed
    assert.strictEqual(cleaned.projects.length, 1);
    assert.strictEqual(cleaned.projects[0].id, 'p-real');
  });

  it('returns clean empty arrays when all data was trial data', () => {
    const mockTrialOnlyStore = {
      teachers: [{ id: 't1', name: 'Bu Guru', email: 'guru@test.com' }],
      classes: [{ id: 'c1', name: 'Kelas 5', code: 'AQUA-5A' }],
      groups: [{ id: 'g1', classId: 'c1', name: 'AQUA1', code: 'AQUA1', members: 'yeni, eren, devaro' }],
      projects: [{ id: 'p1', group: { name: 'AQUA1', members: 'yeni, eren, devaro', kelas: 'Kelas 5' } }],
      settings: { sb: { url: 'https://test.supabase.co', key: 'key' } },
    };

    const cleaned = cleanTrialDataFromStore(mockTrialOnlyStore);

    assert.strictEqual(cleaned.classes.length, 0);
    assert.strictEqual(cleaned.groups.length, 0);
    assert.strictEqual(cleaned.projects.length, 0);
    assert.strictEqual(cleaned.teachers.length, 1);
    assert.strictEqual(cleaned.settings.sb.url, 'https://test.supabase.co');
  });
});
