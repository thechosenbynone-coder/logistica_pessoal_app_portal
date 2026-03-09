import React from 'react';
import { cn } from './ui.js';

export default function Card({ className, children }) {
  return (
    <div
      className={cn(className)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
