import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from './layout/Sidebar';
import DashboardPage from './features/dashboard/DashboardPage';
import EmployeesPage from './features/employees/EmployeesPage';
import EquipmentPage from './features/equipment/EquipmentPage';
import DocsPage from './features/docs/DocsPage';

// IMPORTAÇÃO CORRIGIDA (SEM CHAVES)
import api from './services/api';

export default function HRPortalApp() {
  const [activePage, setActivePage] = useState('dashboard');
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.employees.list();
        setEmployees(data.employees || []);
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  // Mantenha seu switch-case e o retorno original
  // ...

  return (
    <div className="flex">
      <Sidebar active={activePage} onNavigate={setActivePage} />
      <main className="flex-1">
        {activePage === 'dashboard' && <DashboardPage employees={employees} />}
      </main>
    </div>
  );
}
