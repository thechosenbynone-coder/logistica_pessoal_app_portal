import React from 'react';
import { cn } from './ui.js';

const styles = {
  primary: {
    background: 'var(--amber)',
    color: '#000',
    border: 'none',
  },
  secondary: {
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
  danger: {
    background: 'var(--red-bg)',
    color: 'var(--red)',
    border: '1px solid var(--red-dim)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
  },
};

export default function Button({ variant = 'primary', className, style, ...props }) {
  return (
    <button
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '6px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'opacity 0.15s',
        ...(styles[variant] || styles.primary),
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      {...props}
    />
  );
}
