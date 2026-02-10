import React, { useEffect, useMemo, useState } from 'react';
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
import api from './services/api';

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

  const [employee, setEmployee] = useState(mockEmployee);
  const [currentTrip, setCurrentTrip] = useState(mockCurrentTrip);
  const [timeline] = useState(mockTimeline);
  const [boarding] = useState(mockBoarding);
  const [deploymentId, setDeploymentId] = useState(null);
  // Financial state
  const [expenses, setExpenses] = useState(mockExpenses);
  const [advances, setAdvances] = useState(mockAdvances);
  const [reimbursements] = useState(mockReimbursements);

  // Equipment state
  const [equipment, setEquipment] = useState(mockEquipment);

  // Mock secure token for QR code
  const [qrCodeData, setQrCodeData] = useState('SECURE_TOKEN_V1_748291_HMAC_SIG');

  // Work state
  const initialWorkOrders = useMemo(() => createInitialWorkOrders(), []);
  const [workOrders, setWorkOrders] = useLocalStorageState('el_workOrders', initialWorkOrders);
  const [dailyReports, setDailyReports] = useLocalStorageState('el_dailyReports', []);
  const [syncLog, setSyncLog] = useLocalStorageState('el_syncLog', []);
  const [isOnBase, setIsOnBase] = useLocalStorageState('el_isOnBase', false);

  useEffect(() => {
    let isMounted = true;

    const statusMap = {
      ACTIVE: 'Embarcado',
      IN_TRANSIT: 'Em Trânsito',
      SCHEDULED: 'Agendado',
      COMPLETED: 'Concluído',
      CANCELLED: 'Cancelado',
    };

    const transportMap = {
      HELICOPTER: 'Helicóptero',
      BOAT: 'Barco',
    };

    const assetStatusMap = {
      ON_BOARD: 'embarcado',
      ON_BASE: 'base',
      LOST: 'pendente',
      RETURNED: 'base',
    };

    async function loadData() {
      try {
        const profileData = await api.profile.get();
        if (profileData?.user && isMounted) {
          const deployment = profileData.currentDeployment || null;
          setEmployee({
            name: profileData.user.name,
            registration: profileData.user.registration,
            currentStatus: statusMap[deployment?.status] || mockEmployee.currentStatus,
            photo: profileData.user.photoUrl || mockEmployee.photo,
          });

          if (deployment) {
            setDeploymentId(deployment.id);
            const embarkDate = new Date(deployment.embarkDate);
            const disembarkDate = new Date(deployment.disembarkDate);
            const daysRemaining = Math.max(
              0,
              Math.ceil((embarkDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            );
            setCurrentTrip({
              destination: deployment.destination,
              embarkDate: deployment.embarkDate,
              disembarkDate: deployment.disembarkDate,
              daysRemaining,
              location: deployment.location,
              transportation: transportMap[deployment.transportType] || mockCurrentTrip.transportation,
            });
            setQrCodeData((prev) => deployment.qrCodeData || prev);
          }

          if (Array.isArray(profileData.assets)) {
            setEquipment(
              profileData.assets.map((asset) => ({
                id: asset.id,
                name: asset.name,
                code: asset.code,
                status: assetStatusMap[asset.status] || 'base',
                condition: asset.condition || 'bom',
                required: asset.isRequired,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      }

      const [expensesResult, advancesResult] = await Promise.allSettled([
        api.expenses.list(),
        api.advances.list(),
      ]);

      if (isMounted && expensesResult.status === 'fulfilled') {
        const mappedExpenses = (expensesResult.value.expenses || []).map((expense) => ({
          id: expense.id,
          type: expense.type,
          value: Number(expense.value),
          date: expense.date,
          description: expense.description,
          receipt: Boolean(expense.receiptUrl),
          status: (expense.status || 'PENDING').toLowerCase(),
          trip: expense.deployment?.destination || mockCurrentTrip.destination,
        }));
        if (mappedExpenses.length) setExpenses(mappedExpenses);
      }

      if (isMounted && advancesResult.status === 'fulfilled') {
        const mappedAdvances = (advancesResult.value.advances || []).map((advance) => ({
          id: advance.id,
          value: Number(advance.value),
          date: advance.date,
          status: (advance.status || 'PENDING').toLowerCase(),
          trip: advance.deployment?.destination || mockCurrentTrip.destination,
          justification: advance.justification,
          used: 0,
        }));
        if (mappedAdvances.length) setAdvances(mappedAdvances);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handlers
  const handleCheckIn = async () => {
    await api.checkins.create({
      type: 'CHECK_IN',
      latitude: -22.9068,
      longitude: -43.1729,
      address: 'Rio de Janeiro, RJ',
    });
    console.log('Check-in registered');
  };

  const handleCheckOut = async () => {
    await api.checkins.create({
      type: 'CHECK_OUT',
      latitude: -22.9068,
      longitude: -43.1729,
      address: 'Rio de Janeiro, RJ',
    });
    console.log('Check-out registered');
  };

  const handleAddExpense = async (expense) => {
    try {
      const created = await api.expenses.create({
        type: expense.type,
        value: expense.value,
        date: expense.date,
        description: expense.description,
        ...(deploymentId ? { deploymentId } : {}),
      });
      if (created?.expense) {
        setExpenses((prev) => [
          ...prev,
          {
            id: created.expense.id,
            type: created.expense.type,
            value: Number(created.expense.value),
            date: created.expense.date,
            description: created.expense.description,
            receipt: Boolean(created.expense.receiptUrl),
            status: (created.expense.status || 'PENDING').toLowerCase(),
            trip: currentTrip.destination,
          },
        ]);
        return;
      }
    } catch (err) {
      console.error('Failed to create expense', err);
    }

    setExpenses((prev) => [...prev, expense]);
  };

  const handleRequestAdvance = async (advance) => {
    try {
      if (!deploymentId) {
        throw new Error('No deployment available for advance request');
      }
      const created = await api.advances.create({
        value: advance.value,
        justification: advance.justification,
        deploymentId,
      });
      if (created?.advance) {
        setAdvances((prev) => [
          ...prev,
          {
            id: created.advance.id,
            value: Number(created.advance.value),
            date: created.advance.date || advance.date,
            status: (created.advance.status || 'PENDING').toLowerCase(),
            trip: currentTrip.destination,
            justification: created.advance.justification || advance.justification,
            used: 0,
          },
        ]);
        return;
      }
    } catch (err) {
      console.error('Failed to request advance', err);
    }

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
          employee={employee}
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
            employee={employee}
            currentTrip={currentTrip}
            timeline={timeline}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
        );

      case 'trip':
        return (
          <TripTab
            employee={employee}
            boarding={boarding}
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
                src={employee.photo}
                alt={employee.name}
                className="w-10 h-10 rounded-full border-2 border-white/30"
              />
              <div>
                <p className="font-semibold">{employee.name}</p>
                <p className="text-xs text-blue-200">Mat: {employee.registration}</p>
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
