import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSalt,
  hashPassword,
  verifyPassword,
  generateClassCode,
  generateGroupCode,
  validateStudentAccess,
  getClassImpact,
  getGroupImpact,
  getProjectImpact,
  updateClassById,
  deleteClassById,
  updateGroupById,
  deleteGroupById,
  updateProjectById,
  resetProjectProgressById,
  deleteProjectById,
} from './access';
import { sameGroup, newProject, loadAll } from './storage';
import { StoredData, ClassRoom, StudentGroup } from '../types';

test('generateClassCode generates AQUA-5A-26 and increments on collision', () => {
  const code1 = generateClassCode('5A', []);
  assert.equal(code1, 'AQUA-5A-26');

  const code2 = generateClassCode('Kelas 5A', ['AQUA-5A-26']);
  assert.equal(code2, 'AQUA-5A-27');
});

test('generateGroupCode generates LUMBA-01, HIU-01, PENYU-01, GURITA-01 and increments on collision', () => {
  const existing: string[] = [];

  const g1 = generateGroupCode('Kelompok Lumba-Lumba', existing);
  assert.equal(g1, 'LUMBA-01');
  existing.push(g1);

  const g2 = generateGroupCode('Kelompok Hiu', existing);
  assert.equal(g2, 'HIU-01');
  existing.push(g2);

  const g3 = generateGroupCode('Kelompok Penyu', existing);
  assert.equal(g3, 'PENYU-01');
  existing.push(g3);

  const g4 = generateGroupCode('Kelompok Gurita', existing);
  assert.equal(g4, 'GURITA-01');
  existing.push(g4);

  const g5 = generateGroupCode('Lumba-Lumba', existing);
  assert.equal(g5, 'LUMBA-02');
});

test('hashPassword and verifyPassword use salted SHA-256 and never store plain text', async () => {
  const salt = createSalt();
  const plain = 'RahasiaGuru123';
  const hashed = await hashPassword(plain, salt);

  assert.notEqual(hashed, plain);
  assert.equal(hashed.length, 64);
  assert.equal(await verifyPassword(plain, salt, hashed), true);
  assert.equal(await verifyPassword('SalahSandi', salt, hashed), false);
});

test('validateStudentAccess validates class code + group code relationship strictly', () => {
  const classes: ClassRoom[] = [
    {
      id: 'cls-5a',
      teacherId: 't-1',
      name: '5A',
      code: 'AQUA-5A-26',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'cls-5b',
      teacherId: 't-1',
      name: '5B',
      code: 'AQUA-5B-26',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const groups: StudentGroup[] = [
    {
      id: 'grp-lumba-5a',
      classId: 'cls-5a',
      className: '5A',
      classCode: 'AQUA-5A-26',
      name: 'Kelompok Lumba-Lumba',
      code: 'LUMBA-01',
      codeHash: 'hash-lumba',
      members: 'Aisyah, Bima',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'grp-camar-5b',
      classId: 'cls-5b',
      className: '5B',
      classCode: 'AQUA-5B-26',
      name: 'Kelompok Camar',
      code: 'CAMAR-01',
      codeHash: 'hash-camar',
      members: 'Citra, Dimas',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  // Valid login for 5A + LUMBA-01
  const okRes = validateStudentAccess(classes, groups, 'aqua-5a-26', 'lumba-01');
  assert.equal(okRes.ok, true);
  assert.equal(okRes.session?.kelas, '5A');
  assert.equal(okRes.session?.name, 'Kelompok Lumba-Lumba');
  assert.equal(okRes.session?.groupCode, 'LUMBA-01');

  // Invalid class code
  const badClass = validateStudentAccess(classes, groups, 'AQUA-9Z-99', 'LUMBA-01');
  assert.equal(badClass.ok, false);
  assert.ok(badClass.error?.includes('Kode Kelas tidak ditemukan'));

  // Group belongs to 5B, but student entered class 5A
  const crossClass = validateStudentAccess(classes, groups, 'AQUA-5A-26', 'CAMAR-01');
  assert.equal(crossClass.ok, false);
  assert.ok(crossClass.error?.includes('terdaftar di kelas lain'));

  // Group isolation via sameGroup
  const sess5A = okRes.session!;
  const otherGroupInfo = {
    groupId: 'grp-camar-5b',
    classId: 'cls-5b',
    classCode: 'AQUA-5B-26',
    groupCode: 'CAMAR-01',
    kelas: '5B',
    name: 'Kelompok Camar',
    members: 'Citra, Dimas',
    codeHash: 'hash-camar',
  };
  assert.equal(sameGroup(sess5A, sess5A), true);
  assert.equal(sameGroup(otherGroupInfo, sess5A), false);
});

test('updateClassById and deleteClassById operate by unique ID, preserve Kode Kelas, and propagate across groups, projects, and session', () => {
  const base = loadAll();
  const cls5A: ClassRoom = {
    id: 'cls-5a',
    teacherId: 't-1',
    name: '5A',
    code: 'AQUA-5A-26',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const cls5B: ClassRoom = {
    id: 'cls-5b',
    teacherId: 't-1',
    name: '5B',
    code: 'AQUA-5B-26',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const grpLumba: StudentGroup = {
    id: 'grp-lumba',
    classId: 'cls-5a',
    className: '5A',
    classCode: 'AQUA-5A-26',
    name: 'Kelompok Lumba-Lumba',
    code: 'LUMBA-01',
    codeHash: 'h1',
    members: 'Aisyah, Bima',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const grpHiu: StudentGroup = {
    id: 'grp-hiu',
    classId: 'cls-5b',
    className: '5B',
    classCode: 'AQUA-5B-26',
    name: 'Kelompok Hiu',
    code: 'HIU-01',
    codeHash: 'h2',
    members: 'Citra, Dimas',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const projLumba = newProject({
    caseId: 'aquacity',
    title: 'Proyek Lumba',
    group: {
      groupId: 'grp-lumba',
      classId: 'cls-5a',
      classCode: 'AQUA-5A-26',
      groupCode: 'LUMBA-01',
      kelas: '5A',
      name: 'Kelompok Lumba-Lumba',
      members: 'Aisyah, Bima',
      codeHash: 'h1',
    },
  });
  const projHiu = newProject({
    caseId: 'aquacity',
    title: 'Proyek Hiu',
    group: {
      groupId: 'grp-hiu',
      classId: 'cls-5b',
      classCode: 'AQUA-5B-26',
      groupCode: 'HIU-01',
      kelas: '5B',
      name: 'Kelompok Hiu',
      members: 'Citra, Dimas',
      codeHash: 'h2',
    },
  });

  const data: StoredData = {
    ...base,
    classes: [cls5A, cls5B],
    groups: [grpLumba, grpHiu],
    projects: [projLumba, projHiu],
  };

  const impact5A = getClassImpact(data, 'cls-5a');
  assert.equal(impact5A.groupCount, 1);
  assert.equal(impact5A.projectCount, 1);

  // Edit class 5A -> 5A Unggulan
  const edited = updateClassById(
    data,
    projLumba.group,
    'cls-5a',
    '5A Unggulan'
  );
  const updatedCls5A = edited.data.classes.find((c) => c.id === 'cls-5a')!;
  assert.equal(updatedCls5A.name, '5A Unggulan');
  assert.equal(updatedCls5A.code, 'AQUA-5A-26'); // Kode Kelas stays identical
  assert.equal(
    edited.data.groups.find((g) => g.id === 'grp-lumba')?.className,
    '5A Unggulan'
  );
  assert.equal(
    edited.data.projects.find((p) => p.id === projLumba.id)?.group.kelas,
    '5A Unggulan'
  );
  assert.equal(edited.session?.kelas, '5A Unggulan');
  // Other class untouched
  assert.equal(
    edited.data.classes.find((c) => c.id === 'cls-5b')?.name,
    '5B'
  );

  // Delete class 5A by ID
  const deleted = deleteClassById(edited.data, edited.session, 'cls-5a');
  assert.equal(deleted.data.classes.length, 1);
  assert.equal(deleted.data.classes[0].id, 'cls-5b');
  assert.equal(deleted.data.groups.length, 1);
  assert.equal(deleted.data.groups[0].id, 'grp-hiu');
  assert.equal(deleted.data.projects.length, 1);
  assert.equal(deleted.data.projects[0].id, projHiu.id);
  assert.equal(deleted.session, null);
});

test('updateGroupById and deleteGroupById operate by unique ID, preserve Kode Kelompok, and keep parent class intact', () => {
  const base = loadAll();
  const cls5A: ClassRoom = {
    id: 'cls-5a',
    teacherId: 't-1',
    name: '5A',
    code: 'AQUA-5A-26',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const grp1: StudentGroup = {
    id: 'grp-1',
    classId: 'cls-5a',
    className: '5A',
    classCode: 'AQUA-5A-26',
    name: 'Kelompok Lumba-Lumba',
    code: 'LUMBA-01',
    codeHash: 'h1',
    members: 'Aisyah, Bima',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const grp2: StudentGroup = {
    id: 'grp-2',
    classId: 'cls-5a',
    className: '5A',
    classCode: 'AQUA-5A-26',
    name: 'Kelompok Hiu',
    code: 'HIU-01',
    codeHash: 'h2',
    members: 'Citra',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const proj1 = newProject({
    caseId: 'aquacity',
    title: 'Proyek Lumba',
    group: {
      groupId: 'grp-1',
      classId: 'cls-5a',
      classCode: 'AQUA-5A-26',
      groupCode: 'LUMBA-01',
      kelas: '5A',
      name: 'Kelompok Lumba-Lumba',
      members: 'Aisyah, Bima',
      codeHash: 'h1',
    },
  });

  const data: StoredData = {
    ...base,
    classes: [cls5A],
    groups: [grp1, grp2],
    projects: [proj1],
  };

  assert.equal(getGroupImpact(data, 'grp-1').projectCount, 1);
  assert.equal(getGroupImpact(data, 'grp-2').projectCount, 0);

  // Edit group 1 name & members -> Kode Kelompok LUMBA-01 stays identical
  const edited = updateGroupById(
    data,
    proj1.group,
    'grp-1',
    'Kelompok Lumba-Lumba Hebat',
    'Aisyah, Bima, Edo',
    '2026-01-02T00:00:00.000Z'
  );
  const updatedGrp1 = edited.data.groups.find((g) => g.id === 'grp-1')!;
  assert.equal(updatedGrp1.name, 'Kelompok Lumba-Lumba Hebat');
  assert.equal(updatedGrp1.members, 'Aisyah, Bima, Edo');
  assert.equal(updatedGrp1.code, 'LUMBA-01');
  assert.equal(edited.data.projects[0].group.name, 'Kelompok Lumba-Lumba Hebat');
  assert.equal(edited.data.projects[0].group.members, 'Aisyah, Bima, Edo');
  assert.equal(edited.session?.name, 'Kelompok Lumba-Lumba Hebat');
  // Sibling group 2 untouched
  assert.equal(edited.data.groups.find((g) => g.id === 'grp-2')?.name, 'Kelompok Hiu');

  // Delete group 1 -> parent class cls-5a and sibling grp-2 remain intact
  const deleted = deleteGroupById(edited.data, edited.session, 'grp-1');
  assert.equal(deleted.data.classes.length, 1);
  assert.equal(deleted.data.classes[0].id, 'cls-5a');
  assert.equal(deleted.data.groups.length, 1);
  assert.equal(deleted.data.groups[0].id, 'grp-2');
  assert.equal(deleted.data.projects.length, 0);
  assert.equal(deleted.session, null);
});

test('updateProjectById, resetProjectProgressById, and deleteProjectById operate strictly on the selected project ID without affecting classes, groups, or other projects', () => {
  const base = loadAll();
  const cls5A: ClassRoom = {
    id: 'cls-5a',
    teacherId: 't-1',
    name: '5A',
    code: 'AQUA-5A-26',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const grpLumba: StudentGroup = {
    id: 'grp-lumba',
    classId: 'cls-5a',
    className: '5A',
    classCode: 'AQUA-5A-26',
    name: 'Kelompok Lumba-Lumba',
    code: 'LUMBA-01',
    codeHash: 'h1',
    members: 'Aisyah, Bima',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const proj1 = newProject({
    caseId: 'aquacity',
    title: 'Proyek Air Bersih 1',
    group: {
      groupId: 'grp-lumba',
      classId: 'cls-5a',
      classCode: 'AQUA-5A-26',
      groupCode: 'LUMBA-01',
      kelas: '5A',
      name: 'Kelompok Lumba-Lumba',
      members: 'Aisyah, Bima',
      codeHash: 'h1',
    },
  });
  // Add progress, calculation, and simulation to proj1
  proj1.stageDone = { 1: true, 2: true, 3: true };
  proj1.explore.q1 = 'Air sangat penting untuk rumah dan sekolah.';
  proj1.plan.savedAt = '2026-01-02T00:00:00.000Z';
  proj1.alloc.normal.rumah = 450;
  proj1.sim.history.push({
    scen: 'normal',
    supply: 1200,
    total: 1100,
    left: 100,
    overall: 'ok',
    text: 'Semua fasilitas tercukupi.',
    at: '2026-01-02T01:00:00.000Z',
  });

  const proj2 = newProject({
    caseId: 'aquacity',
    title: 'Proyek Cadangan Kelompok Lumba',
    group: { ...proj1.group },
  });

  const initialData: StoredData = {
    ...base,
    classes: [cls5A],
    groups: [grpLumba],
    projects: [proj1, proj2],
    currentId: proj1.id,
  };

  const impact1 = getProjectImpact(proj1);
  assert.equal(impact1.hasProgress, true);
  assert.equal(impact1.doneStages, 3);
  assert.equal(impact1.simCount, 1);
  assert.equal(impact1.hasCalc, true);

  const impact2 = getProjectImpact(proj2);
  assert.equal(impact2.hasProgress, false);

  // 1. Edit proj1 title and mission -> only proj1 changes; class, group, and proj2 stay untouched
  const afterEdit = updateProjectById(
    initialData,
    proj1.id,
    { title: 'Proyek Distribusi Utama', caseId: 'desa' },
    '2026-01-03T00:00:00.000Z'
  );
  const editedP1 = afterEdit.projects.find((p) => p.id === proj1.id)!;
  const untouchedP2 = afterEdit.projects.find((p) => p.id === proj2.id)!;
  assert.equal(editedP1.title, 'Proyek Distribusi Utama');
  assert.equal(editedP1.caseId, 'desa');
  assert.equal(editedP1.caseName, 'Desa Kekeringan');
  assert.equal(editedP1.group.name, 'Kelompok Lumba-Lumba');
  assert.equal(untouchedP2.title, 'Proyek Cadangan Kelompok Lumba');
  assert.equal(untouchedP2.caseId, 'aquacity');
  assert.equal(afterEdit.classes.length, 1);
  assert.equal(afterEdit.groups.length, 1);

  // 2. Reset progress on proj1 -> clears stageDone, sim, plan, explore while keeping id, title, caseId, and group
  const afterReset = resetProjectProgressById(
    afterEdit,
    proj1.id,
    '2026-01-04T00:00:00.000Z'
  );
  const resetP1 = afterReset.projects.find((p) => p.id === proj1.id)!;
  assert.equal(resetP1.id, proj1.id);
  assert.equal(resetP1.title, 'Proyek Distribusi Utama');
  assert.equal(resetP1.caseId, 'desa');
  assert.equal(resetP1.group.groupCode, 'LUMBA-01');
  assert.equal(getProjectImpact(resetP1).hasProgress, false);
  assert.equal(resetP1.sim.history.length, 0);
  assert.equal(resetP1.plan.savedAt, null);

  // 3. Delete proj1 -> removes only proj1; class cls5A, group grpLumba, and proj2 remain intact
  const afterDelete = deleteProjectById(afterReset, proj1.id);
  assert.equal(afterDelete.projects.length, 1);
  assert.equal(afterDelete.projects[0].id, proj2.id);
  assert.equal(afterDelete.currentId, null);
  assert.equal(afterDelete.classes.length, 1);
  assert.equal(afterDelete.classes[0].id, 'cls-5a');
  assert.equal(afterDelete.groups.length, 1);
  assert.equal(afterDelete.groups[0].id, 'grp-lumba');
});


