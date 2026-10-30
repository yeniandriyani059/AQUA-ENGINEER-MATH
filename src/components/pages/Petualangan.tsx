import React from 'react';
import { useApp } from '../../context/AppContext';
import { STAGES } from '../../data/stages';
import { stageState } from '../../utils/storage';
import { StageArt } from '../common/Mascot';
import { Stepper } from '../stages/Stepper';
import { Stage1Explore } from '../stages/Stage1Explore';
import { Stage2Plan } from '../stages/Stage2Plan';
import { Stage3Design } from '../stages/Stage3Design';
import { Stage4Simulate } from '../stages/Stage4Simulate';
import { Stage5Create } from '../stages/Stage5Create';
import { Stage6Improve } from '../stages/Stage6Improve';
import { Stage7Present } from '../stages/Stage7Present';
import { AquaTip, Btn } from '../common/UI';
import { Icon } from '../icons/Icon';
import { Stage } from '../../types';

const STLBL: Record<string, string> = {
  done: 'Selesai',
  current: 'Sedang dikerjakan',
  locked: 'Terkunci',
  open: 'Terbuka',
  none: 'Belum ada proyek',
};

function JourneyCard({ s }: { s: Stage }) {
  const { proj, go } = useApp();
  const st = stageState(proj, s.n);

  return (
    <article
      className={'jcard ' + (st === 'locked' ? 'locked' : st === 'current' ? 'current' : '')}
      style={{ '--c': s.c } as React.CSSProperties}
    >
      <span className="num">{s.n}</span>
      <div className="art">
        <StageArt k={s.n} />
      </div>
      <h4>{s.k}</h4>
      <div className="sub">{s.t}</div>
      <p>{s.d}</p>
      <span className="status">
        <Icon n={st === 'done' ? 'check' : st === 'locked' ? 'lock' : 'star'} size={14} sw={3} />
        {STLBL[st]}
      </span>
      <Btn
        sm
        kind={st === 'current' ? 'orange' : ''}
        onClick={() => go('petualangan', s.n)}
      >
        {st === 'done'
          ? 'Buka lagi'
          : st === 'current'
          ? 'Lanjutkan'
          : st === 'locked'
          ? 'Terkunci'
          : 'Mulai'}
      </Btn>
    </article>
  );
}

export function Petualangan({ stage }: { stage: number | null }) {
  const { proj, go } = useApp();

  if (!proj) {
    return (
      <div className="main">
        <h1>Mulai Petualangan</h1>
        <div className="card">
          <AquaTip mood="think">
            Pilih salah satu misi dulu, lalu masuk dengan kode kelompok. Dengan begitu pekerjaanmu tersimpan.
          </AquaTip>
          <div style={{ marginTop: 14 }}>
            <Btn kind="orange" onClick={() => go('misi')}>
              Pilih Misi
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  if (stage && stageState(proj, stage) !== 'locked') {
    switch (stage) {
      case 1:
        return <Stage1Explore key={proj.id + '-1'} />;
      case 2:
        return <Stage2Plan key={proj.id + '-2'} />;
      case 3:
        return <Stage3Design key={proj.id + '-3'} />;
      case 4:
        return <Stage4Simulate key={proj.id + '-4'} />;
      case 5:
        return <Stage5Create key={proj.id + '-5'} />;
      case 6:
        return <Stage6Improve key={proj.id + '-6'} />;
      case 7:
        return <Stage7Present key={proj.id + '-7'} />;
      default:
        break;
    }
  }

  return (
    <div className="main">
      <h1>Mulai Petualangan</h1>
      <div className="row">
        <span className="chip">Misi: {proj.caseName}</span>
        <Btn sm onClick={() => go('misi')}>
          Ganti / lihat misi lain
        </Btn>
      </div>
      <Stepper />
      <AquaTip>
        Selesaikan tahap satu per satu. Tahap yang sudah selesai boleh dibuka lagi kapan saja.
      </AquaTip>
      <div className="journey">
        {STAGES.map((s) => (
          <JourneyCard key={s.n} s={s} />
        ))}
      </div>
    </div>
  );
}
