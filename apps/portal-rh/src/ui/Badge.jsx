import React from 'react';
import { cn } from './ui.js';

const tones = {
  gray:   { background: 'var(--surface2)', color: 'var(--muted)',  border: '1px solid var(--border)' },
  blue:   { background: 'var(--blue-bg)',  color: 'var(--blue)',   border: '1px solid var(--blue-dim)' },
  green:  { background: 'var(--green-bg)', color: 'var(--green)',  border: '1px solid var(--green-dim)' },
  yellow: { background: 'var(--amber-bg)', color: 'var(--amber)',  border: '1px solid var(--amber-dim)' },
  amber:  { background: 'var(--amber-bg)', color: 'var(--amber)',  border: '1px solid var(--amber-dim)' },
  red:    { background: 'var(--red-bg)',   color: 'var(--red)',    border: '1px solid var(--red-dim)' },
};

export default function Badge({ tone = 'gray', className, children }) {
  return (
    <span
      className={cn(className)}
      style={{
        display: 'inline-flex',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '9px',
        borderRadius: '3px',
        padding: '2px 6px',
        letterSpacing: '0.04em',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        ...(tones[tone] || tones.gray),
      }}
    >
      {children}
    </span>
  );
}
