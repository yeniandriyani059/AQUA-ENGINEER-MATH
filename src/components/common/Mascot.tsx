import React from 'react';
import { LOGO_SRC } from '../../assets/logo';

export const NAVY = '#15365B';

export function Logo({ width = 300, style }: { width?: number; style?: React.CSSProperties }) {
  return (
    <img
      src={LOGO_SRC}
      alt="AQUA ENGINEER MATH"
      width="1000"
      height="675"
      decoding="async"
      style={{
        display: 'block',
        width: '100%',
        maxWidth: width,
        height: 'auto',
        objectFit: 'contain',
        ...style,
      }}
    />
  );
}

export function AquaLogoMascot({ x, y, width }: { x: number; y: number; width: number }) {
  const h = (width * 300) / 320;
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={h}
      viewBox="318 0 320 300"
      role="img"
      aria-label="Aqua, maskot tetes air insinyur"
    >
      <defs>
        <clipPath id="mascot-clip">
          <ellipse cx="478" cy="150" rx="158" ry="148" />
        </clipPath>
      </defs>
      <ellipse cx="478" cy="150" rx="158" ry="148" fill="#E8FAFF" />
      <g clipPath="url(#mascot-clip)">
        <image href={LOGO_SRC} x="0" y="0" width="1000" height="675" />
      </g>
      <ellipse cx="478" cy="150" rx="154" ry="144" fill="none" stroke={NAVY} strokeWidth="8" />
    </svg>
  );
}

export function Aqua({ size = 110, mood = 'happy' }: { size?: number; mood?: 'happy' | 'think' | 'sad' }) {
  return (
    <svg
      viewBox="0 0 120 150"
      width={size}
      height={size * 1.25}
      role="img"
      aria-label="Aqua, maskot tetes air insinyur"
    >
      <path
        d="M60 46C60 46 20 76 20 102a40 40 0 0 0 80 0C100 76 60 46 60 46Z"
        fill="#20B8F2"
        stroke={NAVY}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M32 96c0-10 6-20 12-27"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity=".55"
      />
      <path
        d="M30 74A30 30 0 0 1 90 74Z"
        fill="#FFD84D"
        stroke={NAVY}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <rect x="23" y="71" width="74" height="10" rx="5" fill="#FFC21F" stroke={NAVY} strokeWidth="4" />
      <rect x="54" y="42" width="12" height="14" rx="4" fill="#FFC21F" stroke={NAVY} strokeWidth="3" />
      <ellipse cx="45" cy="100" rx="7" ry={mood === 'think' ? 7 : 9} fill={NAVY} />
      <ellipse cx="75" cy="100" rx="7" ry={mood === 'think' ? 7 : 9} fill={NAVY} />
      <circle cx="47.5" cy="96.5" r="2.8" fill="#fff" />
      <circle cx="77.5" cy="96.5" r="2.8" fill="#fff" />
      <ellipse cx="34" cy="113" rx="7" ry="4.5" fill="#FF8BA7" />
      <ellipse cx="86" cy="113" rx="7" ry="4.5" fill="#FF8BA7" />
      {mood === 'sad' ? (
        <path d="M52 120q8-7 16 0" stroke={NAVY} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M51 112q9 10 18 0" stroke={NAVY} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      )}
    </svg>
  );
}

export function Student({ girl = false, size = 100 }: { girl?: boolean; size?: number }) {
  const skin = '#F8C9A0';
  return (
    <svg
      viewBox="0 0 100 140"
      width={size}
      height={size * 1.4}
      role="img"
      aria-label={girl ? 'Insinyur cilik perempuan berhijab' : 'Insinyur cilik laki-laki'}
    >
      <path
        d="M18 138V104a22 22 0 0 1 22-22h20a22 22 0 0 1 22 22v34z"
        fill="#2E8BE6"
        stroke={NAVY}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M40 82l10 14 10-14z" fill="#fff" stroke={NAVY} strokeWidth="3" strokeLinejoin="round" />
      {girl ? (
        <>
          <path
            d="M12 96C10 50 26 26 50 26s40 24 38 70c-8 4-18 2-24-4H36c-6 6-16 8-24 4z"
            fill="#fff"
            stroke={NAVY}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <ellipse cx="50" cy="62" rx="24" ry="25" fill={skin} stroke={NAVY} strokeWidth="3" />
        </>
      ) : (
        <>
          <circle cx="50" cy="60" r="29" fill={skin} stroke={NAVY} strokeWidth="3.5" />
          <path
            d="M22 54c2-12 12-18 28-18s26 6 28 18c-8-6-18-8-28-8s-20 2-28 8z"
            fill="#2B2B3A"
          />
        </>
      )}
      <path d="M22 48A28 26 0 0 1 78 48Z" fill="#FFD84D" stroke={NAVY} strokeWidth="3.5" strokeLinejoin="round" />
      <rect x="16" y="46" width="68" height="9" rx="4.5" fill="#FFC21F" stroke={NAVY} strokeWidth="3.5" />
      <ellipse cx="40" cy="66" rx="5" ry="6.5" fill={NAVY} />
      <ellipse cx="60" cy="66" rx="5" ry="6.5" fill={NAVY} />
      <circle cx="41.8" cy="63.6" r="2" fill="#fff" />
      <circle cx="61.8" cy="63.6" r="2" fill="#fff" />
      <ellipse cx="31" cy="75" rx="5" ry="3.2" fill="#FF8BA7" />
      <ellipse cx="69" cy="75" rx="5" ry="3.2" fill="#FF8BA7" />
      <path d="M44 76q6 7 12 0" stroke={NAVY} strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function StageArt({ k }: { k: number }) {
  const s = { stroke: NAVY, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const g: Record<number, React.ReactNode> = {
    1: (
      <g>
        <circle cx="28" cy="28" r="16" fill="#E8FAFF" {...s} />
        <path d="M28 19s7 7 7 11a7 7 0 0 1-14 0c0-4 7-11 7-11z" fill="#20B8F2" {...s} />
        <path d="M40 40l14 14" strokeWidth="7" stroke={NAVY} strokeLinecap="round" />
      </g>
    ),
    2: (
      <g>
        <rect x="14" y="6" width="36" height="52" rx="8" fill="#fff" {...s} />
        <rect x="20" y="12" width="24" height="12" rx="3" fill="#8DE2FF" {...s} />
        <g fill={NAVY}>
          <circle cx="23" cy="34" r="2.6" />
          <circle cx="32" cy="34" r="2.6" />
          <circle cx="41" cy="34" r="2.6" />
          <circle cx="23" cy="44" r="2.6" />
          <circle cx="32" cy="44" r="2.6" />
          <circle cx="41" cy="44" r="2.6" />
        </g>
      </g>
    ),
    3: (
      <g>
        <rect x="6" y="10" width="52" height="44" rx="8" fill="#BFEFD2" {...s} />
        <path d="M16 46V30l10-8 10 8v16zM40 46V34h10v12" fill="#fff" {...s} />
        <path d="M14 54h36" {...s} />
      </g>
    ),
    4: (
      <g>
        <circle cx="32" cy="32" r="24" fill="#E5DBFF" {...s} />
        <path d="M26 20l18 12-18 12z" fill="#fff" {...s} />
        <path
          d="M8 54q6-5 12 0t12 0 12 0 12 0"
          fill="none"
          stroke="#20B8F2"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </g>
    ),
    5: (
      <g>
        <path d="M8 24l24-12 24 12v26L32 60 8 50z" fill="#F3C98B" {...s} />
        <path d="M8 24l24 12 24-12M32 36v24" fill="none" {...s} />
        <path d="M20 18l24 12v8" fill="none" stroke="#FF8BA7" strokeWidth="5" strokeLinecap="round" />
      </g>
    ),
    6: (
      <g>
        <circle cx="32" cy="32" r="14" fill="#fff" {...s} />
        <path
          d="M32 6v10M32 48v10M6 32h10M48 32h10M14 14l7 7M43 43l7 7M50 14l-7 7M21 43l-7 7"
          {...s}
        />
        <path d="M25 32l5 5 9-10" fill="none" stroke="#1FA971" strokeWidth="4" strokeLinecap="round" />
      </g>
    ),
    7: (
      <g>
        <rect x="6" y="8" width="52" height="34" rx="6" fill="#fff" {...s} />
        <path d="M32 42v10M20 56h24" {...s} />
        <path
          d="M32 14l4 8 9 1-6.5 6 1.5 9-8-4.5-8 4.5 1.5-9-6.5-6 9-1z"
          fill="#FFD84D"
          {...s}
        />
      </g>
    ),
  };
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      {g[k]}
    </svg>
  );
}
