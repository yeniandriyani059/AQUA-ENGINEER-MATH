import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

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
  updatedAt: string;
}

const MIRROR_FILE = path.resolve(process.cwd(), '.aem-supabase-mirror.json');

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
  updatedAt: new Date().toISOString(),
};

function normCode(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, '');
}

function loadMirror(): MirrorStore {
  try {
    if (fs.existsSync(MIRROR_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(MIRROR_FILE, 'utf-8'));
      const classes: MirrorClass[] = Array.isArray(parsed.classes) ? parsed.classes : [];
      const student_groups: MirrorGroup[] = Array.isArray(parsed.student_groups)
        ? parsed.student_groups
        : [];

      // Ensure seed classes/groups remain available if not already synced with real UUIDs
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
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  } catch (e) {
    console.warn('[AEM Mirror] Failed to read mirror file, using seed:', e);
  }
  saveMirror(SEED_MIRROR);
  return SEED_MIRROR;
}

function saveMirror(store: MirrorStore): void {
  try {
    fs.writeFileSync(MIRROR_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[AEM Mirror] Failed to write mirror file:', e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Endpoint to read synced Supabase classes & student_groups across devices
  app.get('/api/supabase-mirror', (_req, res) => {
    const store = loadMirror();
    res.json(store);
  });

  // Endpoint called by Teacher's authenticated browser whenever Supabase classes/groups are fetched or updated
  app.post('/api/supabase-mirror/sync', (req, res) => {
    const store = loadMirror();
    const incomingClasses = Array.isArray(req.body?.classes) ? req.body.classes : [];
    const incomingGroups = Array.isArray(req.body?.groups) ? req.body.groups : [];

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

    const nextStore: MirrorStore = {
      classes: updatedClasses,
      student_groups: Array.from(groupKeyMap.values()),
      updatedAt: new Date().toISOString(),
    };
    saveMirror(nextStore);
    res.json({ ok: true, store: nextStore });
  });

  // Delete class or group from mirror when teacher deletes in Supabase
  app.post('/api/supabase-mirror/delete', (req, res) => {
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
      classes,
      student_groups,
      updatedAt: new Date().toISOString(),
    };
    saveMirror(nextStore);
    res.json({ ok: true, store: nextStore });
  });

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

startServer();
