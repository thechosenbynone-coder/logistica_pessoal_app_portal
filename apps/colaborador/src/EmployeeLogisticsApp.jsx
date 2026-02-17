import React, { useMemo, useState } from 'react';
import { Bell, ChevronLeft, Settings, Wifi, WifiOff } from 'lucide-react';
import { FabRadialMenu, LoadingSpinner } from './components';
import { useEmployeeData, useLocalStorageState, useOutboxSync } from './hooks';
import { HomePage } from './features/home';
import { TripTab } from './features/trip';
import { WorkTab } from './features/work';
import { FinanceTab } from './features/finance';
import { ProfileTab } from './features/profile';
import { EquipmentView } from './features/equipment';
import { HistoryView } from './features/history';
import api, { clearAuth } from './services/api';
import {
  mockAdvances,
  mockBoarding,
  mockCurrentTrip,
  mockEmergencyContacts,
  mockEmbarkHistory,
  mockEmployee,
  mockEquipment,
  mockExpenses,
  mockPersonalDocuments,
  mockReimbursements,
  mockTimeline,
  createInitialWorkOrders,
} from './data/mockData';

const HOME_VIEW = 'home';

function normalizeApprovalStatus(item) {
  const raw = item?.approval_status || item?.approvalStatus || item?.status;
  if (!raw) return 'pending';
  const value = String(raw).toLowerCase();

  if (['rejected', 'rejeitado', 'reprovado', 'reject'].includes(value)) return 'rejected';
  if (['approved', 'aprovado', 'synced', 'concluded', 'completed', 'done', 'paid'].includes(value)) return 'approved';
  if (['pending', 'pendente', 'received', 'ready', 'in_progress', 'scheduled'].includes(value)) return 'pending';

  return 'pending';
}

function mapTimelineToJourney(timeline = []) {
  return (Array.isArray(timeline) ? timeline : []).map((item, index) => ({
    key: item.key || `timeline_${index}`,
    label: item.event,
    detail: [item.date, item.time].filter(Boolean).join(' • '),
    status: normalizeApprovalStatus({ status: item.status }) === 'approved' ? 'confirmed' : 'pending',
  }));
}

export default function EmployeeLogisticsApp() {
  const [activeView, setActiveView] = useState(HOME_VIEW);
  const [workInitialSection, setWorkInitialSection] = useState('os');
  const [workInitialIntent, setWorkInitialIntent] = useState(null);
  const [workIntentTick, setWorkIntentTick] = useState(0);
  const [financeInitialIntent, setFinanceInitialIntent] = useState(null);
  const [financeIntentTick, setFinanceIntentTick] = useState(0);
  const [tripStatusIntent, setTripStatusIntent] = useState(false);
  const [tripStatusTick, setTripStatusTick] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);
  const [employeeId, setEmployeeId] = useLocalStorageState('employeeId', '1');

  const [workOrders, setWorkOrders] = useLocalStorageState('el_workOrders', createInitialWorkOrders());
  const [dailyReports, setDailyReports] = useLocalStorageState('el_dailyReports', []);
  const [syncLog, setSyncLog] = useLocalStorageState('el_syncLog', []);
  const [isOnBase, setIsOnBase] = useLocalStorageState('el_isOnBase', false);
  const [expenses, setExpenses] = useLocalStorageState('el_expenses', mockExpenses);
  const [advances, setAdvances] = useLocalStorageState('el_advances', mockAdvances);
  const [equipment, setEquipment] = useLocalStorageState('el_equipment', mockEquipment);
  const [journeySteps, setJourneySteps] = useLocalStorageState(
    `el_tripJourneySteps_${employeeId}`,
    mapTimelineToJourney(mockTimeline)
  );

  const { employee, loading, screenError, dailyReportsApi, serviceOrdersApi, refreshLists } = useEmployeeData({ api, employeeId, mockEmployee });
  const { isOnline } = useOutboxSync({ api, employeeId, refreshLists });

  const mergedWork = useMemo(() => [...(serviceOrdersApi || []), ...(workOrders || [])], [serviceOrdersApi, workOrders]);
  const mergedRdo = useMemo(() => [...(dailyReportsApi || []), ...(dailyReports || [])], [dailyReportsApi, dailyReports]);

  const { pendingApprovalCount, rejectedCount } = useMemo(() => {
    const all = [...mergedWork, ...mergedRdo];
    return all.reduce((acc, item) => {
      const normalized = normalizeApprovalStatus(item);
      if (normalized === 'pending') acc.pendingApprovalCount += 1;
      if (normalized === 'rejected') acc.rejectedCount += 1;
      return acc;
    }, { pendingApprovalCount: 0, rejectedCount: 0 });
  }, [mergedWork, mergedRdo]);

  const handleLogout = () => {
    clearAuth();
    setEmployeeId('1');
    window.localStorage.removeItem('employeeId');
    window.location.reload();
  };

  const openWork = (section = 'os', intent = null) => {
    setWorkInitialSection(section);
    setWorkInitialIntent(intent);
    setWorkIntentTick((prev) => prev + 1);
    setActiveView('work');
  };

  const openFinance = (intent = null) => {
    setFinanceInitialIntent(intent);
    setFinanceIntentTick((prev) => prev + 1);
    setActiveView('finance');
  };

  const openTripDetails = () => {
    setTripStatusIntent(false);
    setActiveView('trip');
  };

  const openTripStatus = () => {
    setTripStatusIntent(true);
    setTripStatusTick((prev) => prev + 1);
    setActiveView('trip');
  };

  const handleFabAction = (action) => {
    setFabOpen(false);

    if (action === 'create_rdo') openWork('rdo', 'create_rdo');
    if (action === 'create_os') openWork('os', 'create_os');
    if (action === 'rh_request') openFinance('create_request');
    if (action === 'epis') setActiveView('epis');
  };

  const pageTitle = {
    home: 'Início',
    trip: 'Meu embarque',
    work: 'OS e RDO',
    finance: 'Financeiro',
    profile: 'Perfil',
    epis: 'EPIs',
    history: 'Histórico',
  }[activeView] || 'Início';

  const currentEmployee = employee || mockEmployee;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {activeView !== HOME_VIEW ? (
              <button
                onClick={() => setActiveView(HOME_VIEW)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                aria-label="Voltar para Home"
              >
                <ChevronLeft className="h-4 w-4 text-slate-600" />
                Voltar
              </button>
            ) : null}
            <div>
              <p className="text-xs text-gray-500">Portal do Colaborador</p>
              <p className="font-semibold text-gray-800">{pageTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />} {isOnline ? 'Online' : 'Offline'}
            </span>
            <button
              onClick={() => setActiveView('profile')}
              className="rounded-full border border-slate-200 p-1.5 hover:bg-slate-100"
              aria-label="Abrir perfil"
            >
              <img src={currentEmployee.photo} alt="Avatar do colaborador" className="h-6 w-6 rounded-full object-cover" />
            </button>
            <button onClick={() => setActiveView('profile')} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Configurações">
              <Settings className="h-5 w-5" />
            </button>
            <button className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100" aria-label="Notificações">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="space-y-4 p-4 pb-24">
        {loading && <LoadingSpinner />}
        {screenError && <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">{screenError}</div>}

        {activeView === HOME_VIEW && (
          <HomePage
            employee={currentEmployee}
            nextTrip={{ ...mockCurrentTrip, status: 'Confirmado' }}
            pendingApprovalCount={pendingApprovalCount}
            rejectedCount={rejectedCount}
            onOpenTrip={openTripDetails}
            onOpenTripStatus={openTripStatus}
          />
        )}

        {activeView === 'trip' && (
          <TripTab
            trip={{ ...mockCurrentTrip, status: 'Confirmado' }}
            employee={currentEmployee}
            boarding={mockBoarding}
            journeySteps={journeySteps}
            onUpdateJourney={setJourneySteps}
            openStatusFlow={tripStatusIntent || tripStatusTick > 0}
            onStatusFlowConsumed={() => {
              setTripStatusIntent(false);
              setTripStatusTick(0);
            }}
          />
        )}

        {activeView === 'work' && (
          <WorkTab
            workOrders={workOrders}
            setWorkOrders={setWorkOrders}
            dailyReports={dailyReports}
            setDailyReports={setDailyReports}
            syncLog={syncLog}
            setSyncLog={setSyncLog}
            isOnBase={isOnBase}
            setIsOnBase={setIsOnBase}
            initialSection={workInitialSection}
            initialIntent={workInitialIntent}
            intentTick={workIntentTick}
          />
        )}

        {activeView === 'finance' && (
          <FinanceTab
            expenses={expenses}
            advances={advances}
            reimbursements={mockReimbursements}
            onAddExpense={(item) => setExpenses((prev) => [item, ...prev])}
            onRequestAdvance={(item) => setAdvances((prev) => [item, ...prev])}
            initialIntent={financeInitialIntent}
            intentTick={financeIntentTick}
          />
        )}

        {activeView === 'profile' && (
          <ProfileTab
            employee={currentEmployee}
            personalDocuments={mockPersonalDocuments}
            emergencyContacts={mockEmergencyContacts}
            onNavigateToEquipment={() => setActiveView('epis')}
            onNavigateToHistory={() => setActiveView('history')}
            onLogout={handleLogout}
          />
        )}

        {activeView === 'epis' && (
          <EquipmentView
            equipment={equipment}
            onBack={() => setActiveView(HOME_VIEW)}
            onToggleStatus={(id) => {
              setEquipment((prev) => prev.map((item) => (
                item.id === id
                  ? { ...item, status: item.status === 'embarcado' ? 'pendente' : 'embarcado' }
                  : item
              )));
            }}
          />
        )}

        {activeView === 'history' && <HistoryView embarkHistory={mockEmbarkHistory} onBack={() => setActiveView('profile')} />}
      </main>

      <FabRadialMenu open={fabOpen} onOpenChange={setFabOpen} onAction={handleFabAction} />
    </div>
  );
}
