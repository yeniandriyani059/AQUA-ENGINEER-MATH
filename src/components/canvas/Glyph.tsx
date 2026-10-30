import React from 'react';
import { NAVY } from '../common/Mascot';

const BLD: Record<string, [string, string, string]> = {
  toilet: ['#C9F1FF', '#8CE6B2', 'wc'],
  kantin: ['#FFE9A8', '#FF8BA7', 'cup'],
  keran: ['#E8FAFF', '#20B8F2', 'drop'],
  igd: ['#FFFFFF', '#FF8BA7', 'cross'],
  ranap: ['#E5DBFF', '#BFA8FF', 'bed'],
  lab: ['#D8F7E7', '#40D9D0', 'flask'],
  dapur: ['#FFE9A8', '#FF8A1F', 'pot'],
  stan: ['#FFFFFF', '#FFD84D', 'cup'],
  posair: ['#E8FAFF', '#0875D1', 'drop'],
  pkes: ['#FFFFFF', '#8CE6B2', 'cross'],
};

function BldSym({ k }: { k: string }) {
  const s = { stroke: NAVY, strokeWidth: 2.4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  if (k === 'cross') {
    return (
      <g>
        <rect x="-3.5" y="-10" width="7" height="20" rx="2" fill="#FF5C7A" {...s} />
        <rect x="-10" y="-3.5" width="20" height="7" rx="2" fill="#FF5C7A" {...s} />
      </g>
    );
  }
  if (k === 'drop') {
    return <path d="M0-10s9 9 9 15a9 9 0 0 1-18 0c0-6 9-15 9-15z" fill="#20B8F2" {...s} />;
  }
  if (k === 'cup') {
    return (
      <g>
        <path d="M-8-8h16l-2 17h-12z" fill="#FF8A1F" {...s} />
        <path d="M8-3q6 0 6 5t-7 4" fill="none" {...s} />
      </g>
    );
  }
  if (k === 'bed') {
    return (
      <g>
        <rect x="-11" y="-2" width="22" height="9" rx="3" fill="#fff" {...s} />
        <rect x="-11" y="-8" width="8" height="7" rx="3" fill="#FF8BA7" {...s} />
      </g>
    );
  }
  if (k === 'flask') {
    return <path d="M-4-10h8M-3-10v7l-8 13h22l-8-13v-7" fill="#8CE6B2" {...s} />;
  }
  if (k === 'pot') {
    return (
      <g>
        <path d="M-11-2h22v10a4 4 0 0 1-4 4h-14a4 4 0 0 1-4-4z" fill="#C98B5B" {...s} />
        <path d="M-15 1h4M11 1h4M-5-8q2-4 0-6M3-8q2-4 0-6" fill="none" {...s} />
      </g>
    );
  }
  return (
    <text y="5" textAnchor="middle" fontSize="15" fontWeight="800" fill={NAVY} fontFamily="Baloo 2, sans-serif">
      WC
    </text>
  );
}

function GlyphBase({ id }: { id: string }) {
  const s = { stroke: NAVY, strokeWidth: 2.8, strokeLinejoin: 'round' as const };
  if (id === 'tank') {
    return (
      <g>
        <path d="M-18 12L-26 36M18 12L26 36M-4 14L-6 36M6 14L8 36" {...s} fill="none" />
        <rect x="-26" y="-22" width="52" height="38" rx="12" fill="#20B8F2" {...s} />
        <ellipse cx="0" cy="-22" rx="26" ry="7" fill="#8DE2FF" {...s} />
        <path d="M0-6s9 9 9 15a9 9 0 0 1-18 0c0-6 9-15 9-15z" fill="#fff" {...s} />
      </g>
    );
  }
  if (id === 'rumah') {
    return (
      <g>
        <rect x="-38" y="-2" width="34" height="30" rx="4" fill="#FFE9A8" {...s} />
        <path d="M-43 0L-21-26 1 0z" fill="#FF8BA7" {...s} />
        <rect x="-26" y="9" width="10" height="19" rx="3" fill="#0875D1" {...s} />
        <rect x="4" y="8" width="34" height="20" rx="4" fill="#C9F1FF" {...s} />
        <path d="M0 10L21-12 42 10z" fill="#BFA8FF" {...s} />
        <rect x="13" y="15" width="16" height="13" rx="2" fill="#FFD84D" {...s} />
      </g>
    );
  }
  if (id === 'sekolah') {
    return (
      <g>
        <path d="M0-34V-48" {...s} />
        <path d="M0-48l14 5-14 5z" fill="#FF8BA7" {...s} />
        <rect x="-34" y="-12" width="68" height="40" rx="5" fill="#FFD84D" {...s} />
        <path d="M-39-12L0-34 39-12z" fill="#FF8BA7" {...s} />
        <rect x="-8" y="8" width="16" height="20" rx="3" fill="#0875D1" {...s} />
        <rect x="-27" y="-2" width="13" height="12" rx="2" fill="#fff" {...s} />
        <rect x="14" y="-2" width="13" height="12" rx="2" fill="#fff" {...s} />
      </g>
    );
  }
  if (id === 'puskesmas') {
    return (
      <g>
        <rect x="-33" y="-14" width="66" height="42" rx="5" fill="#fff" {...s} />
        <rect x="-38" y="-24" width="76" height="12" rx="6" fill="#8CE6B2" {...s} />
        <rect x="-4.5" y="-8" width="9" height="26" rx="2" fill="#FF5C7A" {...s} />
        <rect x="-13" y="0" width="26" height="9" rx="2" fill="#FF5C7A" {...s} />
        <rect x="-28" y="14" width="10" height="14" rx="2" fill="#8DE2FF" {...s} />
        <rect x="18" y="14" width="10" height="14" rx="2" fill="#8DE2FF" {...s} />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="0" cy="30" rx="40" ry="8" fill="#8CE6B2" {...s} />
      <rect x="-21" y="8" width="6" height="22" rx="2" fill="#C98B5B" {...s} />
      <circle cx="-18" cy="-8" r="19" fill="#5FD08A" {...s} />
      <rect x="13" y="12" width="6" height="18" rx="2" fill="#C98B5B" {...s} />
      <circle cx="16" cy="0" r="14" fill="#8CE6B2" {...s} />
      <circle cx="-4" cy="27" r="3.5" fill="#FF8BA7" />
      <circle cx="30" cy="26" r="3.5" fill="#FFD84D" />
    </g>
  );
}

export function Glyph({ id }: { id: string }) {
  const s = { stroke: NAVY, strokeWidth: 2.8, strokeLinejoin: 'round' as const };
  if (BLD[id]) {
    const [wall, roof, sym] = BLD[id];
    return (
      <g>
        <rect x="-33" y="-8" width="66" height="38" rx="5" fill={wall} {...s} />
        <path d="M-40-8L0-34 40-8z" fill={roof} {...s} />
        <rect x="-5" y="18" width="10" height="12" rx="2" fill="#0875D1" {...s} />
        <g transform="translate(0 6) scale(.85)">
          <BldSym k={sym} />
        </g>
      </g>
    );
  }
  if (id === 'kebun') {
    return (
      <g>
        <rect x="-38" y="6" width="76" height="26" rx="8" fill="#C98B5B" {...s} />
        <path d="M-26 6v-8M-8 6v-12M10 6v-8M28 6v-12" {...s} fill="none" />
        <circle cx="-26" cy="-4" r="7" fill="#5FD08A" {...s} />
        <circle cx="-8" cy="-8" r="7" fill="#FF8BA7" {...s} />
        <circle cx="10" cy="-4" r="7" fill="#5FD08A" {...s} />
        <circle cx="28" cy="-8" r="7" fill="#FFD84D" {...s} />
      </g>
    );
  }
  if (id === 'kolam') {
    return (
      <g>
        <ellipse cx="0" cy="14" rx="40" ry="20" fill="#8CE6B2" {...s} />
        <ellipse cx="0" cy="14" rx="30" ry="14" fill="#20B8F2" {...s} />
        <path d="M-12 14q8-8 16 0q-8 8-16 0zM4 14l7-5v10z" fill="#FF8A1F" {...s} />
      </g>
    );
  }
  if (id === 'pohon') {
    return (
      <g>
        <rect x="-6" y="6" width="12" height="26" rx="3" fill="#C98B5B" {...s} />
        <circle cx="0" cy="-8" r="26" fill="#5FD08A" {...s} />
        <circle cx="-10" cy="-12" r="4" fill="#fff" opacity=".6" />
        <circle cx="12" cy="0" r="3.5" fill="#FF8BA7" />
      </g>
    );
  }
  if (id === 'tenda') {
    return (
      <g>
        <path d="M-38 30L0-26 38 30z" fill="#FFD84D" {...s} />
        <path d="M0-26L-14 30M0-26L14 30" fill="none" {...s} />
        <path d="M-10 30L0 8l10 22z" fill="#0875D1" {...s} />
        <path d="M0-26v-14l12 5-12 5" fill="#FF8BA7" {...s} />
      </g>
    );
  }
  if (id === 'panggung') {
    return (
      <g>
        <rect x="-38" y="12" width="76" height="18" rx="4" fill="#BFA8FF" {...s} />
        <path d="M-34 12V-16h68V12" fill="#FFE9A8" {...s} />
        <path d="M-34-16q8 10 0 28M34-16q-8 10 0 28" fill="#FF8BA7" {...s} />
        <path
          d="M0-10l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"
          fill="#FFD84D"
          {...s}
        />
      </g>
    );
  }
  return <GlyphBase id={id} />;
}
