import React, { useMemo, useState } from 'react';
import {
  BedDouble, ClipboardList, FileText, HardHat, LayoutDashboard,
  Plane, Users, Wallet, MessageSquareMore,
} from 'lucide-react';
import { currentUser } from '../services/currentUser';
import { ROUTE_PATHS } from '../navigation/routes.js';

const NAV = [
  {
    title: 'Principal',
    items: [
      { key: 'dashboard', path: ROUTE_PATHS.dashboard, label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Operação',
    items: [
      { key: 'mobility',  path: ROUTE_PATHS.mobility,  label: 'Escala e Embarque', icon: Plane },
      { key: 'equipment', path: ROUTE_PATHS.equipment, label: 'EPIs',               icon: HardHat },
      { key: 'hotel',     path: ROUTE_PATHS.hotel,     label: 'Hotelaria',           icon: BedDouble },
      { key: 'work',      path: ROUTE_PATHS.rdo,       label: 'RDOs',               icon: ClipboardList },
    ],
  },
  {
    title: 'RH',
    items: [
      { key: 'employees', path: ROUTE_PATHS.employees, label: 'Colaboradores',  icon: Users },
      { key: 'docs',      path: ROUTE_PATHS.docs,      label: 'Documentações',  icon: FileText },
      { key: 'requests',  path: ROUTE_PATHS.requests,  label: 'Solicitações',   icon: MessageSquareMore },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { key: 'finance', path: ROUTE_PATHS.finance, label: 'Gestão Financeira', icon: Wallet },
    ],
  },
];

// Badges de contagem por módulo — em produção viriam da API
const BADGES = {
  equipment: { count: 4,  tone: 'warn' },   // EPIs pendentes
  work:      { count: 7,  tone: 'alert' },  // RDOs para revisar
  docs:      { count: 3,  tone: 'alert' },  // Docs vencidos
};

export default function Sidebar({ activePath, onNavigate, user: portalUser, onLogout: _onLogout }) {
  const [hovered, setHovered] = useState(false);

  const user = useMemo(() => ({
    name:   portalUser?.name || 'Jéssica',
    role:   portalUser?.role || currentUser.role || 'RH · Operação',
    initials: (portalUser?.name || 'Jéssica').charAt(0).toUpperCase(),
  }), [portalUser]);

  const sidebarStyle = {
    width:      hovered ? '220px' : '56px',
    minWidth:   hovered ? '220px' : '56px',
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s',
    flexShrink: 0,
    position: 'relative',
    zIndex: 100,
    boxShadow: hovered ? 'var(--shadow)' : 'none',
  };

  const labelStyle = {
    opacity:   hovered ? 1 : 0,
    transform: hovered ? 'translateX(0)' : 'translateX(-6px)',
    transition: 'opacity 0.16s 0.05s, transform 0.16s 0.05s',
    fontSize: '13px',
    fontWeight: 500,
    flex: 1,
    whiteSpace: 'nowrap',
    color: 'var(--text)',
  };

  const fadeStyle = {
    opacity:   hovered ? 1 : 0,
    transform: hovered ? 'translateX(0)' : 'translateX(-6px)',
    transition: 'opacity 0.16s 0.06s, transform 0.16s 0.06s',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  };

  return (
    <aside
      style={sidebarStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Menu lateral"
    >
      {/* Logo */}
      <div style={{
        padding: '14px 13px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '10px',
        minHeight: '52px', overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, minWidth: 30,
          background: 'var(--amber)', borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '11px', color: '#000',
        }}>
          RH
        </div>
        <div style={fadeStyle}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '13px', color: 'var(--text)', lineHeight: 1.2 }}>
            Portal RH
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Offshore · Ops
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV.map((group) => (
          <div key={group.title} style={{ marginBottom: '16px' }}>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--muted)', padding: '0 0 4px 18px',
              whiteSpace: 'nowrap', overflow: 'hidden',
              opacity: hovered ? 1 : 0, transition: 'opacity 0.15s 0.04s',
            }}>
              {group.title}
            </div>

            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activePath === item.path;
              const badge = BADGES[item.key];

              return (
                <a
                  key={item.key}
                  href={item.path}
                  onClick={(e) => { e.preventDefault(); onNavigate(item.path); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: isActive ? '8px 13px 8px 11px' : '8px 13px',
                    cursor: 'pointer', textDecoration: 'none',
                    background: isActive ? 'var(--surface2)' : 'transparent',
                    borderLeft: isActive ? '2px solid var(--amber)' : '2px solid transparent',
                    color: isActive ? 'var(--amber)' : 'var(--muted)',
                    transition: 'all 0.15s',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--surface2)';
                      e.currentTarget.style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--muted)';
                    }
                  }}
                >
                  <Icon size={18} style={{ minWidth: 18, flexShrink: 0 }} />
                  <span style={labelStyle}>{item.label}</span>
                  {badge && (
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', fontWeight: 500,
                      background: badge.tone === 'warn' ? 'var(--amber-bg)' : 'var(--red)',
                      color: badge.tone === 'warn' ? 'var(--amber)' : '#fff',
                      border: badge.tone === 'warn' ? '1px solid var(--amber-dim)' : 'none',
                      borderRadius: '3px', padding: '1px 4px',
                      opacity: hovered ? 1 : 0, transition: 'opacity 0.15s 0.08s',
                      flexShrink: 0,
                    }}>
                      {badge.count}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer usuário */}
      <div style={{
        padding: '10px 13px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '10px',
        overflow: 'hidden', flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, minWidth: 30, borderRadius: '50%',
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Syne', sans-serif", fontSize: '11px', fontWeight: 800,
          color: 'var(--amber)',
        }}>
          {user.initials}
        </div>
        <div style={fadeStyle}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{user.name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {user.role}
          </div>
        </div>
      </div>
    </aside>
  );
}
