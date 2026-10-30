import React from 'react';

export const ICONS: Record<string, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
  target: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  rocket: 'M12 15l-3-3a22 22 0 0 1 2-4a12 12 0 0 1 11-5c0 3-1 8-5 11a22 22 0 0 1-4 2zM9 12H4s.5-3 2-4c1.5-1 5 0 5 0M12 15v5s3-.5 4-2c1-1.5 0-5 0-5',
  folder: 'M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  trophy: 'M8 21h8M12 17v4M7 4h10v6a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 11v6M12 7.5v.01',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  check: 'M4 12l5 5L20 6',
  play: 'M7 4l13 8-13 8z',
  pause: 'M8 4v16M16 4v16',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  save: 'M5 3h11l4 4v14H5zM8 3v5h7M8 21v-7h8v7',
  flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
  rotate: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  copy: 'M9 9h11v12H9zM5 15V3h11',
  users: 'M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8M22 20v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  drop: 'M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z',
  link: 'M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  full: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6',
  hand: 'M8 12V5a1.5 1.5 0 0 1 3 0v6M11 11V3.5a1.5 1.5 0 0 1 3 0V11M14 11V5a1.5 1.5 0 0 1 3 0v9a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 14',
  cloud: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 20 11a3.5 3.5 0 0 1-1 7z',
};

interface IconProps {
  n: string;
  size?: number;
  sw?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ n, size = 22, sw = 2.6, className, style }: IconProps) {
  return (
    <svg
      className={className || 'ic'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={ICONS[n] || ''} />
    </svg>
  );
}
