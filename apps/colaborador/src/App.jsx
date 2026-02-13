import React from 'react';
import EmployeeLogisticsApp from './EmployeeLogisticsApp.jsx';
import { AppShell } from './ui/AppShell.jsx';

export default function App() {
  return (
    <AppShell>
      <EmployeeLogisticsApp />
    </AppShell>
  );
}
