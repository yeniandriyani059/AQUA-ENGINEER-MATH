import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { uid, nowIso, sameGroup } from '../../utils/storage';
import {
  createSalt,
  hashPassword,
  verifyPassword,
  validateStudentAccess,
} from '../../utils/access';
import { caseById } from '../../data/cases';
import { Modal, Field, Btn, AquaTip } from '../common/UI';
import { Aqua } from '../common/Mascot';
import { Icon } from '../icons/Icon';
import { TeacherAccount } from '../../types';

interface TeacherAuthPanelProps {
  onSuccess?: () => void;
}

export function TeacherAuthPanel({ onSuccess }: TeacherAuthPanelProps) {
  const { data, setData, setTeacherSession, toast, go } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(() =>
    data.teachers.length === 0 ? 'register' : 'login'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErr('Email atau nama pengguna Guru wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setErr('Kata sandi Guru minimal 6 karakter.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        const cleanName = name.trim();
        if (!cleanName) {
          setErr('Nama lengkap Ibu/Bapak Guru wajib diisi.');
          setBusy(false);
          return;
        }
        if (password !== confirmPassword) {
          setErr('Konfirmasi kata sandi belum sama. Silakan periksa kembali.');
          setBusy(false);
          return;
        }
        const exists = data.teachers.some(
          (t) => t.email.toLowerCase() === cleanEmail
        );
        if (exists) {
          setErr('Email atau nama pengguna tersebut sudah terdaftar. Silakan pilih "Masuk Guru".');
          setBusy(false);
          return;
        }

        const salt = createSalt();
        const passwordHash = await hashPassword(password, salt);
        const newTeacher: TeacherAccount = {
          id: uid(),
          name: cleanName,
          email: cleanEmail,
          school: school.trim() || undefined,
          passwordSalt: salt,
          passwordHash,
          createdAt: nowIso(),
        };

        setData((d) => ({
          ...d,
          teachers: [...d.teachers, newTeacher],
        }));

        const ts = {
          id: newTeacher.id,
          name: newTeacher.name,
          email: newTeacher.email,
          school: newTeacher.school,
          loggedInAt: nowIso(),
        };
        setTeacherSession(ts);
        toast(`Selamat datang, ${newTeacher.name}! Akun Guru berhasil dibuat.`);
        if (onSuccess) onSuccess();
        go('guru');
      } else {
        const found = data.teachers.find(
          (t) => t.email.toLowerCase() === cleanEmail
        );
        if (!found) {
          setErr(
            data.teachers.length === 0
              ? 'Belum ada akun Guru yang terdaftar di perangkat ini. Silakan pilih "Daftar Akun Guru" terlebih dahulu.'
              : 'Akun Guru tidak ditemukan. Periksa kembali email/nama pengguna Anda.'
          );
          setBusy(false);
          return;
        }

        const valid = await verifyPassword(
          password,
          found.passwordSalt,
          found.passwordHash
        );
        if (!valid) {
          setErr('Kata sandi Guru belum sesuai. Silakan coba lagi.');
          setBusy(false);
          return;
        }

        const ts = {
          id: found.id,
          name: found.name,
          email: found.email,
          school: found.school,
          loggedInAt: nowIso(),
        };
        setTeacherSession(ts);
        toast(`Selamat datang kembali, ${found.name}!`);
        if (onSuccess) onSuccess();
        go('guru');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div
        className="seg"
        style={{ marginBottom: 14 }}
        role="group"
        aria-label="Pilih mode autentikasi guru"
      >
        <button
          type="button"
          aria-pressed={mode === 'login'}
          onClick={() => {
            setMode('login');
            setErr('');
          }}
        >
          Masuk Guru
        </button>
        <button
          type="button"
          aria-pressed={mode === 'register'}
          onClick={() => {
            setMode('register');
            setErr('');
          }}
        >
          Daftar Akun Guru
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <>
            <Field
              id="t-name"
              label="Nama Ibu / Bapak Guru"
              hint="Contoh: Bu Guru Yennia"
            >
              <input
                id="t-name"
                className="in"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bu Guru Yennia"
                autoComplete="name"
              />
            </Field>
            <Field
              id="t-school"
              label="Nama Sekolah (Opsional)"
              hint="Contoh: SD Negeri 1 Aqua City"
            >
              <input
                id="t-school"
                className="in"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="SD Negeri 1 Aqua City"
                autoComplete="organization"
              />
            </Field>
          </>
        )}

        <Field
          id="t-email"
          label="Email atau Username Guru"
          hint="Contoh: guru@sekolah.sch.id"
        >
          <input
            id="t-email"
            className="in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guru@sekolah.sch.id"
            autoComplete="username"
          />
        </Field>

        <Field
          id="t-pass"
          label="Kata Sandi Guru"
          hint="Minimal 6 karakter"
        >
          <input
            id="t-pass"
            className="in"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi..."
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </Field>

        {mode === 'register' && (
          <Field
            id="t-confirm"
            label="Ulangi Kata Sandi"
            hint="Pastikan sama dengan kata sandi di atas"
          >
            <input
              id="t-confirm"
              className="in"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang kata sandi..."
              autoComplete="new-password"
            />
          </Field>
        )}

        {err && (
          <div style={{ marginTop: 10 }}>
            <AquaTip mood="sad" tone="bad">
              {err}
            </AquaTip>
          </div>
        )}

        <div className="row" style={{ marginTop: 14 }}>
          <Btn kind="orange" type="submit" icon="lock" disabled={busy}>
            {mode === 'register' ? 'Daftar & Masuk Dashboard Guru' : 'Masuk ke Dashboard Guru'}
          </Btn>
          <Btn
            type="button"
            icon="left"
            onClick={() => go('beranda')}
          >
            Kembali ke Halaman Awal
          </Btn>
        </div>

        <p className="hint" style={{ marginTop: 10 }}>
          Catatan: Data akun guru, kelas, dan kelompok saat ini disimpan pada peramban perangkat ini dan belum tersinkronisasi lintas perangkat selama backend belum terintegrasi.
        </p>
      </form>
    </div>
  );
}

interface AccessModalProps {
  onClose: () => void;
  pending?: string | null;
}

export function AccessModal({ onClose, pending }: AccessModalProps) {
  const {
    data,
    setData,
    setSession,
    unlock,
    toast,
    go,
    startMission,
  } = useApp();

  const [classCode, setClassCode] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [err, setErr] = useState('');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');

    const res = validateStudentAccess(
      data.classes,
      data.groups,
      classCode,
      groupCode
    );

    if (!res.ok || !res.session || !res.group || !res.classRoom) {
      setErr(
        res.error ||
          'Kode Kelas atau Kode Kelompok belum tepat. Coba periksa kembali bersama gurumu ya!'
      );
      return;
    }

    const sess = res.session;
    setSession(sess);

    const groupProjs = data.projects.filter((p) => sameGroup(p.group, sess));
    groupProjs.forEach((p) => unlock(p.id));

    toast(`Selamat datang, ${sess.name} (Kelas ${sess.kelas})!`);
    onClose();

    if (pending) {
      startMission(pending, sess);
    } else if (groupProjs.length > 0) {
      const latest = groupProjs
        .slice()
        .sort((a, b) => (b.updated > a.updated ? 1 : -1))[0];
      setData((d) => ({ ...d, currentId: latest.id }));
      go('dashboard');
    } else {
      setData((d) => ({ ...d, currentId: null }));
      go('dashboard');
    }
  };

  return (
    <Modal
      title="Masuk sebagai Siswa"
      onClose={onClose}
    >
      {pending && (
        <div
          className="card soft"
          style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 14 }}
        >
          Misi yang dipilih: <b>{caseById(pending).nama}</b>
        </div>
      )}

      <div>
        <div
          className="card soft"
          style={{
            padding: '12px 14px',
            marginBottom: 14,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <Aqua size={54} mood="happy" />
          <div style={{ fontSize: '0.9rem' }}>
            <b>Halo, Insinyur Cilik!</b>
            <p className="hint" style={{ marginTop: 2 }}>
              Masukkan <b>Kode Kelas</b> dan <b>Kode Kelompok</b> yang diberikan oleh Ibu/Bapak Guru untuk membuka ruang proyek kelompokmu.
            </p>
          </div>
        </div>

        <form onSubmit={handleStudentSubmit}>
          <Field
            id="s-class-code"
            label="Kode Kelas"
            hint="Contoh: AQUA-5A-26 (diberikan oleh Guru)"
          >
            <input
              id="s-class-code"
              className="in"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              autoComplete="off"
              placeholder="AQUA-5A-26"
              style={{ fontWeight: 800, letterSpacing: '0.04em' }}
            />
          </Field>

          <Field
            id="s-group-code"
            label="Kode Kelompok"
            hint="Contoh: LUMBA-01 (diberikan oleh Guru)"
          >
            <input
              id="s-group-code"
              className="in"
              value={groupCode}
              onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
              autoComplete="off"
              placeholder="LUMBA-01"
              style={{ fontWeight: 800, letterSpacing: '0.04em' }}
            />
          </Field>

          {err && (
            <div style={{ marginTop: 10 }}>
              <AquaTip mood="sad" tone="bad">
                {err}
              </AquaTip>
            </div>
          )}

          <div className="row" style={{ marginTop: 16 }}>
            <Btn
              kind="orange"
              type="submit"
              icon="rocket"
              disabled={!classCode.trim() || !groupCode.trim()}
            >
              Masuk ke Ruang Proyek
            </Btn>
            <Btn
              type="button"
              icon="left"
              onClick={() => {
                onClose();
                go('beranda');
              }}
            >
              Kembali ke Halaman Awal
            </Btn>
          </div>

          <p className="hint" style={{ marginTop: 10 }}>
            Siswa tidak perlu memasukkan email, membuat akun, atau membuat kode sendiri.
          </p>
        </form>

        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '2px dashed #B8D4EE',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <span className="hint">Anda adalah Ibu/Bapak Guru?</span>
          <Btn
            sm
            kind="blue"
            icon="eye"
            onClick={() => {
              onClose();
              go('guru');
            }}
          >
            Masuk sebagai Guru
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
