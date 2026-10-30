import React, { useState, useEffect } from 'react';
import { Icon } from '../icons/Icon';
import { Aqua } from './Mascot';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: '' | 'orange' | 'blue' | 'yellow' | 'mint' | 'coral';
  sm?: boolean;
  icon?: string;
  children?: React.ReactNode;
}

export function Btn({ kind = '', sm = false, icon, children, className = '', ...rest }: BtnProps) {
  return (
    <button className={`btn ${kind} ${sm ? 'sm' : ''} ${className}`.trim()} {...rest}>
      {icon && <Icon n={icon} size={20} />}
      {children}
    </button>
  );
}

interface ModalProps {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}

export function Modal({ title, onClose, wide = false, children }: ModalProps) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);

  return (
    <div
      className="modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={wide ? { maxWidth: 820 } : undefined}
      >
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2>{title}</h2>
          <Btn sm icon="x" onClick={onClose} aria-label="Tutup">
            Tutup
          </Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AquaTip({
  mood,
  tone,
  children,
}: {
  mood?: 'happy' | 'think' | 'sad';
  tone?: '' | 'ok' | 'bad';
  children: React.ReactNode;
}) {
  return (
    <div className="tip">
      <Aqua size={58} mood={mood} />
      <div className={`bubble ${tone || ''}`.trim()}>{children}</div>
    </div>
  );
}

const LBL: Record<string, string> = {
  ok: 'Terpenuhi',
  warn: 'Perlu perhatian',
  bad: 'Melanggar',
  idle: 'Belum diisi',
};

const SIC: Record<string, string> = {
  ok: 'check',
  warn: 'alert',
  bad: 'x',
};

export function Stat({ st, children }: { st: 'ok' | 'warn' | 'bad' | 'idle'; children?: React.ReactNode }) {
  return (
    <span className={`stat ${st}`}>
      <Icon n={SIC[st] || 'info'} size={15} sw={3} />
      {children || LBL[st]}
    </span>
  );
}

export function Reqs({ items }: { items: { ok: boolean; text: string }[] }) {
  return (
    <ul className="list req">
      {items.map((r, i) => (
        <li key={i} className={r.ok ? 'yes' : 'no'}>
          <Icon n={r.ok ? 'check' : 'lock'} size={20} />
          <span>{r.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Calc() {
  const [disp, setDisp] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const num = () => parseFloat(disp.replace(',', '.')) || 0;
  const out = (v: number) => String(Math.round(v * 1e6) / 1e6).replace('.', ',');
  const apply = (a: number, o: string, b: number) =>
    o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : b === 0 ? NaN : a / b;

  const press = (k: string) => {
    if (/\d/.test(k)) {
      setDisp(fresh || disp === '0' ? k : disp + k);
      setFresh(false);
    } else if (k === ',') {
      if (!disp.includes(',')) {
        setDisp(fresh ? '0,' : disp + ',');
        setFresh(false);
      }
    } else if (k === 'C') {
      setDisp('0');
      setAcc(null);
      setOp(null);
      setFresh(true);
    } else if (k === '=') {
      if (op !== null && acc !== null) {
        const r = apply(acc, op, num());
        setDisp(isNaN(r) ? 'Tak bisa ÷ 0' : out(r));
        setAcc(null);
        setOp(null);
        setFresh(true);
      }
    } else {
      const cur = num();
      if (op !== null && acc !== null && !fresh) {
        const r = apply(acc, op, cur);
        setAcc(r);
        setDisp(isNaN(r) ? 'Tak bisa ÷ 0' : out(r));
      } else {
        setAcc(cur);
      }
      setOp(k);
      setFresh(true);
    }
  };

  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', ',', 'C', '+'];

  return (
    <div className="calc" role="group" aria-label="Kalkulator">
      <div className="scr" aria-live="polite">
        {disp}
      </div>
      {keys.map((k) => (
        <button
          key={k}
          className={'÷×−+'.includes(k) ? 'op' : k === 'C' ? 'clr' : ''}
          onClick={() => press(k)}
          aria-label={
            k === '÷'
              ? 'bagi'
              : k === '×'
              ? 'kali'
              : k === '−'
              ? 'kurang'
              : k === '+'
              ? 'tambah'
              : k === 'C'
              ? 'hapus'
              : k === ','
              ? 'koma'
              : k
          }
        >
          {k}
        </button>
      ))}
      <button className="eq" style={{ gridColumn: '1/-1' }} onClick={() => press('=')}>
        =
      </button>
    </div>
  );
}
