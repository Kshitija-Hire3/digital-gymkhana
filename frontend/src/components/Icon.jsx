const P = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z', calendar: 'M3 6h18v15H3zM3 10h18M8 3v4M16 3v4', clipboard: 'M9 4h6v3H9zM7 5H5v16h14V5h-2',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', chart: 'M4 21V10h4v11M10 21V4h4v17M16 21v-8h4v8',
  award: 'M12 3l2 5 5 .5-4 3.5 1.2 5L12 14l-4.2 3 1.2-5L5 8.5 10 8z', bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', logout: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', eyeoff: 'M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.6M6.6 6.7A17 17 0 0 0 2 12s4 6 10 6a9.6 9.6 0 0 0 4-.9',
  menu: 'M4 6h16M4 12h16M4 18h16', shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4', plus: 'M12 5v14M5 12h14',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20a7 7 0 0 1 14 0M17 4a3.5 3.5 0 0 1 0 7M22 20a6 6 0 0 0-4-5.6',
  megaphone: 'M3 10v4h3l8 4V6L6 10zM18 9a4 4 0 0 1 0 6', database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14', file: 'M6 3h9l4 4v14H6zM14 3v5h5', settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 .5-1.5-1L15 4h-4l-.5 2.5-1.5 1L7 7 5 11l2 1v1l-2 1 2 4 2-.5 1.5 1L11 20h4l.5-2.5 1.5-1 2 .5 2-4-2-1z',
  check: 'M5 12l5 5 9-10', x: 'M6 6l12 12M18 6 6 18', up: 'M12 19V5M5 12l7-7 7 7', down: 'M12 5v14M19 12l-7 7-7-7', trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z', download: 'M12 3v12M6 11l6 6 6-6M4 21h16', refresh: 'M20 11a8 8 0 1 0-2 6M20 4v7h-7',
};
export default function Icon({ name, size = 18, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[name] || P.file} />
    </svg>
  );
}
