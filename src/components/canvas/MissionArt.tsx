import React from 'react';
import { NAVY, AquaLogoMascot } from '../common/Mascot';
import { caseById } from '../../data/cases';
import { Glyph } from './Glyph';

export function MissionArt({ id }: { id: string }) {
  const c = caseById(id);
  const A = c.art;
  const n = c.fac.length;
  const xs = n > 4 ? [44, 97, 150, 203, 256] : [48, 116, 184, 252];
  const sc = n > 4 ? 0.46 : 0.58;
  const gy = 128;
  const deco = A.decor;

  return (
    <svg
      viewBox="0 0 300 190"
      width="100%"
      role="img"
      aria-label={'Ilustrasi misi ' + c.nama}
      style={{ display: 'block' }}
    >
      <rect width="300" height="190" fill={A.sky} />
      {deco === 'sun' && (
        <circle cx="262" cy="34" r="16" fill="#FFD84D" stroke={NAVY} strokeWidth="3" />
      )}
      {deco === 'dry' && (
        <circle cx="258" cy="36" r="22" fill="#FFB020" stroke={NAVY} strokeWidth="3" />
      )}
      {deco === 'heart' && (
        <path
          d="M262 52c-16-10-20-20-13-27 5-4 10-3 13 2 3-5 8-6 13-2 7 7 3 17-13 27z"
          fill="#FF8BA7"
          stroke={NAVY}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {deco === 'storm' && (
        <g>
          <path
            d="M200 44a14 14 0 0 1 26-6a12 12 0 0 1 20 6a10 10 0 0 1-2 20h-40a10 10 0 0 1-4-20z"
            fill="#8FA1C7"
            stroke={NAVY}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <g stroke="#20B8F2" strokeWidth="3.5" strokeLinecap="round">
            <path d="M212 72l-4 10M226 72l-4 10M240 72l-4 10" />
          </g>
        </g>
      )}
      {deco === 'fest' && (
        <g>
          <path d="M0 18Q150 52 300 18" fill="none" stroke={NAVY} strokeWidth="2.5" />
          {[28, 66, 104, 150, 196, 234, 272].map((x, i) => (
            <path
              key={x}
              d={`M${x - 8} ${[22, 31, 38, 41, 37, 30, 21][i]}h16l-8 14z`}
              fill={
                ['#FF8BA7', '#FFD84D', '#8CE6B2', '#BFA8FF', '#FF8BA7', '#FFD84D', '#8CE6B2'][i]
              }
              stroke={NAVY}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          ))}
        </g>
      )}
      <path
        d={`M0 ${gy - 8}q75-14 150 0t150 0V190H0z`}
        fill={A.ground}
        stroke={NAVY}
        strokeWidth="3"
      />
      {deco === 'dry' && (
        <g stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".55">
          <path d="M10 170l12-8-8-8 12-8M120 176l10-6-6-8M270 168l-10-8 8-8" />
        </g>
      )}
      {deco === 'flower' && (
        <g>
          {[
            [14, 178],
            [286, 176],
            [150, 184],
          ].map(([x, y]) => (
            <g key={x} transform={`translate(${x} ${y})`}>
              <circle r="5" fill="#FF8BA7" stroke={NAVY} strokeWidth="2" />
              <circle r="2" fill="#FFD84D" />
            </g>
          ))}
        </g>
      )}
      <g stroke={NAVY} strokeWidth="9" strokeLinecap="round" fill="none">
        <path d={`M150 66V${gy + 22}M${xs[0]} ${gy + 22}H${xs[n - 1]}`} />
        {xs.slice(0, n).map((x) => (
          <path key={x} d={`M${x} ${gy + 22}V${gy + 6}`} />
        ))}
      </g>
      <g stroke="#20B8F2" strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d={`M150 66V${gy + 22}M${xs[0]} ${gy + 22}H${xs[n - 1]}`} />
        {xs.slice(0, n).map((x) => (
          <path key={x} d={`M${x} ${gy + 22}V${gy + 6}`} />
        ))}
      </g>
      <g transform="translate(150 40) scale(.62)">
        <Glyph id="tank" />
      </g>
      {c.fac.map((f, i) => (
        <g key={f.id} transform={`translate(${xs[i]} ${gy + 4}) scale(${sc})`}>
          <Glyph id={f.glyph} />
        </g>
      ))}
      <AquaLogoMascot x={6} y={6} width={46} />
    </svg>
  );
}
