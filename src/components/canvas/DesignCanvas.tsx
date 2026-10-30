import React, { useState, useRef } from 'react';
import { NAVY } from '../common/Mascot';
import { Glyph } from './Glyph';
import { caseOf, scenOf, evaluate, reachable, nameOf, glyphOf, ek, clamp, fmt } from '../../utils/math';
import { Project } from '../../types';

interface DesignCanvasProps {
  project: Project;
  onPatchProject?: (fn: (d: Project) => void) => void;
  editable?: boolean;
  scen?: string;
  flow?: boolean;
}

export function DesignCanvas({
  project,
  onPatchProject,
  editable = true,
  scen = 'normal',
  flow = false,
}: DesignCanvasProps) {
  const c = caseOf(project);
  const d = project.design;
  const S = scenOf(c)[scen] || scenOf(c).normal;
  const ev = evaluate(project, scen, true);
  const reach = reachable(d, S.cut);

  const ref = useRef<SVGSVGElement | null>(null);
  const drag = useRef<string | null>(null);
  const [mode, setMode] = useState<'move' | 'connect'>('move');
  const [sel, setSel] = useState<string | null>(null);

  const pt = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = ref.current;
    if (!s) return { x: 0, y: 0 };
    const p = s.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(s.getScreenCTM()!.inverse());
  };

  const toggle = (a: string, b: string) => {
    if (!onPatchProject) return;
    onPatchProject((x) => {
      const k = ek(a, b);
      const i = x.design.edges.indexOf(k);
      if (i >= 0) x.design.edges.splice(i, 1);
      else x.design.edges.push(k);
    });
  };

  const down = (id: string, e: React.PointerEvent<SVGGElement>) => {
    if (!editable) return;
    if (mode === 'connect') {
      if (!sel) setSel(id);
      else if (sel === id) setSel(null);
      else {
        toggle(sel, id);
        setSel(null);
      }
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = id;
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const id = drag.current;
    if (!id || !onPatchProject) return;
    const q = pt(e);
    onPatchProject((x) => {
      x.design.pos[id] = {
        x: clamp(Math.round(q.x), 55, 545),
        y: clamp(Math.round(q.y), 65, 335),
      };
    });
  };

  const up = () => {
    drag.current = null;
  };

  const ringCol = { ok: '#1FA971', warn: '#E0A400', bad: '#D6304F' };
  const placedIds = ['tank', ...c.fac.map((f) => f.id)].filter((id) => d.placed[id]);

  return (
    <div>
      {editable && (
        <div className="row" style={{ marginBottom: 10 }}>
          <div className="seg" role="group" aria-label="Mode kerja">
            <button
              aria-pressed={mode === 'move'}
              onClick={() => {
                setMode('move');
                setSel(null);
              }}
            >
              Geser bangunan
            </button>
            <button
              aria-pressed={mode === 'connect'}
              onClick={() => setMode('connect')}
            >
              Hubungkan pipa
            </button>
          </div>
          <span className="hint">
            {mode === 'move'
              ? 'Seret bangunan untuk memindahkannya.'
              : sel
              ? `Pilih bangunan kedua untuk dihubungkan dengan ${nameOf(c, sel)}.`
              : 'Ketuk dua bangunan untuk membuat atau menghapus pipa.'}
          </span>
        </div>
      )}
      <div className="canvas">
        <svg
          ref={ref}
          viewBox="0 0 600 380"
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="img"
          aria-label="Peta desain Aqua City"
        >
          <rect width="600" height="380" fill="#BDEFFF" />
          <path d="M0 120Q150 90 300 125T600 110V380H0z" fill="#CFF5D9" />
          <path
            d="M0 340q50-14 100 0t100 0 100 0 100 0 100 0 100 0V380H0z"
            fill="#8DE2FF"
            stroke={NAVY}
            strokeWidth="3"
          />
          <g stroke={NAVY} strokeWidth="2" opacity=".08">
            {[100, 200, 300, 400, 500].map((x) => (
              <path key={x} d={`M${x} 0V380`} />
            ))}
            {[100, 200, 300].map((y) => (
              <path key={y} d={`M0 ${y}H600`} />
            ))}
          </g>
          {d.edges.map((k) => {
            const [a, b] = k.split('|');
            if (!d.placed[a] || !d.placed[b] || !d.pos[a] || !d.pos[b]) return null;
            const A = d.pos[a];
            const B = d.pos[b];
            const cut = S.cut.includes(k);
            const act = flow && !cut && reach.has(a) && reach.has(b);

            return (
              <g key={k}>
                <path
                  d={`M${A.x} ${A.y}L${B.x} ${B.y}`}
                  stroke={NAVY}
                  strokeWidth="13"
                  strokeLinecap="round"
                />
                <path
                  d={`M${A.x} ${A.y}L${B.x} ${B.y}`}
                  stroke={cut ? '#FF8BA7' : '#20B8F2'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={cut ? '4 12' : 'none'}
                />
                {act && (
                  <path
                    className="flow"
                    d={`M${A.x} ${A.y}L${B.x} ${B.y}`}
                    stroke="#fff"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                )}
                {cut && (
                  <g transform={`translate(${(A.x + B.x) / 2} ${(A.y + B.y) / 2})`}>
                    <circle r="14" fill="#D6304F" stroke={NAVY} strokeWidth="3" />
                    <path d="M-6-6L6 6M6-6L-6 6" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
                  </g>
                )}
              </g>
            );
          })}
          {placedIds.map((id) => {
            const P = d.pos[id] || { x: 300, y: 75 };
            const row = ev.rows.find((r) => r.id === id);
            const labelWidth = Math.max(104, nameOf(c, id).length * 7.4 + 14);

            return (
              <g
                key={id}
                transform={`translate(${P.x} ${P.y})`}
                style={{ cursor: editable ? (mode === 'move' ? 'grab' : 'pointer') : 'default' }}
                onPointerDown={(e) => down(id, e)}
              >
                {sel === id && (
                  <circle r="52" fill="none" stroke="#FF8A1F" strokeWidth="5" strokeDasharray="8 6" />
                )}
                {flow && row && (
                  <circle
                    r="50"
                    fill="rgba(255,255,255,.55)"
                    stroke={ringCol[row.status]}
                    strokeWidth="5"
                  />
                )}
                <g transform="scale(.9)">
                  <Glyph id={glyphOf(c, id)} />
                </g>
                <g transform="translate(0 52)">
                  <rect
                    x={-labelWidth / 2}
                    y="-12"
                    width={labelWidth}
                    height={row ? 34 : 20}
                    rx="10"
                    fill="#fff"
                    stroke={NAVY}
                    strokeWidth="2.5"
                  />
                  <text
                    y="3"
                    textAnchor="middle"
                    fontSize="12.5"
                    fontWeight="800"
                    fill={NAVY}
                    fontFamily="Nunito,sans-serif"
                  >
                    {nameOf(c, id)}
                  </text>
                  {row && (
                    <text
                      y="18"
                      textAnchor="middle"
                      fontSize="12.5"
                      fontWeight="800"
                      fill={ringCol[row.status] === '#E0A400' ? '#8A6200' : ringCol[row.status]}
                      fontFamily="Nunito,sans-serif"
                    >
                      {flow ? `${fmt(row.got)} / ${fmt(row.need)} L` : `${fmt(row.alloc)} L`}
                    </text>
                  )}
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
