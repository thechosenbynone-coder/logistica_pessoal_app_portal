import React, { useState, useMemo } from 'react';
import { Bell } from 'lucide-react';

// Components
import { ErrorBoundary, BottomNav } from './components';

// Hooks
import { useLocalStorageState } from './hooks';

// Features
import { HomeTab } from './features/home';
import { TripTab } from './features/trip';
import { WorkTab } from './features/work';
import { FinanceTab } from './features/finance';
import { ProfileTab } from './features/profile';
import { EquipmentView } from './features/equipment';
import { HistoryView } from './features/history';

// Data
import {
  mockEmployee,
  mockCurrentTrip,
  mockBoarding,
  mockTimeline,
  mockPersonalDocuments,
  mockEmergencyContacts,
  mockEquipment,
  mockEmbarkHistory,
  mockExpenses,
  mockAdvances,
  mockReimbursements,
  createInitialWorkOrders,
} from './data/mockData';

/**
 * EmployeeLogisticsApp
 * Main application component - refactored from 2935 lines to modular architecture.
 */
export default function EmployeeLogisticsApp() {
  // Navigation state
  const [activeTab, setActiveTab] = useState('home');
  const [profileView, setProfileView] = useState('main'); // main | equipment | history

  // Mock secure token for QR code
  const [qrCodeData] = useState('SECURE_TOKEN_V1_748291_HMAC_SIG');

  // Financial state
  const [expenses, setExpenses] = useState(mockExpenses);
  const [advances, setAdvances] = useState(mockAdvances);
  const [reimbursements] = useState(mockReimbursements);

  // Equipment state
  const [equipment, setEquipment] = useState(mockEquipment);

  // Work state
  const initialWorkOrders = useMemo(() => createInitialWorkOrders(), []);
  const [workOrders, setWorkOrders] = useLocalStorageState('el_workOrders', initialWorkOrders);
  const [dailyReports, setDailyReports] = useLocalStorageState('el_dailyReports', []);
  const [syncLog, setSyncLog] = useLocalStorageState('el_syncLog', []);
  const [isOnBase, setIsOnBase] = useLocalStorageState('el_isOnBase', false);

  // Handlers
  const handleCheckIn = async () => {
    // TODO: POST /api/checkins when backend is connected
    console.log('Check-in registered');
  };

  const handleCheckOut = async () => {
    // TODO: POST /api/checkins when backend is connected
    console.log('Check-out registered');
  };

  const handleAddExpense = (expense) => {
    setExpenses((prev) => [...prev, expense]);
  };

  const handleRequestAdvance = (advance) => {
    setAdvances((prev) => [...prev, advance]);
  };

  const handleToggleEquipmentStatus = (id) => {
    setEquipment((prev) =>
      prev.map((eq) =>
        eq.id === id
          ? { ...eq, status: eq.status === 'embarcado' ? 'base' : 'embarcado' }
          : eq
      )
    );
  };

  // Render current view based on active tab
  const renderContent = () => {
    // Handle profile sub-views
    if (activeTab === 'profile') {
      if (profileView === 'equipment') {
        return (
          <EquipmentView
            equipment={equipment}
            onToggleStatus={handleToggleEquipmentStatus}
            onBack={() => setProfileView('main')}
          />
        );
      }
      if (profileView === 'history') {
        return (
          <HistoryView
            embarkHistory={mockEmbarkHistory}
            onBack={() => setProfileView('main')}
          />
        );
      }
      return (
        <ProfileTab
          employee={mockEmployee}
          personalDocuments={mockPersonalDocuments}
          emergencyContacts={mockEmergencyContacts}
          onNavigateToEquipment={() => setProfileView('equipment')}
          onNavigateToHistory={() => setProfileView('history')}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            employee={mockEmployee}
            currentTrip={mockCurrentTrip}
            timeline={mockTimeline}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
        );

      case 'trip':
        return (
          <TripTab
            employee={mockEmployee}
            boarding={mockBoarding}
            qrCodeData={qrCodeData}
          />
        );

      case 'work':
        return (
          <WorkTab
            workOrders={workOrders}
            setWorkOrders={setWorkOrders}
            dailyReports={dailyReports}
            setDailyReports={setDailyReports}
            syncLog={syncLog}
            setSyncLog={setSyncLog}
            isOnBase={isOnBase}
            setIsOnBase={setIsOnBase}
          />
        );

      case 'finance':
        return (
          <FinanceTab
            expenses={expenses}
            advances={advances}
            reimbursements={reimbursements}
            onAddExpense={handleAddExpense}
            onRequestAdvance={handleRequestAdvance}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={mockEmployee.photo}
                alt={mockEmployee.name}
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
              <div>
                <p className="font-semibold">{mockEmployee.name}</p>
                <p className="text-xs text-blue-200">Mat: {mockEmployee.registration}</p>
              </div>
            </div>
            <button className="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4">
          {renderContent()}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== 'profile') {
              setProfileView('main');
            }
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
