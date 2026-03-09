import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './layout/Sidebar';
import DashboardPage from './features/dashboard/DashboardPage';
import EmployeesPage from './features/employees/EmployeesPage';
import CreateEmployeePage from './features/employees/CreateEmployeePage';
import DocsPage from './features/docs/DocsPage';
import MobilityPage from './features/mobility/MobilityPage';
import FinancePage from './features/finance/FinancePage';
import EquipmentPage from './features/equipment/EquipmentPage';
import RequestsPage from './features/requests/RequestsPage.jsx';
import WorkPage from './features/work/WorkPage.jsx';
import NotFoundPage from './features/common/NotFoundPage';
import { ROUTE_PATHS, resolvePathByKey } from './navigation/routes.js';

const ROUTE_COMPONENTS = {
  [ROUTE_PATHS.dashboard]: () => <DashboardRoute />,
  [ROUTE_PATHS.employees]: () => <EmployeesPage />,
  '/employees': () => <EmployeesPage />,
  '/colaboradores/novo': () => <CreateEmployeeRoute />,
  [ROUTE_PATHS.docs]: () => <DocsRoute />,
  [ROUTE_PATHS.mobility]: () => <MobilityPage />,
  [ROUTE_PATHS.equipment]: () => <EquipmentPage />,
  [ROUTE_PATHS.finance]: () => <FinancePage />,
  '/financial-requests': () => <FinancePage />,
  [ROUTE_PATHS.rdo]: () => <WorkPage />,
  '/daily-reports': () => <WorkPage />,
  '/os': () => <WorkPage />,
  '/service-orders': () => <WorkPage />,
  [ROUTE_PATHS.hotel]: () => <DashboardRoute />,
  [ROUTE_PATHS.requests]: () => <RequestsPage />,
};

function trimTrailingSlash(pathname) {
  if (!pathname || pathname === '/') return ROUTE_PATHS.dashboard;
  return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
}

export function getPathname(locationString = '') {
  if (!locationString) return ROUTE_PATHS.dashboard;
  const [pathname] = locationString.split('?');
  return trimTrailingSlash(pathname);
}

export function getSearch(locationString = '') {
  if (!locationString) return '';
  const [, ...rest] = locationString.split('?');
  return rest.length ? `?${rest.join('?')}` : '';
}

function getCurrentLocation() {
  return `${trimTrailingSlash(window.location.pathname)}${window.location.search || ''}`;
}

function usePortalRouter() {
  const [location, setLocation] = useState(getCurrentLocation());

  useEffect(() => {
    const onPopState = () => setLocation(getCurrentLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextLocation) => {
    const pathname = getPathname(nextLocation);
    const search = getSearch(nextLocation);
    const normalized = `${pathname}${search}`;
    const current = `${trimTrailingSlash(window.location.pathname)}${window.location.search || ''}`;
    if (normalized !== current) {
      window.history.pushState({}, '', normalized);
    }
    setLocation(normalized);
  }, []);

  return { location, navigate };
}

export const NavigationContext = React.createContext({
  location: ROUTE_PATHS.dashboard,
  path: ROUTE_PATHS.dashboard,
  search: '',
  navigate: () => {},
});

function DashboardRoute() {
  const { navigate } = React.useContext(NavigationContext);
  return <DashboardPage onNavigate={(key, params) => navigate(resolvePathByKey(key, params))} />;
}

function CreateEmployeeRoute() {
  const { navigate } = React.useContext(NavigationContext);
  return <CreateEmployeePage onCreateEmployee={() => navigate(ROUTE_PATHS.employees)} />;
}

function DocsRoute() {
  const { navigate, search } = React.useContext(NavigationContext);
  return <DocsPage search={search} onOpenEmployee={() => navigate(ROUTE_PATHS.employees)} />;
}

export default function HRPortalApp({ user, onLogout }) {
  const { location, navigate } = usePortalRouter();
  const path = getPathname(location);
  const search = getSearch(location);

  // Estado de tema — lê do localStorage e persiste
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('portal_theme') ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const activePath = useMemo(() => {
    if (path === '/employees') return ROUTE_PATHS.employees;
    if (path === '/daily-reports') return ROUTE_PATHS.rdo;
    if (path === '/os') return ROUTE_PATHS.rdo;
    if (path === '/service-orders') return ROUTE_PATHS.rdo;
    if (path === '/financial-requests') return ROUTE_PATHS.finance;
    return path;
  }, [path]);

  const CurrentPage = ROUTE_COMPONENTS[path] || null;

  // Relógio
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('pt-BR'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);


  const [criticalCount, setCriticalCount] = useState(0);
  useEffect(() => {
    fetch('/api/portal/dashboard', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.documentsExpired > 0) setCriticalCount(data.documentsExpired); })
      .catch(() => {});
  }, []);

  return (
    <NavigationContext.Provider value={{ location, path, search, navigate }}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar activePath={activePath} onNavigate={navigate} user={user} onLogout={onLogout} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Topbar */}
          <div style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            padding: '0 20px',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '15px', color: 'var(--text)' }}>
              {/* Título da página fica em branco — cada página tem seu próprio heading */}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Online pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                color: 'var(--green)', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
                  animation: 'pulse 2.4s infinite',
                  display: 'inline-block',
                }} />
                Sistema online
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

              {/* Relógio */}
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                color: 'var(--muted)', letterSpacing: '0.04em',
              }}>
                {clock}
              </div>

              {/* Divider */}
              <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

              {/* Toggle tema */}
              <button
                onClick={toggleTheme}
                title="Alternar tema"
                style={{
                  width: 28, height: 28, borderRadius: '6px',
                  border: '1px solid var(--border)', background: 'var(--surface2)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--muted)',
                  transition: 'all 0.15s',
                }}
              >
                {theme === 'dark' ? (
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Alert bar — só renderiza quando houver críticos */}
          {criticalCount > 0 && (
            <div style={{
              background: 'var(--red-bg)',
              borderBottom: '1px solid var(--red-dim)',
              padding: '9px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexShrink: 0,
            }}>
              <svg width="15" height="15" fill="none" stroke="var(--red)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div style={{ fontSize: '12.5px', color: 'var(--text)', flex: 1 }}>
                <strong style={{ color: 'var(--red)', fontWeight: 600 }}>{criticalCount} colaborador{criticalCount > 1 ? 'es' : ''}</strong>
                {' '}com documentos vencidos {criticalCount > 1 ? 'têm' : 'tem'} embarque nos próximos 7 dias — ação necessária antes da saída.
              </div>
              <div
                onClick={() => navigate(ROUTE_PATHS.docs)}
                style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                  color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em',
                  border: '1px solid var(--red-dim)', padding: '3px 8px', borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                Ver agora →
              </div>
            </div>
          )}

          {/* Conteúdo da página */}
          <main style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
            {CurrentPage ? <CurrentPage /> : <NotFoundPage onNavigate={navigate} />}
          </main>

        </div>
      </div>

      {/* Keyframe para o pulse do online dot */}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </NavigationContext.Provider>
  );
}
