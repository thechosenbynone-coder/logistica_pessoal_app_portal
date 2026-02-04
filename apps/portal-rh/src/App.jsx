import React, { useEffect } from 'react';
import { ErrorBoundary } from './components';
import HRPortalApp from './HRPortalApp.jsx';
import { ensureDemoSeedFromRoute, isDemoMode, seedDemoDataIfNeeded } from './services/demoMode';

export default function App() {
  useEffect(() => {
    ensureDemoSeedFromRoute();
    if (isDemoMode()) seedDemoDataIfNeeded();
  }, []);

  return (
    <ErrorBoundary>
      <HRPortalApp />
    </ErrorBoundary>
  );
}
