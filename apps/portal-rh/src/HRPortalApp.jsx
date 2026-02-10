// apps/portal-rh/src/HRPortalApp.jsx
import React, { useEffect, useState } from 'react';
import Sidebar from './layout/Sidebar';
import DashboardPage from './features/dashboard/DashboardPage';
import EmployeesPage from './features/employees/EmployeesPage';
import CreateEmployeePage from './features/employees/CreateEmployeePage';
import api from './services/api';

export default function HRPortalApp() {
  const [activePage, setActivePage] = useState('dashboard');
  const [employees, setEmployees] = useState([]);

  // Função para carregar os dados do banco
  const loadEmployees = async () => {
    try {
      const data = await api.employees.list();
      setEmployees(data.employees || data); // Aceita array direto ou objeto com chave
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage employees={employees} />;
      case 'employees':
        return <EmployeesPage employees={employees} onRefresh={loadEmployees} />;
      case 'employeeCreate':
        return <CreateEmployeePage onCreateEmployee={() => {
          loadEmployees(); // Atualiza a lista após criar
          setActivePage('employees'); // Volta para a listagem
        }} />;
      default:
        return <DashboardPage employees={employees} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar active={activePage} onNavigate={setActivePage} />
      <main className="flex-1 p-8">
        {renderPage()}
      </main>
    </div>
  );
}
