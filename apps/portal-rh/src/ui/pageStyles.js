// Estilos compartilhados entre páginas — sem dependências externas

export const panel = (extra = {}) => ({
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  overflow: 'hidden',
  ...extra,
});

export const chip = (tone = 'muted') => {
  const tones = {
    muted:  { background: 'var(--surface2)', color: 'var(--muted)',  border: '1px solid var(--border)' },
    red:    { background: 'var(--red-bg)',   color: 'var(--red)',    border: '1px solid var(--red-dim)' },
    amber:  { background: 'var(--amber-bg)', color: 'var(--amber)',  border: '1px solid var(--amber-dim)' },
    green:  { background: 'var(--green-bg)', color: 'var(--green)',  border: '1px solid var(--green-dim)' },
    blue:   { background: 'var(--blue-bg)',  color: 'var(--blue)',   border: '1px solid var(--blue-dim)' },
    orange: { background: 'var(--orange-bg)',color: 'var(--orange)', border: '1px solid var(--orange-dim)' },
  };
  return {
    display: 'inline-flex',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '9px', borderRadius: '3px', padding: '2px 6px',
    letterSpacing: '0.04em', fontWeight: 500, whiteSpace: 'nowrap',
    ...(tones[tone] || tones.muted),
  };
};

export const monoLabel = (extra = {}) => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '9px', textTransform: 'uppercase',
  letterSpacing: '0.1em', color: 'var(--muted)',
  ...extra,
});

export const pageTitle = (extra = {}) => ({
  fontFamily: "'Syne', sans-serif",
  fontWeight: 800, fontSize: '15px', color: 'var(--text)',
  ...extra,
});

export const secTitle = (extra = {}) => ({
  fontFamily: "'Syne', sans-serif",
  fontWeight: 800, fontSize: '12px', color: 'var(--text)',
  ...extra,
});

export const tabStyle = (active) => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
  padding: '5px 12px', borderRadius: '4px', cursor: 'pointer',
  transition: 'all 0.15s',
  ...(active
    ? { background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-dim)' }
    : { background: 'transparent', color: 'var(--muted)', border: '1px solid transparent' }),
});

export const actionBtn = (ghost = false) => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '9px', fontWeight: 500,
  borderRadius: '3px', padding: '3px 7px',
  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
  transition: 'opacity 0.15s',
  ...(ghost
    ? { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)' }
    : { background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-dim)' }),
});

export const thStyle = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
  color: 'var(--muted)', padding: '8px 12px', textAlign: 'left',
  background: 'var(--bg)', borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};

export const tdStyle = (extra = {}) => ({
  padding: '9px 12px', fontSize: '12px', color: 'var(--text)', ...extra,
});
