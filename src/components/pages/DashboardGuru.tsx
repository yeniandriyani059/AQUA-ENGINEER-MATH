import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { STAGES } from '../../data/stages';
import { CASES } from '../../data/cases';
import { Project, ClassRoom, StudentGroup } from '../../types';
import {
  caseOf,
  evaluate,
  scenOf,
  fmt,
} from '../../utils/math';
import {
  doneCount,
  pct,
  curStage,
  stageState,
  tgl,
  uid,
  nowIso,
  sha,
  sameGroup,
} from '../../utils/storage';
import {
  generateClassCode,
  generateGroupCode,
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
  projectBelongsToGroup,
} from '../../utils/access';
import {
  createClassInSupabase,
  updateClassInSupabase,
  deleteClassInSupabase,
  createGroupInSupabase,
  updateGroupInSupabase,
  deleteGroupInSupabase,
} from '../../services/classGroupService';
import { DesignCanvas } from '../canvas/DesignCanvas';
import { Aqua } from '../common/Mascot';
import { Btn, Stat, Field, AquaTip, Modal } from '../common/UI';
import { Icon } from '../icons/Icon';
import { TeacherAuthPanel } from '../modals/AccessModal';

const GST: Record<string, [string, string]> = {
  selesai: ['Selesai', '#D8F7E7'],
  sedang: ['Sedang mengerjakan', '#FFF1B8'],
  belum: ['Belum mulai', '#EEF3F8'],
};

const gstatus = (p: Project): 'selesai' | 'sedang' | 'belum' => {
  if (doneCount(p) === 7) return 'selesai';
  const hasProgress =
    doneCount(p) > 0 ||
    Object.values(p.explore).some((v) => v.trim() !== '') ||
    p.plan.savedAt !== null ||
    p.design.savedAt !== null ||
    p.sim.history.length > 0;
  return hasProgress ? 'sedang' : 'belum';
};

const GBadge = ({ p }: { p: Project }) => {
  const g = GST[gstatus(p)];
  return (
    <span className="chip" style={{ background: g[1] }}>
      {g[0]}
    </span>
  );
};

function ScenPanel({ p }: { p: Project }) {
  const [sc, setSc] = useState('normal');
  const c = caseOf(p);
  const SC = scenOf(c);
  const ev = evaluate(p, sc, true);
  const last = p.sim.history.filter((h) => h.scen === sc).slice(-1)[0];

  return (
    <div>
      <div className="seg" role="group" aria-label="Pilih keadaan air">
        {Object.keys(SC).map((k) => (
          <button
            key={k}
            aria-pressed={sc === k}
            onClick={() => setSc(k)}
          >
            {SC[k].nama}
          </button>
        ))}
      </div>
      <div style={{ margin: '10px 0' }}>
        {p.design.savedAt || p.design.edges.length > 0 ? (
          <DesignCanvas project={p} editable={false} scen={sc} flow={true} />
        ) : (
          <p className="hint">Rancangan belum dibuat oleh kelompok ini.</p>
        )}
      </div>
      {(p.design.savedAt || p.design.edges.length > 0) && (
        <div className="row">
          <Stat st={ev.overall} />
          <span>{ev.text}</span>
        </div>
      )}
      <p className="hint" style={{ marginTop: 6 }}>
        {last
          ? 'Simulasi kelompok: total ' +
            fmt(last.total) +
            ' dari ' +
            fmt(last.supply) +
            ' L (' +
            tgl(last.at) +
            ').'
          : 'Kelompok belum menjalankan simulasi untuk keadaan ini.'}
      </p>
    </div>
  );
}

function CalcTable({ p }: { p: Project }) {
  const c = caseOf(p);
  if (doneCount(p) < 2 && !p.plan.savedAt) {
    return <p className="hint">Kelompok ini belum sampai tahap perhitungan.</p>;
  }
  const a = evaluate(p, 'normal', false);
  const b = evaluate(p, 'kurang', false);

  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fasilitas</th>
              <th className="num">Butuh (L)</th>
              <th className="num">Normal (L)</th>
              <th className="num">Air berkurang (L)</th>
            </tr>
          </thead>
          <tbody>
            {a.rows.map((r, i) => (
              <tr key={r.id}>
                <td>{r.nama}</td>
                <td className="num">{fmt(r.need)}</td>
                <td className="num">{fmt(r.alloc)}</td>
                <td className="num">{fmt(b.rows[i].alloc)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total alokasi</td>
              <td className="num">{fmt(a.demand)}</td>
              <td className="num">{fmt(a.total)}</td>
              <td className="num">{fmt(b.total)}</td>
            </tr>
            <tr>
              <td>Persediaan</td>
              <td />
              <td className="num">{fmt(a.S.supply)}</td>
              <td className="num">{fmt(b.S.supply)}</td>
            </tr>
            <tr>
              <td>Sisa air</td>
              <td />
              <td className="num">{fmt(a.left)}</td>
              <td className="num">{fmt(b.left)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {c.mul && (
        <p className="hint" style={{ marginTop: 8 }}>
          Contoh latihan hitung: {c.mul.a} × {c.mul.b} = {fmt(c.mul.a * c.mul.b)} L
          {c.div
            ? ' · ' +
              fmt(c.div.total) +
              ' ÷ ' +
              c.div.parts +
              ' = ' +
              fmt(c.div.total / c.div.parts) +
              ' L'
            : ''}
        </p>
      )}
    </div>
  );
}

function SimList({ p }: { p: Project }) {
  const SC = scenOf(caseOf(p));
  const rev = p.improve.revisions.slice(-1)[0];
  if (doneCount(p) < 4 && p.sim.history.length === 0) {
    return <p className="hint">Kelompok ini belum menjalankan simulasi.</p>;
  }
  return (
    <div>
      <ul className="list">
        {Object.keys(SC).map((k) => {
          const h = p.sim.history.filter((x) => x.scen === k).slice(-1)[0];
          return (
            <li key={k}>
              <b>{SC[k].nama}:</b>{' '}
              {h ? (
                <>
                  <Stat st={h.overall} /> total {fmt(h.total)} dari {fmt(h.supply)} L
                </>
              ) : (
                'belum dijalankan'
              )}
            </li>
          );
        })}
      </ul>
      <p style={{ marginTop: 8 }}>
        <b>Perbaikan:</b>{' '}
        {rev
          ? rev.fields.perubahan
          : p.stageDone[6]
          ? 'Desain sudah tahan gangguan, tidak perlu perubahan.'
          : 'Belum ada.'}
      </p>
    </div>
  );
}

function GuruDetail({
  p,
  onBack,
  onPresent,
}: {
  p: Project;
  onBack: () => void;
  onPresent: () => void;
}) {
  const c = caseOf(p);
  const r = p.present.reflection;

  return (
    <div className="main">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Btn sm icon="left" onClick={onBack}>
          Kembali ke Dashboard Guru
        </Btn>
        <Btn kind="orange" icon="full" onClick={onPresent}>
          Tampilkan Mode Presentasi
        </Btn>
      </div>
      <div className="card" style={{ background: 'linear-gradient(135deg,var(--sky),#fff)' }}>
        <div className="row">
          <Aqua size={76} />
          <div className="grow">
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <span className="chip" style={{ background: '#E8FAFF' }}>
                Misi: {c.nama}
              </span>
              <span className="chip">Level {c.level}</span>
              {p.group.classCode && (
                <span className="chip">Kode Kelas: {p.group.classCode}</span>
              )}
              {p.group.groupCode && (
                <span className="chip" style={{ background: '#FFF1BF' }}>
                  Kode Kelompok: {p.group.groupCode}
                </span>
              )}
              <GBadge p={p} />
            </div>
            <h1>{p.group.name}</h1>
            <p>
              <b>{p.title || `Proyek ${c.nama}`}</b> · Kelas {p.group.kelas} · Anggota: {p.group.members || '-'}
            </p>
          </div>
        </div>
        <p style={{ marginTop: 10 }}>
          <b>Tantangan:</b> {c.desc}
        </p>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h3>Status Penyelesaian · {doneCount(p)} dari 7 Tahap</h3>
          <b>{pct(p)}%</b>
        </div>
        <div className="progress">
          <i style={{ width: pct(p) + '%' }} />
        </div>
        <div className="dpath" style={{ marginTop: 12 }}>
          {STAGES.map((st) => {
            const x = stageState(p, st.n);
            return (
              <div
                key={st.n}
                className={'dstep ' + x}
                style={{ '--c': st.c } as React.CSSProperties}
              >
                <b>{x === 'done' ? <Icon n="check" size={18} sw={3.5} /> : st.n}</b>
                <span>{st.t}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="split">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Rancangan Sistem Distribusi Air</h3>
          <ScenPanel key={p.id} p={p} />
        </div>
        <div className="main" style={{ gap: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Hasil Perhitungan</h3>
            <CalcTable p={p} />
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Hasil Simulasi & Perbaikan</h3>
            <SimList p={p} />
          </div>
        </div>
      </div>

      <div className="card soft">
        <h3 style={{ marginBottom: 8 }}>Refleksi Akhir Kelompok</h3>
        {p.present.savedAt ? (
          <ul className="list">
            {Object.values(r).map((v, i) => (
              <li key={i}>
                <Icon n="star" size={18} />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Refleksi akhir belum disimpan oleh kelompok ini.</p>
        )}
      </div>
    </div>
  );
}

function GuruPresent({
  list,
  idx,
  setIdx,
  onClose,
}: {
  list: Project[];
  idx: number;
  setIdx: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
}) {
  const n = list.length;
  const p = list[idx] || list[0];
  const c = caseOf(p);
  const r = p.present.reflection;

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(n - 1, i + 1));
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [n, onClose, setIdx]);

  return (
    <div
      className="present gpres"
      role="dialog"
      aria-modal="true"
      aria-label="Presentasi hasil kelompok"
    >
      <div className="gp-bar">
        <div className="row" style={{ gap: 10 }}>
          <Btn sm icon="left" onClick={onClose}>
            Kembali ke Dashboard Guru
          </Btn>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <label htmlFor="gp-select" className="hint" style={{ color: 'var(--navy)' }}>
            Pilih Kelompok:
          </label>
          <select
            id="gp-select"
            className="in"
            style={{ minHeight: 42, width: 'auto', padding: '4px 12px', fontWeight: 800 }}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
          >
            {list.map((item, index) => (
              <option key={item.id} value={index}>
                {index + 1}. {item.group.name} (Kelas {item.group.kelas} - {item.caseName})
              </option>
            ))}
          </select>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <Btn
            sm
            icon="full"
            onClick={() => {
              try {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              } catch {
                // ignore
              }
            }}
          >
            Layar Penuh (PID)
          </Btn>
          <Btn sm kind="coral" icon="x" onClick={onClose}>
            Tutup
          </Btn>
        </div>
      </div>

      <div className="slide gp-slide" key={p.id}>
        <div className="gp-head">
          <Aqua size={78} />
          <div className="grow">
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <span className="chip" style={{ background: '#E8FAFF' }}>
                Misi: {c.nama}
              </span>
              <span className="chip">Kelas {p.group.kelas}</span>
              {p.group.groupCode && (
                <span className="chip" style={{ background: '#FFF1BF' }}>
                  Kode: {p.group.groupCode}
                </span>
              )}
              <GBadge p={p} />
            </div>
            <h2>{p.group.name}</h2>
            <p style={{ fontSize: '0.95em' }}>
              <b>{p.title || `Proyek ${c.nama}`}</b> · <b>Anggota:</b> {p.group.members || '-'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="chip" style={{ background: '#FFD84D', fontSize: '1rem', padding: '6px 14px' }}>
              {doneCount(p)} / 7 Tahap ({pct(p)}%)
            </div>
          </div>
        </div>

        {doneCount(p) === 0 && !p.design.savedAt && p.design.edges.length === 0 ? (
          <div className="card soft" style={{ marginTop: 12 }}>
            <AquaTip mood="think">
              Kelompok ini belum memulai pengerjaan misi, sehingga rancangan dan perhitungan belum tersedia untuk ditampilkan.
            </AquaTip>
          </div>
        ) : (
          <div className="gp-grid">
            <section className="card soft" style={{ padding: 16 }}>
              <h3>Visualisasi & Rancangan Pipa</h3>
              <ScenPanel key={p.id} p={p} />
            </section>
            <div className="gp-col">
              <section className="card soft" style={{ padding: 16 }}>
                <h3>Tabel Perhitungan & Alokasi Air</h3>
                <CalcTable p={p} />
              </section>
              <section className="card soft" style={{ padding: 16 }}>
                <h3>Hasil Simulasi & Refleksi Kelompok</h3>
                <SimList p={p} />
                {p.present.savedAt && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '2px dashed #B8D4EE' }}>
                    <b>Kesimpulan Kelompok:</b>
                    <p style={{ marginTop: 4 }}>{r.r1}</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>

      <div className="row gp-nav">
        <Btn icon="left" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
          Kelompok Sebelumnya
        </Btn>
        <b>
          Kelompok {idx + 1} dari {n}
        </b>
        <Btn
          kind="orange"
          disabled={idx === n - 1}
          onClick={() => setIdx(idx + 1)}
        >
          Kelompok Berikutnya
          <Icon n="right" size={20} />
        </Btn>
      </div>
    </div>
  );
}

export function DashboardGuru() {
  const {
    data,
    setData,
    session,
    setSession,
    teacherSession,
    logoutTeacher,
    purgeTrialData,
    toast,
    go,
  } = useApp();

  const projects = data.projects;
  const classes = data.classes;
  const groups = data.groups;

  const [selectedClassId, setSelectedClassId] = useState<string>(() =>
    classes[0]?.id || ''
  );
  const [newClassName, setNewClassName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');

  // Editing & deleting class state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);

  // Editing & deleting group state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupMembers, setEditGroupMembers] = useState('');
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);

  // Editing, resetting progress & deleting project state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectTitle, setEditProjectTitle] = useState('');
  const [editProjectCaseId, setEditProjectCaseId] = useState('aquacity');
  const [confirmResetProjectId, setConfirmResetProjectId] = useState<string | null>(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);

  const [filterKelas, setFilterKelas] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [selId, setSelId] = useState<string | null>(null);
  const [presIdx, setPresIdx] = useState<number | null>(null);

  // Keep selectedClassId valid when classes change
  useEffect(() => {
    if (classes.length > 0 && !classes.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    } else if (classes.length === 0 && selectedClassId !== '') {
      setSelectedClassId('');
    }
  }, [classes, selectedClassId]);

  const activeClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || null,
    [classes, selectedClassId]
  );

  const activeClassGroups = useMemo(
    () =>
      activeClass
        ? groups.filter((g) => g.classId === activeClass.id)
        : [],
    [groups, activeClass]
  );

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => set.add(c.name));
    projects.forEach((p) => {
      if (p.group.kelas) set.add(p.group.kelas);
    });
    return Array.from(set).sort();
  }, [classes, projects]);

  const filteredList = useMemo(() => {
    return projects.filter((p) => {
      const matchKelas = filterKelas === 'SEMUA' || p.group.kelas === filterKelas;
      const matchStatus = filterStatus === 'SEMUA' || gstatus(p) === filterStatus;
      return matchKelas && matchStatus;
    });
  }, [projects, filterKelas, filterStatus]);

  // Compute KPI counts across registered groups and projects
  const kpiStats = useMemo(() => {
    const groupsWithoutProject = groups.filter(
      (g) => !projects.some((p) => projectBelongsToGroup(p, g.id))
    );
    const totalGroupsOrProjects = projects.length + groupsWithoutProject.length;
    const selesai = projects.filter((p) => gstatus(p) === 'selesai').length;
    const sedang = projects.filter((p) => gstatus(p) === 'sedang').length;
    const belum =
      projects.filter((p) => gstatus(p) === 'belum').length +
      groupsWithoutProject.length;
    return {
      total: totalGroupsOrProjects,
      selesai,
      sedang,
      belum,
    };
  }, [groups, projects]);

  // If teacher is not logged in, require teacher authentication first
  if (!teacherSession) {
    return (
      <div className="main">
        <div className="card" style={{ background: 'linear-gradient(135deg,var(--sky),#fff)' }}>
          <div className="row" style={{ gap: 16 }}>
            <Aqua size={76} mood="happy" />
            <div className="grow">
              <span className="chip" style={{ background: '#FFF1BF' }}>
                <Icon n="lock" size={15} /> Akses Khusus Guru
              </span>
              <h1 style={{ marginTop: 6 }}>Masuk ke Dashboard Guru</h1>
              <p className="hint">
                Silakan masuk atau daftarkan akun Guru untuk membuat Kelas (Kode Kelas otomatis), membuat Kelompok (Kode Kelompok otomatis), serta memantau dan mempresentasikan hasil proyek siswa.
              </p>
            </div>
          </div>
        </div>

        <div className="split">
          <section className="card" aria-label="Formulir Autentikasi Guru">
            <h3 style={{ marginBottom: 10 }}>Autentikasi Akun Guru</h3>
            <TeacherAuthPanel />
          </section>

          <section className="card soft" aria-label="Panduan Sistem Akses">
            <h3 style={{ marginBottom: 10 }}>Alur Sistem Kode Kelas & Kode Kelompok</h3>
            <ol className="list">
              <li>
                <span>
                  <b>1. Guru Membuat Kelas:</b> Sistem menghasilkan <b>Kode Kelas</b> otomatis (contoh: <code>AQUA-5A-26</code>).
                </span>
              </li>
              <li>
                <span>
                  <b>2. Guru Membuat Kelompok di Dalam Kelas:</b> Sistem menghasilkan <b>Kode Kelompok</b> otomatis (contoh: <code>LUMBA-01</code>).
                </span>
              </li>
              <li>
                <span>
                  <b>3. Guru Membagikan Kode kepada Siswa:</b> Siswa tidak perlu email dan tidak membuat kode sendiri.
                </span>
              </li>
              <li>
                <span>
                  <b>4. Siswa Masuk dengan Kode Kelas + Kode Kelompok:</b> Siswa langsung terhubung ke ruang proyek kelompoknya di kelas yang benar.
                </span>
              </li>
            </ol>
          </section>
        </div>
      </div>
    );
  }

  // Handlers for Class & Group Management
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newClassName.trim();
    if (!cleanName) {
      toast('Masukkan nama kelas terlebih dahulu (contoh: 5A).', true);
      return;
    }
    if (!teacherSession?.id) {
      toast('Sesi Guru belum aktif. Silakan masuk terlebih dahulu.', true);
      return;
    }

    const duplicateClass = classes.some(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateClass) {
      toast(`Kelas "${cleanName}" sudah ada.`, true);
      return;
    }

    try {
      const existingClassCodes = classes.map((c) => c.code);
      const newClass = await createClassInSupabase({
        teacherId: teacherSession.id,
        className: cleanName,
        existingCodes: existingClassCodes,
      });

      setData((d) => ({
        ...d,
        classes: [...d.classes, newClass],
      }));
      setSelectedClassId(newClass.id);
      setNewClassName('');
      toast(`Kelas "${newClass.name}" berhasil dibuat dengan Kode Kelas: ${newClass.code}`);
    } catch (err: any) {
      toast(err.message || 'Gagal menyimpan kelas. Periksa koneksi Anda.', true);
    }
  };

  const startEditClass = (cls: ClassRoom) => {
    setConfirmDeleteClassId(null);
    setEditingClassId(cls.id);
    setEditClassName(cls.name);
  };

  const handleSaveClassEdit = async (cls: ClassRoom) => {
    const cleanName = editClassName.trim();
    if (!cleanName) {
      toast('Nama kelas tidak boleh kosong.', true);
      return;
    }

    const duplicateClass = classes.some(
      (other) =>
        other.id !== cls.id &&
        other.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateClass) {
      toast(`Nama kelas "${cleanName}" sudah digunakan.`, true);
      return;
    }

    try {
      await updateClassInSupabase(cls.id, cleanName);

      const oldName = cls.name;
      let nextSession = session;
      setData((d) => {
        const res = updateClassById(d, session, cls.id, cleanName);
        nextSession = res.session;
        return res.data;
      });
      if (nextSession !== session) {
        setSession(nextSession);
      }
      if (filterKelas === oldName) {
        setFilterKelas(cleanName);
      }

      setEditingClassId(null);
      toast(`Nama kelas berhasil diperbarui menjadi "${cleanName}".`);
    } catch (err: any) {
      toast(err.message || 'Gagal memperbarui kelas.', true);
    }
  };

  const handleDeleteClass = async (cls: ClassRoom) => {
    try {
      await deleteClassInSupabase(cls.id);

      let nextSession = session;
      setData((d) => {
        const res = deleteClassById(d, session, cls.id);
        nextSession = res.session;
        return res.data;
      });
      if (nextSession !== session) {
        setSession(nextSession);
      }
      if (filterKelas === cls.name) {
        setFilterKelas('SEMUA');
      }

      setConfirmDeleteClassId(null);
      setEditingClassId(null);
      toast(`Kelas "${cls.name}" (${cls.code}) berhasil dihapus.`);
    } catch (err: any) {
      toast(err.message || 'Gagal menghapus kelas.', true);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClass) {
      toast('Pilih atau buat kelas terlebih dahulu.', true);
      return;
    }
    const cleanGroupName = newGroupName.trim();
    if (!cleanGroupName) {
      toast('Masukkan nama kelompok terlebih dahulu (contoh: Kelompok Lumba-Lumba).', true);
      return;
    }

    const duplicateName = activeClassGroups.some(
      (g) => g.name.toLowerCase() === cleanGroupName.toLowerCase()
    );
    if (duplicateName) {
      toast(`Kelompok "${cleanGroupName}" sudah ada di kelas ${activeClass.name}.`, true);
      return;
    }

    try {
      const existingGroupCodes = activeClassGroups.map((g) => g.code);
      const newGrp = await createGroupInSupabase({
        classId: activeClass.id,
        className: activeClass.name,
        classCode: activeClass.code,
        groupName: cleanGroupName,
        members: newGroupMembers.trim(),
        existingCodesInClass: existingGroupCodes,
      });

      setData((d) => ({
        ...d,
        groups: [...d.groups, newGrp],
      }));
      setNewGroupName('');
      setNewGroupMembers('');
      toast(`Kelompok "${newGrp.name}" berhasil dibuat! Kode Kelompok: ${newGrp.code}`);
    } catch (err: any) {
      toast(err.message || 'Gagal menyimpan kelompok.', true);
    }
  };

  const startEditGroup = (g: StudentGroup) => {
    setConfirmDeleteGroupId(null);
    setEditingGroupId(g.id);
    setEditGroupName(g.name);
    setEditGroupMembers(g.members);
  };

  const handleSaveGroupEdit = async (g: StudentGroup) => {
    const cleanName = editGroupName.trim();
    const cleanMembers = editGroupMembers.trim();
    if (!cleanName) {
      toast('Nama kelompok tidak boleh kosong.', true);
      return;
    }

    const duplicateName = groups.some(
      (other) =>
        other.classId === g.classId &&
        other.id !== g.id &&
        other.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateName) {
      toast(`Nama kelompok "${cleanName}" sudah digunakan di kelas ${g.className}.`, true);
      return;
    }

    try {
      await updateGroupInSupabase(g.id, cleanName, cleanMembers);

      let nextSession = session;
      setData((d) => {
        const res = updateGroupById(d, session, g.id, cleanName, cleanMembers, nowIso());
        nextSession = res.session;
        return res.data;
      });
      if (nextSession !== session) {
        setSession(nextSession);
      }

      setEditingGroupId(null);
      toast(`Data kelompok "${cleanName}" berhasil diperbarui.`);
    } catch (err: any) {
      toast(err.message || 'Gagal memperbarui kelompok.', true);
    }
  };

  const handleDeleteGroup = async (g: StudentGroup) => {
    try {
      await deleteGroupInSupabase(g.id);

      let nextSession = session;
      setData((d) => {
        const res = deleteGroupById(d, session, g.id);
        nextSession = res.session;
        return res.data;
      });
      if (nextSession !== session) {
        setSession(nextSession);
      }

      setConfirmDeleteGroupId(null);
      setEditingGroupId(null);
      toast(`Kelompok "${g.name}" (${g.code}) berhasil dihapus.`);
    } catch (err: any) {
      toast(err.message || 'Gagal menghapus kelompok.', true);
    }
  };

  const handleResetGroupCode = async (g: StudentGroup) => {
    const classGroupCodes = groups
      .filter((item) => item.classId === g.classId)
      .map((item) => item.code);

    const nextCode = generateGroupCode(g.name, classGroupCodes);
    const nextHash = await sha(nextCode);

    setData((d) => ({
      ...d,
      groups: d.groups.map((item) =>
        item.id === g.id
          ? { ...item, code: nextCode, codeHash: nextHash, updatedAt: nowIso() }
          : item
      ),
      projects: d.projects.map((p) =>
        projectBelongsToGroup(p, g.id)
          ? {
              ...p,
              group: {
                ...p.group,
                groupCode: nextCode,
                codeHash: nextHash,
              },
            }
          : p
      ),
    }));

    if (session && session.groupId === g.id) {
      setSession({
        ...session,
        groupCode: nextCode,
        codeHash: nextHash,
      });
    }

    toast(`Kode kelompok "${g.name}" diatur ulang menjadi: ${nextCode}`);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${label} berhasil disalin: ${text}`);
    } catch {
      toast(`Kode: ${text}`);
    }
  };

  const startEditProject = (p: Project) => {
    setConfirmDeleteProjectId(null);
    setConfirmResetProjectId(null);
    setEditingProjectId(p.id);
    setEditProjectTitle(p.title || `Proyek ${p.caseName}`);
    setEditProjectCaseId(p.caseId || 'aquacity');
  };

  const handleSaveProjectEdit = (p: Project) => {
    const cleanTitle = editProjectTitle.trim();
    if (!cleanTitle) {
      toast('Nama proyek tidak boleh kosong.', true);
      return;
    }

    setData((d) =>
      updateProjectById(
        d,
        p.id,
        { title: cleanTitle, caseId: editProjectCaseId },
        nowIso()
      )
    );
    setEditingProjectId(null);
    toast(
      `Proyek "${cleanTitle}" milik ${p.group.name} berhasil diperbarui.`
    );
  };

  const handleResetProjectProgress = (p: Project) => {
    setData((d) => resetProjectProgressById(d, p.id, nowIso()));
    setConfirmResetProjectId(null);
    setEditingProjectId(null);
    toast(
      `Progres proyek "${p.title}" milik ${p.group.name} berhasil direset ke kondisi awal.`
    );
  };

  const handleDeleteProject = (p: Project) => {
    setData((d) => deleteProjectById(d, p.id));
    if (selId === p.id) {
      setSelId(null);
    }
    setConfirmDeleteProjectId(null);
    setConfirmResetProjectId(null);
    setEditingProjectId(null);
    toast(
      `Proyek "${p.title}" milik ${p.group.name} berhasil dihapus (data kelas & kelompok tetap utuh).`
    );
  };

  const cur = selId ? projects.find((p) => p.id === selId) || null : null;

  const openSel = (p: Project) => {
    setSelId(p.id);
    try {
      window.scrollTo(0, 0);
    } catch {
      // ignore
    }
  };

  const openPresForProject = (p: Project) => {
    const idx = projects.findIndex((item) => item.id === p.id);
    setPresIdx(idx >= 0 ? idx : 0);
  };

  return (
    <div className="main">
      {cur ? (
        <GuruDetail
          p={cur}
          onBack={() => setSelId(null)}
          onPresent={() => openPresForProject(cur)}
        />
      ) : (
        <>
          <div className="card" style={{ background: 'linear-gradient(135deg,var(--sky),#fff)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="row" style={{ gap: 14 }}>
                <Aqua size={68} mood="happy" />
                <div>
                  <div className="row" style={{ gap: 8, marginBottom: 4 }}>
                    <span className="chip" style={{ background: '#D8F7E7' }}>
                      <Icon n="check" size={14} sw={3} /> Guru Aktif: {teacherSession.name}
                    </span>
                    {teacherSession.email && (
                      <span className="chip" style={{ background: '#EEF3F8', fontSize: '0.8rem' }}>
                        {teacherSession.email}
                      </span>
                    )}
                    {teacherSession.school && (
                      <span className="chip">{teacherSession.school}</span>
                    )}
                  </div>
                  <h1>Dashboard Guru</h1>
                  <p className="hint">
                    Kelola Kelas & Kode Kelompok, pantau progres belajar siswa, dan tampilkan hasil proyek di layar kelas / PID.
                  </p>
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <Btn
                  sm
                  kind="orange"
                  icon="full"
                  disabled={projects.length === 0}
                  onClick={() => setPresIdx(0)}
                >
                  Mode Presentasi Kelas
                </Btn>
                <Btn sm kind="coral" onClick={logoutTeacher}>
                  Keluar Guru
                </Btn>
              </div>
            </div>
          </div>

          {/* Ringkasan KPI */}
          <div className="kpi" aria-label="Ringkasan kelas">
            <div>
              <span className="hint">Jumlah kelompok</span>
              <b>{kpiStats.total}</b>
            </div>
            <div style={{ background: '#D8F7E7' }}>
              <span className="hint">Selesai</span>
              <b>{kpiStats.selesai}</b>
            </div>
            <div style={{ background: '#FFF8E8' }}>
              <span className="hint">Sedang mengerjakan</span>
              <b>{kpiStats.sedang}</b>
            </div>
            <div>
              <span className="hint">Belum mulai</span>
              <b>{kpiStats.belum}</b>
            </div>
          </div>

          {/* Manajemen Kelas & Kelompok (KODE KELAS + KODE KELOMPOK OTOMATIS) */}
          <div className="dgrid" style={{ alignItems: 'start' }}>
            <section className="card" aria-label="Manajemen Kelas dan Kode Kelas">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h3>1. Buat & Kelola Kelas ({classes.length})</h3>
                <span className="chip" style={{ background: '#E8FAFF', fontSize: '0.78rem' }}>
                  Kode Kelas Otomatis
                </span>
              </div>
              <p className="hint" style={{ marginBottom: 12 }}>
                Masukkan nama kelas terlebih dahulu. Sistem akan membuat <b>Kode Kelas</b> secara otomatis untuk dibagikan kepada siswa.
              </p>

              <form onSubmit={handleCreateClass} className="row" style={{ alignItems: 'flex-end', marginBottom: 14 }}>
                <div className="grow">
                  <label htmlFor="new-class-name" style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', marginBottom: 4 }}>
                    Nama Kelas Baru
                  </label>
                  <input
                    id="new-class-name"
                    className="in"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Contoh: 5A atau Kelas 5B"
                  />
                </div>
                <Btn kind="orange" type="submit" icon="plus">
                  Buat Kelas
                </Btn>
              </form>

              {classes.length === 0 ? (
                <div className="card soft" style={{ padding: '14px 16px' }}>
                  <p className="hint">
                    Belum ada kelas yang dibuat. Buat kelas pertama Anda di atas untuk mendapatkan <b>Kode Kelas</b> otomatis (contoh: <code>AQUA-5A-26</code>).
                  </p>
                </div>
              ) : (
                <div className="main" style={{ gap: 10 }}>
                  {classes.map((cls) => {
                    const isSelected = cls.id === selectedClassId;
                    const isEditingClass = editingClassId === cls.id;
                    const isConfirmingDeleteClass = confirmDeleteClassId === cls.id;
                    const classImpact = getClassImpact(data, cls.id);

                    return (
                      <div
                        key={cls.id}
                        className="card soft"
                        style={{
                          padding: '12px 16px',
                          border: isSelected ? '3px solid var(--ocean)' : undefined,
                          background: isSelected ? '#E8FAFF' : undefined,
                        }}
                      >
                        {isEditingClass ? (
                          <div>
                            <Field id={`edit-class-name-${cls.id}`} label="Ubah Nama Kelas">
                              <input
                                id={`edit-class-name-${cls.id}`}
                                className="in"
                                value={editClassName}
                                onChange={(e) => setEditClassName(e.target.value)}
                              />
                            </Field>
                            <Field
                              id={`readonly-class-code-${cls.id}`}
                              label="Kode Kelas (Tetap Sama & Tidak Dapat Diedit Manual)"
                            >
                              <input
                                id={`readonly-class-code-${cls.id}`}
                                className="in"
                                value={cls.code}
                                readOnly
                                disabled
                                style={{ background: '#F0F4F8', fontWeight: 800 }}
                              />
                            </Field>
                            <div className="row" style={{ marginTop: 8, gap: 8 }}>
                              <Btn
                                sm
                                kind="mint"
                                icon="save"
                                onClick={() => handleSaveClassEdit(cls)}
                              >
                                Simpan Perubahan
                              </Btn>
                              <Btn sm onClick={() => setEditingClassId(null)}>
                                Batal
                              </Btn>
                            </div>
                          </div>
                        ) : isConfirmingDeleteClass ? (
                          <div
                            style={{
                              padding: '10px 12px',
                              borderRadius: 12,
                              background: '#FFF2F0',
                              border: '2px solid #FFB4A9',
                            }}
                          >
                            <b style={{ color: '#A62B1F', display: 'block', marginBottom: 4 }}>
                              Konfirmasi Hapus Kelas {cls.name}
                            </b>
                            <p className="hint" style={{ color: '#6E2219', fontSize: '0.86rem', marginBottom: 8 }}>
                              Penghapusan <b>Kelas {cls.name}</b> (Kode Kelas: <b>{cls.code}</b>) dapat memengaruhi kelompok dan data proyek siswa di dalamnya.
                            </p>
                            {classImpact.groupCount > 0 || classImpact.projectCount > 0 ? (
                              <div
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  background: '#FFE4E0',
                                  border: '1.5px solid #E57368',
                                  marginBottom: 10,
                                  fontSize: '0.84rem',
                                  color: '#7A1C12',
                                }}
                              >
                                <b>Peringatan Data Siswa:</b> Kelas ini masih memiliki{' '}
                                <b>{classImpact.groupCount} kelompok</b> dan{' '}
                                <b>{classImpact.projectCount} data proyek siswa</b>. Jika Anda melanjutkan penghapusan, seluruh kelompok dan hasil pekerjaan proyek siswa di kelas ini juga akan ikut terhapus.
                              </div>
                            ) : (
                              <p className="hint" style={{ color: '#6E2219', fontSize: '0.82rem', marginBottom: 10 }}>
                                Kelas ini belum memiliki kelompok maupun data proyek siswa.
                              </p>
                            )}
                            <div className="row" style={{ gap: 8 }}>
                              <Btn
                                sm
                                kind="coral"
                                icon="trash"
                                onClick={() => handleDeleteClass(cls)}
                              >
                                Ya, Hapus
                              </Btn>
                              <Btn
                                sm
                                onClick={() => setConfirmDeleteClassId(null)}
                              >
                                Batal
                              </Btn>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="row" style={{ justifyContent: 'space-between' }}>
                              <div>
                                <div className="row" style={{ gap: 8 }}>
                                  <h4 style={{ margin: 0 }}>Kelas {cls.name}</h4>
                                  <span
                                    className="chip"
                                    style={{
                                      background: '#FFD84D',
                                      fontWeight: 900,
                                      letterSpacing: '0.03em',
                                    }}
                                  >
                                    Kode Kelas: {cls.code}
                                  </span>
                                  <span className="chip" style={{ fontSize: '0.78rem' }}>
                                    {classImpact.groupCount} Kelompok
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                              <Btn
                                sm
                                kind={isSelected ? 'blue' : ''}
                                onClick={() => setSelectedClassId(cls.id)}
                              >
                                {isSelected ? 'Kelas Aktif' : 'Pilih Kelas'}
                              </Btn>
                              <Btn
                                sm
                                icon="copy"
                                onClick={() => copyText(cls.code, 'Kode Kelas')}
                              >
                                Salin Kode Kelas
                              </Btn>
                              <Btn
                                sm
                                icon="edit"
                                onClick={() => startEditClass(cls)}
                              >
                                Edit
                              </Btn>
                              <Btn
                                sm
                                kind="coral"
                                icon="trash"
                                onClick={() => {
                                  setEditingClassId(null);
                                  setConfirmDeleteClassId(cls.id);
                                }}
                              >
                                Hapus
                              </Btn>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card" aria-label="Kelola Kelompok">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <h3>
                  2. Kelola Kelompok {activeClass ? `— Kelas ${activeClass.name}` : ''} ({activeClassGroups.length})
                </h3>
                <span className="chip" style={{ background: '#FFF1BF', fontSize: '0.78rem' }}>
                  Kode Kelompok Otomatis & Unik
                </span>
              </div>

              {!activeClass ? (
                <div className="card soft" style={{ padding: '16px' }}>
                  <p className="hint">
                    Buat atau pilih kelas di sebelah kiri terlebih dahulu untuk menambahkan dan mengelola kelompok siswa di dalam kelas tersebut.
                  </p>
                </div>
              ) : (
                <>
                  <p className="hint" style={{ marginBottom: 10 }}>
                    Kelas aktif: <b>Kelas {activeClass.name}</b> (Kode Kelas: <b>{activeClass.code}</b>). Ketik nama kelompok sesuai pembagian guru (contoh: <b>Kelompok Lumba-Lumba</b>, <b>Kelompok Hiu</b>, <b>Kelompok Penyu</b>, <b>Kelompok Gurita</b>). Sistem akan membuat <b>Kode Kelompok</b> otomatis yang unik di dalam kelas.
                  </p>

                  <form onSubmit={handleCreateGroup} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label htmlFor="new-grp-name" style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', marginBottom: 4 }}>
                          Nama Kelompok
                        </label>
                        <input
                          id="new-grp-name"
                          className="in"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          placeholder="Contoh: Kelompok Lumba-Lumba"
                        />
                      </div>
                      <div>
                        <label htmlFor="new-grp-members" style={{ display: 'block', fontWeight: 800, fontSize: '0.88rem', marginBottom: 4 }}>
                          Anggota Kelompok (Opsional)
                        </label>
                        <input
                          id="new-grp-members"
                          className="in"
                          value={newGroupMembers}
                          onChange={(e) => setNewGroupMembers(e.target.value)}
                          placeholder="Aisyah, Bima, Citra"
                        />
                      </div>
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <Btn kind="orange" type="submit" icon="plus">
                        Tambah Kelompok
                      </Btn>
                      <span className="hint" style={{ fontSize: '0.78rem' }}>
                        Nama kelompok ditentukan oleh guru · Kode Kelompok dibuat otomatis oleh sistem
                      </span>
                    </div>
                  </form>

                  {activeClassGroups.length === 0 ? (
                    <div className="card soft" style={{ padding: '16px 18px' }}>
                      <div className="row" style={{ gap: 12 }}>
                        <Aqua size={50} mood="think" />
                        <div>
                          <b style={{ display: 'block', marginBottom: 4 }}>
                            Belum ada kelompok di Kelas {activeClass.name}
                          </b>
                          <p className="hint" style={{ fontSize: '0.86rem', margin: 0 }}>
                            Ketik nama kelompok pada kolom di atas (misalnya <i>Kelompok Lumba-Lumba</i>, <i>Kelompok Hiu</i>, <i>Kelompok Penyu</i>, atau <i>Kelompok Gurita</i>), lalu klik <b>Tambah Kelompok</b> untuk mendapatkan Kode Kelompok unik.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="main" style={{ gap: 10 }}>
                      {activeClassGroups.map((grp) => {
                        const isEditing = editingGroupId === grp.id;
                        const isConfirmingDelete = confirmDeleteGroupId === grp.id;
                        const grpImpact = getGroupImpact(data, grp.id);

                        return (
                          <div
                            key={grp.id}
                            className="card soft"
                            style={{ padding: '12px 14px' }}
                          >
                            {isEditing ? (
                              <div>
                                <Field id={`edit-name-${grp.id}`} label="Ubah Nama Kelompok">
                                  <input
                                    id={`edit-name-${grp.id}`}
                                    className="in"
                                    value={editGroupName}
                                    onChange={(e) => setEditGroupName(e.target.value)}
                                  />
                                </Field>
                                <Field id={`edit-mem-${grp.id}`} label="Ubah Anggota Kelompok">
                                  <input
                                    id={`edit-mem-${grp.id}`}
                                    className="in"
                                    value={editGroupMembers}
                                    onChange={(e) => setEditGroupMembers(e.target.value)}
                                  />
                                </Field>
                                <Field
                                  id={`readonly-grp-code-${grp.id}`}
                                  label="Kode Kelompok (Tetap Sama)"
                                >
                                  <input
                                    id={`readonly-grp-code-${grp.id}`}
                                    className="in"
                                    value={grp.code}
                                    readOnly
                                    disabled
                                    style={{ background: '#F0F4F8', fontWeight: 800 }}
                                  />
                                </Field>
                                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                                  <Btn
                                    sm
                                    kind="mint"
                                    icon="save"
                                    onClick={() => handleSaveGroupEdit(grp)}
                                  >
                                    Simpan Perubahan
                                  </Btn>
                                  <Btn sm onClick={() => setEditingGroupId(null)}>
                                    Batal
                                  </Btn>
                                </div>
                              </div>
                            ) : isConfirmingDelete ? (
                              <div
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: 12,
                                  background: '#FFF2F0',
                                  border: '2px solid #FFB4A9',
                                }}
                              >
                                <b style={{ color: '#A62B1F', display: 'block', marginBottom: 4 }}>
                                  Konfirmasi Hapus {grp.name}
                                </b>
                                <p className="hint" style={{ color: '#6E2219', fontSize: '0.86rem', marginBottom: 8 }}>
                                  Apakah Anda yakin ingin menghapus <b>{grp.name}</b> (Kode Kelompok: <b>{grp.code}</b>)? Kelas induk (<b>Kelas {grp.className}</b>) tidak akan terhapus.
                                </p>
                                {grpImpact.projectCount > 0 ? (
                                  <div
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: 10,
                                      background: '#FFE4E0',
                                      border: '1.5px solid #E57368',
                                      marginBottom: 10,
                                      fontSize: '0.84rem',
                                      color: '#7A1C12',
                                    }}
                                  >
                                    <b>Peringatan Proyek Siswa:</b> Kelompok <b>{grp.name}</b> sudah memiliki{' '}
                                    <b>{grpImpact.projectCount} data proyek / hasil kerja siswa</b>. Jika Anda mengonfirmasi penghapusan ini, data proyek milik kelompok tersebut juga akan dihapus.
                                  </div>
                                ) : (
                                  <p className="hint" style={{ color: '#6E2219', fontSize: '0.82rem', marginBottom: 10 }}>
                                    Kelompok ini belum memiliki data proyek atau hasil kerja siswa.
                                  </p>
                                )}
                                <div className="row" style={{ gap: 8 }}>
                                  <Btn
                                    sm
                                    kind="coral"
                                    icon="trash"
                                    onClick={() => handleDeleteGroup(grp)}
                                  >
                                    Ya, Hapus
                                  </Btn>
                                  <Btn
                                    sm
                                    onClick={() => setConfirmDeleteGroupId(null)}
                                  >
                                    Batal
                                  </Btn>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="row" style={{ justifyContent: 'space-between' }}>
                                  <div>
                                    <div className="row" style={{ gap: 6 }}>
                                      <h4 style={{ margin: 0 }}>{grp.name}</h4>
                                      <span
                                        className="chip"
                                        style={{
                                          background: '#FFD84D',
                                          fontWeight: 900,
                                          letterSpacing: '0.03em',
                                        }}
                                      >
                                        Kode Kelompok: {grp.code}
                                      </span>
                                      <span className="chip" style={{ fontSize: '0.75rem' }}>
                                        {grpImpact.projectCount > 0
                                          ? `${grpImpact.projectCount} Proyek Aktif`
                                          : 'Belum mulai misi'}
                                      </span>
                                    </div>
                                    <p className="hint" style={{ fontSize: '0.82rem', marginTop: 4 }}>
                                      Kelas: <b>Kelas {grp.className}</b> ({grp.classCode}) · Anggota: {grp.members || '-'}
                                    </p>
                                  </div>
                                </div>
                                <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                  <Btn
                                    sm
                                    icon="copy"
                                    onClick={() =>
                                      copyText(grp.code, `Kode Kelompok ${grp.name}`)
                                    }
                                  >
                                    Salin Kode Kelompok
                                  </Btn>
                                  <Btn
                                    sm
                                    icon="edit"
                                    onClick={() => startEditGroup(grp)}
                                  >
                                    Edit
                                  </Btn>
                                  <Btn
                                    sm
                                    icon="rotate"
                                    onClick={() => handleResetGroupCode(grp)}
                                  >
                                    Atur Ulang Kode
                                  </Btn>
                                  <Btn
                                    sm
                                    kind="coral"
                                    icon="trash"
                                    onClick={() => {
                                      setEditingGroupId(null);
                                      setConfirmDeleteGroupId(grp.id);
                                    }}
                                  >
                                    Hapus
                                  </Btn>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          {/* Daftar Proyek & Hasil Pekerjaan Kelompok Siswa */}
          {projects.length === 0 ? (
            <section className="card" aria-label="Status kosong kelompok" style={{ padding: '28px 24px' }}>
              <AquaTip mood="think">
                <b>Belum ada kelompok yang mengerjakan proyek. Hasil pekerjaan siswa akan muncul di sini setelah mereka mulai belajar.</b>
              </AquaTip>
              <p className="hint" style={{ marginTop: 10 }}>
                Bagikan <b>Kode Kelas</b> dan <b>Kode Kelompok</b> di atas kepada siswa. Saat siswa masuk menggunakan kedua kode tersebut dan mulai mengerjakan misi, progres dan hasil pekerjaannya akan tampil secara otomatis di bagian ini.
              </p>
              <div className="row" style={{ marginTop: 14 }}>
                <Btn kind="orange" icon="flag" onClick={() => go('misi')}>
                  Lihat Daftar Misi
                </Btn>
                <Btn icon="users" onClick={() => go('dashboard')}>
                  Ke Dashboard Siswa
                </Btn>
              </div>
            </section>
          ) : (
            <>
              <div className="card" style={{ padding: '14px 20px' }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="row">
                    <h3 style={{ margin: 0 }}>Proyek & Progres Kelompok Siswa ({filteredList.length})</h3>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    {availableClasses.length > 1 && (
                      <div className="seg" role="group" aria-label="Filter Kelas">
                        <button
                          aria-pressed={filterKelas === 'SEMUA'}
                          onClick={() => setFilterKelas('SEMUA')}
                          style={{ minHeight: 38, padding: '4px 12px', fontSize: '0.85rem' }}
                        >
                          Semua Kelas
                        </button>
                        {availableClasses.map((k) => (
                          <button
                            key={k}
                            aria-pressed={filterKelas === k}
                            onClick={() => setFilterKelas(k)}
                            style={{ minHeight: 38, padding: '4px 12px', fontSize: '0.85rem' }}
                          >
                            Kelas {k}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="seg" role="group" aria-label="Filter Status">
                      {[
                        ['SEMUA', 'Semua Status'],
                        ['selesai', 'Selesai'],
                        ['sedang', 'Sedang mengerjakan'],
                        ['belum', 'Belum mulai'],
                      ].map(([val, lbl]) => (
                        <button
                          key={val}
                          aria-pressed={filterStatus === val}
                          onClick={() => setFilterStatus(val)}
                          style={{ minHeight: 38, padding: '4px 12px', fontSize: '0.85rem' }}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {filteredList.length === 0 ? (
                <div className="card">
                  <p className="hint">Tidak ada kelompok yang sesuai dengan filter yang dipilih.</p>
                </div>
              ) : (
                <div className="pcards">
                  {filteredList.map((p) => {
                    const ev = doneCount(p) >= 2 || p.plan.savedAt ? evaluate(p, 'normal', true) : null;
                    const last = p.sim.history.slice(-1)[0];
                    const isEditingProj = editingProjectId === p.id;
                    const isConfirmingResetProj = confirmResetProjectId === p.id;
                    const isConfirmingDeleteProj = confirmDeleteProjectId === p.id;
                    const projImpact = getProjectImpact(p);
                    return (
                      <section key={p.id} className="card gcard" aria-label={p.group.name}>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <h3>{p.group.name}</h3>
                          <GBadge p={p} />
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink-soft)' }}>
                          Proyek: {p.title || `Proyek ${p.caseName}`}
                        </div>
                        <div className="row" style={{ gap: 6 }}>
                          <span className="chip" style={{ fontSize: '0.78rem', padding: '2px 10px' }}>
                            Kelas {p.group.kelas}
                          </span>
                          {p.group.groupCode && (
                            <span className="chip" style={{ background: '#FFF1BF', fontSize: '0.78rem', padding: '2px 10px' }}>
                              Kode: {p.group.groupCode}
                            </span>
                          )}
                          <span className="chip" style={{ background: '#E8FAFF', fontSize: '0.78rem', padding: '2px 10px' }}>
                            {p.caseName}
                          </span>
                        </div>
                        <p className="hint" style={{ fontSize: '0.82rem' }}>
                          Anggota: {p.group.members || '-'}
                        </p>
                        <div
                          className="progress"
                          role="progressbar"
                          aria-valuenow={pct(p)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <i style={{ width: pct(p) + '%' }} />
                        </div>
                        <div className="row" style={{ justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span className="hint">
                            {doneCount(p)}/7 tahap · {doneCount(p) === 7 ? 'Tuntas' : STAGES[curStage(p) - 1].k}
                          </span>
                          <b>{pct(p)}%</b>
                        </div>
                        <div className="card soft" style={{ padding: '8px 12px', borderRadius: 14, fontSize: '0.88rem' }}>
                          <div>
                            <b>Hitungan:</b>{' '}
                            {ev
                              ? `${fmt(ev.total)} / ${fmt(ev.S.supply)} L`
                              : 'Belum dihitung'}
                          </div>
                          <div style={{ marginTop: 4 }}>
                            <b>Simulasi:</b>{' '}
                            {last ? <Stat st={last.overall} /> : <span className="hint">Belum diuji</span>}
                          </div>
                        </div>

                        {isEditingProj && (
                          <div
                            style={{
                              marginTop: 8,
                              padding: 12,
                              borderRadius: 14,
                              background: '#F4FBFF',
                              border: '2px solid #9BE5F6',
                            }}
                          >
                            <Field
                              id={`edit-proj-title-${p.id}`}
                              label="Nama Proyek"
                              hint={`Kelompok ${p.group.name} (Kelas ${p.group.kelas}) tetap sama dan tidak berubah.`}
                            >
                              <input
                                id={`edit-proj-title-${p.id}`}
                                className="in"
                                type="text"
                                value={editProjectTitle}
                                onChange={(e) => setEditProjectTitle(e.target.value)}
                                placeholder="Nama proyek kelompok"
                                aria-label="Edit Nama Proyek"
                              />
                            </Field>
                            <div style={{ marginTop: 8 }}>
                              <Field id={`edit-proj-case-${p.id}`} label="Misi Kota Air">
                                <select
                                  id={`edit-proj-case-${p.id}`}
                                  className="in"
                                  value={editProjectCaseId}
                                  onChange={(e) => setEditProjectCaseId(e.target.value)}
                                  aria-label="Pilih Misi Kota Air"
                                >
                                  {CASES.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.nama} — Level {m.level} ({fmt(m.supply)} L)
                                    </option>
                                  ))}
                                </select>
                              </Field>
                            </div>
                            <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end', gap: 8 }}>
                              <Btn
                                sm
                                onClick={() => setEditingProjectId(null)}
                              >
                                Batal
                              </Btn>
                              <Btn
                                sm
                                kind="mint"
                                icon="check"
                                onClick={() => handleSaveProjectEdit(p)}
                              >
                                Simpan Perubahan
                              </Btn>
                            </div>
                          </div>
                        )}

                        {isConfirmingResetProj && (
                          <div
                            role="alertdialog"
                            aria-label={`Konfirmasi reset progres proyek ${p.title}`}
                            style={{
                              marginTop: 8,
                              padding: 12,
                              borderRadius: 14,
                              background: '#FFF9E5',
                              border: '2px solid #FFD166',
                            }}
                          >
                            <div style={{ fontWeight: 800, color: '#7A4F00', fontSize: '0.9rem' }}>
                              Reset Progres Proyek "{p.title}"?
                            </div>
                            <p className="hint" style={{ marginTop: 4, color: '#6B4800', fontSize: '0.82rem' }}>
                              Seluruh tahapan ({projImpact.doneStages}/7 tahap), perhitungan alokasi air, rancangan pipa, dan riwayat simulasi pada proyek <b>{p.title}</b> milik <b>{p.group.name}</b> akan dikembalikan ke kondisi awal (0%). Data proyek, kelompok, dan kelas tidak dihapus.
                            </p>
                            <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end', gap: 8 }}>
                              <Btn
                                sm
                                onClick={() => setConfirmResetProjectId(null)}
                              >
                                Batal
                              </Btn>
                              <Btn
                                sm
                                kind="orange"
                                icon="rotate"
                                onClick={() => handleResetProjectProgress(p)}
                              >
                                Ya, Reset Progres
                              </Btn>
                            </div>
                          </div>
                        )}

                        {isConfirmingDeleteProj && (
                          <div
                            role="alertdialog"
                            aria-label={`Konfirmasi hapus proyek ${p.title}`}
                            style={{
                              marginTop: 8,
                              padding: 12,
                              borderRadius: 14,
                              background: '#FFF4F4',
                              border: '2px solid #FF9E9E',
                            }}
                          >
                            <div style={{ fontWeight: 800, color: '#9E1C1C', fontSize: '0.9rem' }}>
                              Hapus Proyek "{p.title}"?
                            </div>
                            {projImpact.hasProgress ? (
                              <p className="hint" style={{ marginTop: 4, color: '#7A2424', fontSize: '0.82rem' }}>
                                <b>Peringatan:</b> Proyek <b>{p.title}</b> milik <b>{p.group.name}</b> sudah memiliki progres pengerjaan ({projImpact.doneStages}/7 tahap selesai{projImpact.hasCalc ? ', data perhitungan alokasi air' : ''}{projImpact.simCount > 0 ? `, serta ${projImpact.simCount} riwayat simulasi` : ''}). Jika dihapus, seluruh hasil kerja siswa pada proyek ini akan terhapus permanen. Data Kelompok <b>{p.group.name}</b> dan Kelas <b>{p.group.kelas}</b> tetap aman.
                              </p>
                            ) : (
                              <p className="hint" style={{ marginTop: 4, color: '#7A2424', fontSize: '0.82rem' }}>
                                Hanya proyek <b>{p.title}</b> yang akan dihapus. Data Kelompok <b>{p.group.name}</b> dan Kelas <b>{p.group.kelas}</b> tidak ikut terhapus.
                              </p>
                            )}
                            <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end', gap: 8 }}>
                              <Btn
                                sm
                                onClick={() => setConfirmDeleteProjectId(null)}
                              >
                                Batal
                              </Btn>
                              <Btn
                                sm
                                kind="coral"
                                icon="trash"
                                onClick={() => handleDeleteProject(p)}
                              >
                                Ya, Hapus
                              </Btn>
                            </div>
                          </div>
                        )}

                        <div className="row" style={{ marginTop: 'auto', paddingTop: 6, gap: 6 }}>
                          <Btn sm className="grow" onClick={() => openSel(p)}>
                            Lihat Detail
                          </Btn>
                          <Btn sm kind="blue" icon="full" onClick={() => openPresForProject(p)}>
                            Presentasi
                          </Btn>
                        </div>
                        <div
                          className="row"
                          style={{
                            paddingTop: 6,
                            borderTop: '1px dashed var(--line)',
                            justifyContent: 'space-between',
                            gap: 6,
                          }}
                        >
                          <Btn
                            sm
                            icon="edit"
                            onClick={() => startEditProject(p)}
                            title={`Edit proyek ${p.title}`}
                          >
                            Edit
                          </Btn>
                          <Btn
                            sm
                            icon="rotate"
                            onClick={() => {
                              setEditingProjectId(null);
                              setConfirmDeleteProjectId(null);
                              setConfirmResetProjectId(p.id);
                            }}
                            title={`Reset progres proyek ${p.title}`}
                          >
                            Reset Progres
                          </Btn>
                          <Btn
                            sm
                            kind="coral"
                            icon="trash"
                            onClick={() => {
                              setEditingProjectId(null);
                              setConfirmResetProjectId(null);
                              setConfirmDeleteProjectId(p.id);
                            }}
                            title={`Hapus proyek ${p.title}`}
                          >
                            Hapus
                          </Btn>
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}



      {presIdx !== null && projects.length > 0 && (
        <GuruPresent
          list={projects}
          idx={presIdx}
          setIdx={setPresIdx as React.Dispatch<React.SetStateAction<number>>}
          onClose={() => {
            setPresIdx(null);
          }}
        />
      )}
    </div>
  );
}
