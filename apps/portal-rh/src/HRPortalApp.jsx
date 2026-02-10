import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './layout/Sidebar';
import DashboardPage from './features/dashboard/DashboardPage';
import EmployeesPage from './features/employees/EmployeesPage';
import EquipmentPage from './features/equipment/EquipmentPage';
import DocsPage from './features/docs/DocsPage';
import FinancePage from './features/finance/FinancePage';
import MobilityPage from './features/mobility/MobilityPage';
import HotelPage from './features/hotel/HotelPage';
import WorkPage from './features/work/WorkPage';
import api from './services/api';
import CreateEmployeePage from './features/employees/CreateEmployeePage';

export default function HRPortalApp() {
  // Must start on Dashboard
  const [activePage, setActivePage] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [focus, setFocus] = useState(null);
  const [storageTick, setStorageTick] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadEmployees() {
      try {
        const data = await api.employees.list();
        if (isMounted) {
          setEmployees(data.employees || []);
        }
      } catch (err) {
        console.error('Failed to load employees', err);
      }
    }
    loadEmployees();
    return () => {
      isMounted = false;
    };
  }, []);


  useEffect(() => {
    const onUpdate = () => setStorageTick((t) => t + 1);
    window.addEventListener('portal_rh_xlsx_updated', onUpdate);
    return () => window.removeEventListener('portal_rh_xlsx_updated', onUpdate);
  }, []);

  const openEmployee = useCallback((employeeId, tab = 'overview') => {
    setActivePage('employees');
    setFocus({ employeeId, tab });
  }, []);

  const onSidebarNavigate = useCallback((pageKey) => {
    setActivePage(pageKey || 'dashboard');
    if (pageKey !== 'employees') setFocus(null);
  }, []);

  const normalizeCPF = (cpf) => (cpf || '').toString().replace(/\D/g, '');

  const createEmployee = useCallback((newEmployee) => {
    setEmployees((prev) => {
      const cpf = normalizeCPF(newEmployee.cpf);
      const exists = prev.some((e) => normalizeCPF(e.cpf) === cpf);
      if (exists) return prev;
      return [...prev, newEmployee];
    });
    openEmployee(newEmployee.id, 'overview');
  }, [openEmployee, setEmployees]);

  const page = useMemo(() => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage employees={employees} onOpenEmployee={openEmployee} />;
      case 'employees':
        return (
          <EmployeesPage
            employees={employees}
            focus={focus}
            onFocusHandled={() => setFocus(null)}
            onOpenEmployee={openEmployee}
          />
        );
      case 'equipment':
        return <EquipmentPage employees={employees} onOpenEmployee={openEmployee} />;
      case 'docs':
        return <DocsPage onOpenEmployee={openEmployee} />;
      case 'finance':
        return <FinancePage />;
      case 'mobility':
        return <MobilityPage employees={employees} onOpenEmployee={openEmployee} />;
      case 'hotel':
        return <HotelPage employees={employees} onOpenEmployee={openEmployee} />;
      case 'work':
        return <WorkPage employees={employees} onOpenEmployee={openEmployee} />;
      case 'employeeCreate':
        return <CreateEmployeePage employees={employees} onCreateEmployee={createEmployee} />;
      default:
        // Safety fallback so you never get an empty white screen
        return <DashboardPage employees={employees} onOpenEmployee={openEmployee} />;
    }
  }, [activePage, employees, focus, openEmployee, createEmployee, storageTick]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        {/* Always-visible icon sidebar that expands on hover (desktop) */}
        <Sidebar active={activePage} onNavigate={onSidebarNavigate} />

        {/* Main content must always render */}
        <div className="flex-1 min-w-0">
          <main className="p-4 sm:p-6 lg:p-8">{page}</main>
        </div>
      </div>
    </div>
  );
}
