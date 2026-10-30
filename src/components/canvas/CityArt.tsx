import React from 'react';
import { NAVY, AquaLogoMascot, Student } from '../common/Mascot';
import { Glyph } from './Glyph';

const FACADE: Record<string, [number, number, number]> = {
  tank: [300, 100, 1.35],
  rumah: [80, 200, 1],
  sekolah: [190, 205, 1],
  puskesmas: [410, 205, 1],
  taman: [520, 205, 1],
};

export function CityArt({ people = false }: { people?: boolean }) {
  const vb = people ? '0 0 600 400' : '0 0 600 320';
  return (
    <svg
      viewBox={vb}
      width="100%"
      role="img"
      aria-label="Ilustrasi Aqua City dengan rumah, sekolah, puskesmas, taman, dan tangki air"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8DE2FF" />
          <stop offset="1" stopColor="#E8FAFF" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width={594}
        height={people ? 394 : 314}
        rx="28"
        fill="url(#sky)"
        stroke={NAVY}
        strokeWidth="4"
      />
      <circle cx="530" cy="52" r="28" fill="#FFD84D" stroke={NAVY} strokeWidth="3.5" />
      <g fill="#fff" stroke={NAVY} strokeWidth="3">
        <path d="M60 60a16 16 0 0 1 30-6a14 14 0 0 1 22 8a12 12 0 0 1-4 0H66a10 10 0 0 1-6-2z" />
        <path d="M380 34a13 13 0 0 1 25-5a11 11 0 0 1 18 7H382a8 8 0 0 1-2-2z" />
      </g>
      <path
        d={`M4 215q150-20 300 0t292 0V${people ? 370 : 290}a24 24 0 0 1-24 24H28A24 24 0 0 1 4 ${
          people ? 370 : 290
        }z`}
        fill="#8CE6B2"
        stroke={NAVY}
        strokeWidth="4"
      />
      <g stroke={NAVY} strokeWidth="12" strokeLinecap="round" fill="none">
        <path d="M300 150V270M82 238V270M190 238V270M410 238V270M520 238V270M82 270H520" />
      </g>
      <g stroke="#20B8F2" strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M300 150V270M82 238V270M190 238V270M410 238V270M520 238V270M82 270H520" />
      </g>
      {['rumah', 'sekolah', 'puskesmas', 'taman', 'tank'].map((k) => (
        <g key={k} transform={`translate(${FACADE[k][0]} ${FACADE[k][1]}) scale(${FACADE[k][2]})`}>
          <Glyph id={k} />
        </g>
      ))}
      {people && (
        <g>
          <svg x="60" y="225" width="120" height="168" viewBox="0 0 100 140">
            <Student girl={false} size={100} />
          </svg>
          <svg x="425" y="225" width="120" height="168" viewBox="0 0 100 140">
            <Student girl={true} size={100} />
          </svg>
          <AquaLogoMascot x={236} y={262} width={128} />
        </g>
      )}
    </svg>
  );
}
