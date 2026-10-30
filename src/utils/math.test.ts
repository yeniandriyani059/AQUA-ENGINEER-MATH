import test from 'node:test';
import assert from 'node:assert/strict';
import { pc, ek, demandOf, reachable, evaluate, practiceOf } from './math';
import { caseById } from '../data/cases';
import { Project } from '../types';

test('pc calculates percentage rounded up correctly', () => {
  assert.equal(pc(400, 60), 240);
  assert.equal(pc(250, 80), 200);
  assert.equal(pc(90, 100), 90);
  assert.equal(pc(125, 33), 42); // 41.25 -> 42
});

test('ek sorts and joins facility pair keys deterministically', () => {
  assert.equal(ek('tank', 'rumah'), 'rumah|tank');
  assert.equal(ek('sekolah', 'puskesmas'), 'puskesmas|sekolah');
  assert.equal(ek('puskesmas', 'sekolah'), 'puskesmas|sekolah');
});

test('demandOf sums all facility needs for cases', () => {
  const aqua = caseById('aquacity');
  assert.equal(demandOf(aqua), 1000); // 400 + 200 + 250 + 150 = 1000
  const hemat = caseById('hemat');
  assert.equal(demandOf(hemat), 490); // 180 + 120 + 100 + 90 = 490
});

test('reachable correctly traverses pipe network graph from tank', () => {
  const design = {
    pos: { tank: { x: 300, y: 75 }, rumah: { x: 90, y: 275 }, sekolah: { x: 225, y: 295 }, taman: { x: 380, y: 295 } },
    placed: { tank: true, rumah: true, sekolah: true, taman: true },
    edges: ['rumah|tank', 'puskesmas|tank', 'sekolah|tank'], // 'puskesmas' is not placed
    savedAt: null,
  };

  const normalReach = reachable(design, []);
  assert.equal(normalReach.has('tank'), true);
  assert.equal(normalReach.has('rumah'), true);
  assert.equal(normalReach.has('sekolah'), true);
  assert.equal(normalReach.has('taman'), false); // no edge to taman

  // Cut 'rumah|tank'
  const cutReach = reachable(design, ['rumah|tank']);
  assert.equal(cutReach.has('rumah'), false);
  assert.equal(cutReach.has('sekolah'), true);
});

test('evaluate verifies allocation rules and handles shortage scenarios', () => {
  const sampleProject: Project = {
    id: 'test-1',
    caseId: 'aquacity',
    caseName: 'Aqua City',
    title: 'Uji Coba',
    group: { kelas: '5A', name: 'Kelompok 1', members: 'A, B', codeHash: 'abc' },
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
    stageDone: {},
    explore: { q1: '', q2: '', q3: '', q4: '', q5: '' },
    plan: { practice: {}, notes: '', savedAt: null },
    alloc: {
      normal: { rumah: 400, sekolah: 200, puskesmas: 250, taman: 150 },
      kurang: { rumah: 320, sekolah: 160, puskesmas: 200, taman: 120 },
    },
    design: {
      pos: {},
      placed: { tank: true, rumah: true, sekolah: true, puskesmas: true, taman: true },
      edges: ['rumah|tank', 'sekolah|tank', 'puskesmas|tank', 'taman|tank'],
      savedAt: '2026-01-01T00:00:00Z',
    },
    sim: { history: [] },
    create: { checks: [] },
    improve: { fields: { masalah: '', awal: '', perubahan: '', hasil: '', kesimpulan: '' }, revisions: [] },
    present: { reflection: { r1: '', r2: '', r3: '', r4: '' }, savedAt: null },
    lkpd: {},
  };

  const normalEv = evaluate(sampleProject, 'normal', true);
  assert.equal(normalEv.overall, 'ok');
  assert.equal(normalEv.total, 1000);
  assert.equal(normalEv.left, 0);
  assert.equal(normalEv.over, false);

  const kurangEv = evaluate(sampleProject, 'kurang', true);
  assert.equal(kurangEv.overall, 'ok');
  assert.equal(kurangEv.total, 800);
  assert.equal(kurangEv.left, 0);

  // If over supply
  sampleProject.alloc.normal.rumah = 500;
  const badEv = evaluate(sampleProject, 'normal', false);
  assert.equal(badEv.overall, 'bad');
  assert.equal(badEv.over, true);
});

test('practiceOf generates 4 arithmetic practice questions for a mission', () => {
  const aqua = caseById('aquacity');
  const qs = practiceOf(aqua);
  assert.equal(qs.length, 4);
  assert.equal(qs[0].a, 1000);
  assert.equal(qs[1].a, 600);
});

