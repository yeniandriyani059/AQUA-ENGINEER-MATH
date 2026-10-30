import React from 'react';
import { useApp } from '../../context/AppContext';
import { STAGES } from '../../data/stages';
import { StageArt } from '../common/Mascot';
import { Stepper } from './Stepper';
import { AquaTip, Stat, Reqs, Btn } from '../common/UI';

interface MissionWrapperProps {
  n: number;
  title: string;
  tip?: string;
  reqs: { ok: boolean; text: string }[];
  children: React.ReactNode;
}

export function MissionWrapper({ n, title, tip, reqs, children }: MissionWrapperProps) {
  const { proj, patch, go, toast } = useApp();
  if (!proj) return null;

  const S = STAGES[n - 1];
  const all = reqs.every((r) => r.ok);
  const done = !!proj.stageDone[n];

  const finish = () => {
    patch((d) => {
      d.stageDone[n] = true;
    });
    toast(
      n < 7
        ? `Tahap ${S.k} selesai! Tahap berikutnya terbuka.`
        : 'Semua tahap selesai. Hebat, insinyur cilik!'
    );
    if (n < 7) go('petualangan', n + 1, true);
  };

  return (
    <div className="main">
      <div className="card" style={{ background: S.c }}>
        <div className="row">
          <div className="art" style={{ width: 90 }}>
            <StageArt k={n} />
          </div>
          <div className="grow">
            <span className="chip">
              Tahap {n} dari 7 · {S.k}
            </span>
            <h1 style={{ marginTop: 6 }}>{title}</h1>
          </div>
          {done && <Stat st="ok">Tahap selesai</Stat>}
        </div>
      </div>
      <Stepper />
      {tip && <AquaTip>{tip}</AquaTip>}
      {children}
      <div className="card soft">
        <h3 style={{ marginBottom: 8 }}>Syarat menyelesaikan tahap ini</h3>
        <Reqs items={reqs} />
        <div className="row" style={{ marginTop: 14 }}>
          {n > 1 && (
            <Btn sm icon="left" onClick={() => go('petualangan', n - 1)}>
              Sebelumnya
            </Btn>
          )}
          <Btn kind="orange" disabled={!all || done} onClick={finish} icon="check">
            {done ? 'Sudah selesai' : 'Tandai tahap selesai'}
          </Btn>
          {done && n < 7 && (
            <Btn kind="blue" onClick={() => go('petualangan', n + 1, true)}>
              Lanjut ke tahap {n + 1}
            </Btn>
          )}
          {!all && <span className="hint">Lengkapi syarat di atas dahulu.</span>}
        </div>
      </div>
    </div>
  );
}
