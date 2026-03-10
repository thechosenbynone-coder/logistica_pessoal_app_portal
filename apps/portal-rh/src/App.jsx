import React from 'react';
import { ErrorBoundary } from './components';
import HRPortalApp from './HRPortalApp.jsx';

const DEFAULT_USER = { id: 1, name: 'Jéssica', role: 'RH · Operação' };

export default function App() {
  return (
    <ErrorBoundary>
      <HRPortalApp user={DEFAULT_USER} onLogout={() => {}} />
    </ErrorBoundary>
  );
}
