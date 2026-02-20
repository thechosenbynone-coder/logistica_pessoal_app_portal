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
import ModulePlaceholderPage from './features/common/ModulePlaceholderPage';
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
  [ROUTE_PATHS.hotel]: () => <ModulePlaceholderPage title="Hotelaria" />,
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

export default function HRPortalApp() {
  const { location, navigate } = usePortalRouter();
  const path = getPathname(location);
  const search = getSearch(location);

  const activePath = useMemo(() => {
    if (path === '/employees') return ROUTE_PATHS.employees;
    if (path === '/daily-reports') return ROUTE_PATHS.rdo;
    if (path === '/os') return ROUTE_PATHS.rdo;
    if (path === '/service-orders') return ROUTE_PATHS.rdo;
    if (path === '/financial-requests') return ROUTE_PATHS.finance;
    return path;
  }, [path]);

  const CurrentPage = ROUTE_COMPONENTS[path] || null;

  return (
    <NavigationContext.Provider value={{ location, path, search, navigate }}>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar activePath={activePath} onNavigate={navigate} />
        <main className="flex-1 p-8">
          {CurrentPage ? <CurrentPage /> : <NotFoundPage onNavigate={navigate} />}
        </main>
      </div>
    </NavigationContext.Provider>
  );
}
