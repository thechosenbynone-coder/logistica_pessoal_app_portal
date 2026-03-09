import React from 'react';
import { X } from 'lucide-react';
import { cn } from './ui.js';

export default function Modal({ open, title, children, onClose, className }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div
        className={cn(className)}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '640px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--text)' }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px', borderRadius: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, color: 'var(--text)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
