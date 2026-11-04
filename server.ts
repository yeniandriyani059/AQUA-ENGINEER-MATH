import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { supabase } from './src/lib/supabase';
import { STUDENT_TOKEN_TTL_MS, StudentTokenPayload } from './src/utils/studentToken';

interface MirrorClass {
  id: string;
  teacher_id: string;
  class_name: string;
  class_code: string;
  created_at: string;
}

interface MirrorGroup {
  id: string;
  class_id: string;
  group_name: string;
  group_code: string;
  members: string[];
  created_at: string;
  updated_at?: string;
}

interface MirrorStore {
  classes: MirrorClass[];
  student_groups: MirrorGroup[];
  projects: any[];
  updatedAt: string;
}

const MIRROR_FILE = path.resolve(process.cwd(), '.aem-supabase-mirror.json');
const TOKEN_SECRET =
  process.env.AEM_STUDENT_TOKEN_SECRET ||
  'aem-student-hmac-secret-2026-aqua-engineer-math';

const SEED_MIRROR: MirrorStore = {
  classes: [
    {
      id: 'cls-aqua-5-26',
      teacher_id: 'teacher-supabase-sync',
      class_name: 'Kelas 5',
      class_code: 'AQUA-5-26',
      created_at: '2026-03-01T08:00:00.000Z',
    },
    {
      id: 'cls-aqua-51-26',
      teacher_id: 'teacher-supabase-sync',
      class_name: 'Kelas 51',
      class_code: 'AQUA-51-26',
      created_at: '2026-03-01T08:00:00.000Z',
    },
  ],
  student_groups: [
    {
      id: 'grp-aqua-5-26-gurita-01',
      class_id: 'cls-aqua-5-26',
      group_name: 'Kelompok Gurita',
      group_code: 'GURITA-01',
      members: ['Anggota Kelompok Gurita'],
      created_at: '2026-03-01T08:05:00.000Z',
      updated_at: '2026-03-01T08:05:00.000Z',
    },
    {
      id: 'grp-aqua-5-26-hiu-01',
      class_id: 'cls-aqua-5-26',
      group_name: 'Kelompok Hiu',
      group_code: 'HIU-01',
      members: ['Aisyah', 'Bima', 'Rara'],
      created_at: '2026-03-01T08:10:00.000Z',
      updated_at: '2026-03-01T08:10:00.000Z',
    },
    {
      id: 'grp-aqua-51-26-hiu-01',
      class_id: 'cls-aqua-51-26',
      group_name: 'Kelompok Hiu',
      group_code: 'HIU-01',
      members: ['Aisyah', 'Bima', 'Rara'],
      created_at: '2026-03-01T08:15:00.000Z',
      updated_at: '2026-03-01T08:15:00.000Z',
    },
  ],
  projects: [],
  updatedAt: new Date().toISOString(),
};

export function normCode(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, '');
}

export function signStudentToken(payload: Omit<StudentTokenPayload, 'iat' | 'exp' | 'role'> & {
  nowMs?: number;
  ttlMs?: number;
}): { token: string; expiresAt: number; payload: StudentTokenPayload } {
  const iat = payload.nowMs ?? Date.now();
  const exp = iat + (payload.ttlMs ?? STUDENT_TOKEN_TTL_MS);
  const fullPayload: StudentTokenPayload = {
    sub: payload.sub,
    role: 'student',
    classId: payload.classId,
    classCode: normCode(payload.classCode),
    groupId: payload.groupId,
    groupCode: normCode(payload.groupCode),
    iat,
    exp,
  };
  const bodyB64 = Buffer.from(JSON.stringify(fullPayload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`aem-st-v1.${bodyB64}`)
    .digest('base64url');
  return {
    token: `aem-st-v1.${bodyB64}.${sig}`,
    expiresAt: exp,
    payload: fullPayload,
  };
}

export function verifyStudentTokenOnServer(
  rawToken?: string | null,
  nowMs: number = Date.now()
): { ok: boolean; error?: string; payload?: StudentTokenPayload } {
  if (!rawToken || typeof rawToken !== 'string') {
    return { ok: false, error: 'Token akses siswa tidak ditemukan.' };
  }
  const clean = rawToken.replace(/^Bearer\s+/i, '').trim();
  const parts = clean.split('.');
  if (parts.length !== 3 || parts[0] !== 'aem-st-v1') {
    return { ok: false, error: 'Format token akses siswa tidak valid.' };
  }

  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(`${parts[0]}.${parts[1]}`)
    .digest('base64url');

  const sigBuf = Buffer.from(parts[2]);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { ok: false, error: 'Tanda tangan kriptografi token akses siswa tidak sah.' };
  }

  try {
    const parsed = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    if (!parsed || parsed.role !== 'student' || !parsed.groupId || !parsed.classId) {
      return { ok: false, error: 'Payload token akses siswa tidak valid.' };
    }
    if (typeof parsed.exp !== 'number' || nowMs >= parsed.exp) {
      return { ok: false, error: 'Sesi token akses siswa telah kedaluwarsa. Silakan masuk kembali.' };
    }
    return { ok: true, payload: parsed as StudentTokenPayload };
  } catch {
    return { ok: false, error: 'Gagal membaca isi token akses siswa.' };
  }
}

function loadMirror(): MirrorStore {
  try {
    if (fs.existsSync(MIRROR_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(MIRROR_FILE, 'utf-8'));
      const classes: MirrorClass[] = Array.isArray(parsed.classes) ? parsed.classes : [];
      const student_groups: MirrorGroup[] = Array.isArray(parsed.student_groups)
        ? parsed.student_groups
        : [];
      const projects: any[] = Array.isArray(parsed.projects) ? parsed.projects : [];

      for (const sc of SEED_MIRROR.classes) {
        if (!classes.some((c) => normCode(c.class_code) === normCode(sc.class_code))) {
          classes.push(sc);
        }
      }
      for (const sg of SEED_MIRROR.student_groups) {
        const parentSeedClass = SEED_MIRROR.classes.find((c) => c.id === sg.class_id);
        const actualClass = parentSeedClass
          ? classes.find((c) => normCode(c.class_code) === normCode(parentSeedClass.class_code))
          : null;
        const targetClassId = actualClass ? actualClass.id : sg.class_id;

        if (
          !student_groups.some(
            (g) =>
              g.class_id === targetClassId &&
              normCode(g.group_code) === normCode(sg.group_code)
          )
        ) {
          student_groups.push({
            ...sg,
            class_id: targetClassId,
          });
        }
      }

      return {
        classes,
        student_groups,
        projects,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('[AEM Backend] Failed to read store file, using seed:', e);
  }
  saveMirror(SEED_MIRROR);
  return SEED_MIRROR;
}

function saveMirror(store: MirrorStore): void {
  try {
    fs.writeFileSync(MIRROR_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[AEM Backend] Failed to write store file:', e);
  }
}

function formatMembers(raw: string[] | string | null | undefined): string {
  if (!raw) return '';
  if (Array.isArray(raw)) {
    return raw.map((m) => String(m).trim()).filter(Boolean).join(', ');
  }
  return String(raw).trim();
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  /**
   * 1. ENDPOINT VALIDASI KODE SISWA DI SISI SERVER (POST /api/student/verify-code)
   * - Tidak memerlukan login Guru.
   * - Tidak pernah mengirimkan daftar seluruh kelas atau kelompok ke browser siswa.
   * - Hanya mengembalikan data 1 kelompok milik siswa yang tervalidasi beserta studentToken bertanda tangan HMAC.
   */
  app.post('/api/student/verify-code', async (req, res) => {
    const normClassCode = normCode(req.body?.classCode || '');
    const normGroupCode = normCode(req.body?.groupCode || '');

    if (!normClassCode) {
      res.status(400).json({
        ok: false,
        errorCode: 'EMPTY_INPUT',
        error: 'Masukkan Kode Kelas terlebih dahulu (contoh: AQUA-5-26).',
      });
      return;
    }

    if (!normGroupCode) {
      res.status(400).json({
        ok: false,
        errorCode: 'EMPTY_INPUT',
        error: 'Masukkan Kode Kelompok yang diberikan gurumu (contoh: GURITA-01 atau HIU-01).',
      });
      return;
    }

    // A. Coba panggil fungsi RPC SECURITY DEFINER di Supabase terlebih dahulu
    try {
      const { data: rpcRows, error: rpcErr } = await supabase.rpc('verify_student_group_access', {
        p_class_code: normClassCode,
        p_group_code: normGroupCode,
      });

      if (!rpcErr && Array.isArray(rpcRows) && rpcRows.length > 0) {
        const row = rpcRows[0];
        const cleanClassCode = normCode(row.class_code);
        const cleanGroupCode = normCode(row.group_code);
        const signed = signStudentToken({
          sub: row.group_id,
          classId: row.class_id,
          classCode: cleanClassCode,
          groupId: row.group_id,
          groupCode: cleanGroupCode,
        });

        const store = loadMirror();
        const groupProjects = store.projects.filter(
          (p) =>
            p?.group?.groupId === row.group_id ||
            (normCode(p?.group?.classCode) === cleanClassCode &&
              normCode(p?.group?.groupCode) === cleanGroupCode)
        );

        res.json({
          ok: true,
          source: 'supabase-rpc',
          studentToken: signed.token,
          expiresAt: signed.expiresAt,
          classRoom: {
            id: row.class_id,
            teacherId: row.teacher_id || '',
            name: row.class_name,
            code: cleanClassCode,
            createdAt: row.created_at || new Date().toISOString(),
          },
          group: {
            id: row.group_id,
            classId: row.class_id,
            className: row.class_name,
            classCode: cleanClassCode,
            name: row.group_name,
            code: cleanGroupCode,
            codeHash: cleanGroupCode,
            members: formatMembers(row.members),
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
          },
          projects: groupProjects,
        });
        return;
      }
    } catch {
      // Lanjutkan ke validasi server backend
    }

    // B. Validasi sisi server terhadap data kelas & kelompok yang tersinkronisasi dari Supabase
    const store = loadMirror();
    const foundClass = store.classes.find((c) => normCode(c.class_code) === normClassCode);

    if (!foundClass) {
      res.status(404).json({
        ok: false,
        errorCode: 'CLASS_NOT_FOUND',
        error: `Kode kelas tidak ditemukan: Kode Kelas "${normClassCode}" belum terdaftar di sistem. Periksa kembali penulisan huruf, tanda hubung (-), dan angkanya bersama Ibu/Bapak Guru (contoh: AQUA-5-26).`,
      });
      return;
    }

    const classGroups = store.student_groups.filter((g) => g.class_id === foundClass.id);
    const foundGroup = classGroups.find((g) => normCode(g.group_code) === normGroupCode);

    if (!foundGroup) {
      const groupInOtherClass = store.student_groups.find(
        (g) => g.class_id !== foundClass.id && normCode(g.group_code) === normGroupCode
      );
      if (groupInOtherClass) {
        res.status(403).json({
          ok: false,
          errorCode: 'GROUP_WRONG_CLASS',
          error: `Kelompok bukan bagian dari kelas tersebut: Kode Kelompok "${normGroupCode}" terdaftar pada kelas lain, bukan bagian dari kelas ${foundClass.class_name} (${normCode(foundClass.class_code)}).`,
        });
        return;
      }

      res.status(404).json({
        ok: false,
        errorCode: 'GROUP_NOT_FOUND',
        error: `Kode kelompok tidak ditemukan: Kode Kelompok "${normGroupCode}" belum terdaftar pada kelas ${foundClass.class_name} (${normCode(foundClass.class_code)}).`,
      });
      return;
    }

    const cleanClassCode = normCode(foundClass.class_code);
    const cleanGroupCode = normCode(foundGroup.group_code);
    const signed = signStudentToken({
      sub: foundGroup.id,
      classId: foundClass.id,
      classCode: cleanClassCode,
      groupId: foundGroup.id,
      groupCode: cleanGroupCode,
    });

    const groupProjects = store.projects.filter(
      (p) =>
        p?.group?.groupId === foundGroup.id ||
        (normCode(p?.group?.classCode) === cleanClassCode &&
          normCode(p?.group?.groupCode) === cleanGroupCode)
    );

    res.json({
      ok: true,
      source: 'server-verified',
      studentToken: signed.token,
      expiresAt: signed.expiresAt,
      classRoom: {
        id: foundClass.id,
        teacherId: foundClass.teacher_id,
        name: foundClass.class_name,
        code: cleanClassCode,
        createdAt: foundClass.created_at,
      },
      group: {
        id: foundGroup.id,
        classId: foundGroup.class_id,
        className: foundClass.class_name,
        classCode: cleanClassCode,
        name: foundGroup.group_name,
        code: cleanGroupCode,
        codeHash: cleanGroupCode,
        members: formatMembers(foundGroup.members),
        createdAt: foundGroup.created_at,
        updatedAt: foundGroup.updated_at || foundGroup.created_at,
      },
      projects: groupProjects,
    });
  });

  /**
   * 2. ENDPOINT DATA PROYEK KHUSUS KELOMPOK SISWA (GET /api/student/projects)
   * - Wajib menggunakan Bearer studentToken yang masih berlaku.
   * - Menolak akses jika siswa mencoba meminta data kelompok lain (mis. GURITA meminta data HIU).
   */
  app.get('/api/student/projects', (req, res) => {
    const authHeader = req.headers.authorization;
    const verified = verifyStudentTokenOnServer(authHeader);

    if (!verified.ok || !verified.payload) {
      res.status(401).json({
        ok: false,
        error: verified.error || 'Akses ditolak: Token akses siswa tidak valid.',
      });
      return;
    }

    const tokenPayload = verified.payload;
    const requestedGroupId = typeof req.query.groupId === 'string' ? req.query.groupId : null;
    const requestedGroupCode =
      typeof req.query.groupCode === 'string' ? normCode(req.query.groupCode) : null;

    if (
      (requestedGroupId && requestedGroupId !== tokenPayload.groupId) ||
      (requestedGroupCode && requestedGroupCode !== normCode(tokenPayload.groupCode))
    ) {
      res.status(403).json({
        ok: false,
        error:
          'Akses ditolak: Anda tidak memiliki izin untuk melihat hasil atau data milik kelompok lain.',
      });
      return;
    }

    const store = loadMirror();
    const myProjects = store.projects.filter(
      (p) =>
        p?.group?.groupId === tokenPayload.groupId ||
        (normCode(p?.group?.classCode) === normCode(tokenPayload.classCode) &&
          normCode(p?.group?.groupCode) === normCode(tokenPayload.groupCode))
    );

    res.json({
      ok: true,
      groupId: tokenPayload.groupId,
      groupCode: tokenPayload.groupCode,
      projects: myProjects,
    });
  });

  /**
   * 3. ENDPOINT SIMPAN PROGRES PROYEK SISWA (POST /api/student/projects)
   * - Wajib menggunakan Bearer studentToken yang sah.
   * - Menolak penyimpanan jika proyek bukan milik kelompok pada token tersebut.
   */
  app.post('/api/student/projects', (req, res) => {
    const authHeader = req.headers.authorization;
    const verified = verifyStudentTokenOnServer(authHeader);

    if (!verified.ok || !verified.payload) {
      res.status(401).json({
        ok: false,
        error: verified.error || 'Akses ditolak: Token akses siswa tidak valid.',
      });
      return;
    }

    const tokenPayload = verified.payload;
    const incomingProjects = Array.isArray(req.body?.projects)
      ? req.body.projects
      : req.body?.project
      ? [req.body.project]
      : [];

    for (const proj of incomingProjects) {
      const pGroupId = proj?.group?.groupId;
      const pGroupCode = proj?.group?.groupCode ? normCode(proj.group.groupCode) : null;
      if (
        (pGroupId && pGroupId !== tokenPayload.groupId) ||
        (pGroupCode && pGroupCode !== normCode(tokenPayload.groupCode))
      ) {
        res.status(403).json({
          ok: false,
          error: 'Akses ditolak: Tidak dapat mengubah proyek milik kelompok lain.',
        });
        return;
      }
    }

    const store = loadMirror();
    const projectMap = new Map<string, any>();
    for (const existing of store.projects) {
      if (existing?.id) projectMap.set(existing.id, existing);
    }

    for (const proj of incomingProjects) {
      if (!proj?.id) continue;
      const sanitizedProj = {
        ...proj,
        group: {
          ...(proj.group || {}),
          groupId: tokenPayload.groupId,
          classId: tokenPayload.classId,
          classCode: tokenPayload.classCode,
          groupCode: tokenPayload.groupCode,
        },
      };
      projectMap.set(proj.id, sanitizedProj);
    }

    const nextStore: MirrorStore = {
      ...store,
      projects: Array.from(projectMap.values()),
      updatedAt: new Date().toISOString(),
    };
    saveMirror(nextStore);

    const myProjects = nextStore.projects.filter(
      (p) => p?.group?.groupId === tokenPayload.groupId
    );

    res.json({ ok: true, projects: myProjects });
  });

  /**
   * 4. ENDPOINT KHUSUS GURU: PEMANTAUAN DASHBOARD GURU (GET /api/teacher/dashboard)
   * - Menolak tegas jika diakses menggunakan studentToken.
   * - Memungkinkan Guru yang login memantau seluruh kelompok (GURITA-01, HIU-01, dst.) beserta progres proyeknya.
   */
  app.get('/api/teacher/dashboard', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const checkStudent = verifyStudentTokenOnServer(authHeader);
    if (checkStudent.ok) {
      res.status(403).json({
        ok: false,
        error: 'Akses ditolak: Token siswa tidak dapat digunakan untuk mengakses Dashboard Guru.',
      });
      return;
    }

    const teacherId = req.headers['x-teacher-id'];
    if (!teacherId || typeof teacherId !== 'string' || teacherId.trim().length < 5) {
      res.status(401).json({
        ok: false,
        error: 'Akses ditolak: Autentikasi akun Guru diperlukan untuk mengakses Dashboard Guru.',
      });
      return;
    }

    const store = loadMirror();
    res.json({
      ok: true,
      classes: store.classes,
      student_groups: store.student_groups,
      projects: store.projects,
    });
  });

  // Endpoint sinkronisasi ketika Guru mengelola kelas & kelompok
  app.post('/api/supabase-mirror/sync', (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (verifyStudentTokenOnServer(authHeader).ok) {
      res.status(403).json({
        ok: false,
        error: 'Akses ditolak: Siswa tidak diizinkan mengubah data kelas atau kelompok.',
      });
      return;
    }

    const store = loadMirror();
    const incomingClasses = Array.isArray(req.body?.classes) ? req.body.classes : [];
    const incomingGroups = Array.isArray(req.body?.groups) ? req.body.groups : [];
    const incomingProjects = Array.isArray(req.body?.projects) ? req.body.projects : [];

    const classByCode = new Map<string, MirrorClass>();
    for (const c of store.classes) {
      classByCode.set(normCode(c.class_code), c);
    }

    const oldIdToNewId = new Map<string, string>();

    for (const ic of incomingClasses) {
      const code = normCode(ic.code || ic.class_code);
      if (!code) continue;
      const existing = classByCode.get(code);
      const nextClass: MirrorClass = {
        id: ic.id || existing?.id || `cls-${code}`,
        teacher_id: ic.teacherId || ic.teacher_id || existing?.teacher_id || 'teacher-supabase-sync',
        class_name: ic.name || ic.class_name || existing?.class_name || code,
        class_code: code,
        created_at: ic.createdAt || ic.created_at || existing?.created_at || new Date().toISOString(),
      };
      if (existing && existing.id !== nextClass.id) {
        oldIdToNewId.set(existing.id, nextClass.id);
      }
      classByCode.set(code, nextClass);
    }

    const updatedClasses = Array.from(classByCode.values());
    const validClassIds = new Set(updatedClasses.map((c) => c.id));

    const groupKeyMap = new Map<string, MirrorGroup>();
    for (const g of store.student_groups) {
      const mappedClassId = oldIdToNewId.get(g.class_id) || g.class_id;
      if (!validClassIds.has(mappedClassId)) continue;
      const key = `${mappedClassId}::${normCode(g.group_code)}`;
      groupKeyMap.set(key, { ...g, class_id: mappedClassId });
    }

    for (const ig of incomingGroups) {
      const gCode = normCode(ig.code || ig.group_code);
      const rawClassId = ig.classId || ig.class_id;
      const mappedClassId = oldIdToNewId.get(rawClassId) || rawClassId;
      if (!gCode || !mappedClassId) continue;

      const rawMembers = ig.members;
      const membersArray: string[] = Array.isArray(rawMembers)
        ? rawMembers.map((m: unknown) => String(m).trim()).filter(Boolean)
        : typeof rawMembers === 'string'
        ? rawMembers
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean)
        : [];

      const key = `${mappedClassId}::${gCode}`;
      const existing = groupKeyMap.get(key);
      groupKeyMap.set(key, {
        id: ig.id || existing?.id || `grp-${mappedClassId}-${gCode}`,
        class_id: mappedClassId,
        group_name: ig.name || ig.group_name || existing?.group_name || gCode,
        group_code: gCode,
        members: membersArray.length > 0 ? membersArray : existing?.members || [],
        created_at: ig.createdAt || ig.created_at || existing?.created_at || new Date().toISOString(),
        updated_at: ig.updatedAt || ig.updated_at || new Date().toISOString(),
      });
    }

    const projectMap = new Map<string, any>();
    for (const p of store.projects) {
      if (p?.id) projectMap.set(p.id, p);
    }
    for (const ip of incomingProjects) {
      if (ip?.id) projectMap.set(ip.id, ip);
    }

    const nextStore: MirrorStore = {
      classes: updatedClasses,
      student_groups: Array.from(groupKeyMap.values()),
      projects: Array.from(projectMap.values()),
      updatedAt: new Date().toISOString(),
    };
    saveMirror(nextStore);
    res.json({ ok: true });
  });

  // Hapus kelas atau kelompok oleh Guru
  app.post('/api/supabase-mirror/delete', (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (verifyStudentTokenOnServer(authHeader).ok) {
      res.status(403).json({
        ok: false,
        error: 'Akses ditolak: Siswa tidak diizinkan menghapus kelas atau kelompok.',
      });
      return;
    }

    const store = loadMirror();
    const { classId, classCode, groupId, groupCode } = req.body || {};

    let classes = store.classes;
    let student_groups = store.student_groups;

    if (classId || classCode) {
      const targetCode = classCode ? normCode(classCode) : null;
      const removedClassIds = new Set(
        classes
          .filter((c) => c.id === classId || (targetCode && normCode(c.class_code) === targetCode))
          .map((c) => c.id)
      );
      classes = classes.filter((c) => !removedClassIds.has(c.id));
      student_groups = student_groups.filter((g) => !removedClassIds.has(g.class_id));
    }

    if (groupId || groupCode) {
      const targetGCode = groupCode ? normCode(groupCode) : null;
      student_groups = student_groups.filter(
        (g) =>
          g.id !== groupId &&
          !(targetGCode && normCode(g.group_code) === targetGCode && (!classId || g.class_id === classId))
      );
    }

    const nextStore: MirrorStore = {
      ...store,
      classes,
      student_groups,
      updatedAt: new Date().toISOString(),
    };
    saveMirror(nextStore);
    res.json({ ok: true });
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (process.env.AEM_SKIP_LISTEN !== 'true') {
  startServer();
}
