import React, { useEffect } from 'react';
import { ErrorBoundary } from './components';
import HRPortalApp from './HRPortalApp.jsx';
import { ensureDemoSeed } from './services/portalStorage';

export default function App() {
  useEffect(() => {
    ensureDemoSeed();
  }, []);

  return (
    <ErrorBoundary>
      <HRPortalApp />
    </ErrorBoundary>
  );
}
