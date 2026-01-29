import React from 'react';
import { ErrorBoundary } from './components';
import HRPortalApp from './HRPortalApp.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <HRPortalApp />
    </ErrorBoundary>
  );
}
