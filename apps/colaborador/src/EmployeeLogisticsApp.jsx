import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, Settings, Wifi, WifiOff, X } from 'lucide-react';
import { FabRadialMenu, LoadingSpinner } from './components';
import {
  useEmployeeData,
  useEmployeeSyncData,
  useLocalStorageState,
  useNotifications,
  useOutboxSync,
} from './hooks';
import { HomePage } from './features/home';
import { TripTab } from './features/trip';
import { WorkTab } from './features/work';
import { FinanceTab } from './features/finance';
import { ProfileTab } from './features/profile';
import { EquipmentView } from './features/equipment';
import { HistoryView } from './features/history';
import { DocumentsView } from './features/documents';
import { NotificationsView } from './features/notifications';
import api, { clearAuth } from './services/api';
import {
  mockAdvances,
  mockEmergencyContacts,
  mockEmbarkHistory,
  mockEmployee,
  mockEquipment,
  mockExpenses,
  mockReimbursements,
  createInitialWorkOrders,
} from './data/mockData';

const HOME_VIEW = 'home';

function normalizeApprovalStatus(item) {
  const raw = item?.approval_status || item?.approvalStatus || item?.status;
  if (!raw) return 'pending';
  const value = String(raw).toLowerCase();

  if (['rejected', 'rejeitado', 'reprovado', 'reject'].includes(value)) return 'rejected';
  if (['approved', 'aprovado', 'synced', 'concluded', 'completed', 'done', 'paid'].includes(value))
    return 'approved';
  if (['pending', 'pendente', 'received', 'ready', 'in_progress', 'scheduled'].includes(value))
    return 'pending';
  return 'pending';
}

function buildBoardingData(trip) {
  if (!trip)
    return {
      date: '',
      time: '',
      location: '',
      flight: '',
      seat: '',
      terminal: '',
      checkInTime: '',
    };
  return {
    date: trip.embarkDate || '',
    time: trip.embarkTime || '',
    location: trip.location || '',
    flight: trip.vessel || trip.destination || '',
    seat: trip.seat || '-',
    terminal: trip.terminal || '-',
    checkInTime: trip.checkInTime || '--:--',
  };
}

export default function EmployeeLogisticsApp() {
  const [activeView, setActiveView] = useState(HOME_VIEW);
  const [tripMode, setTripMode] = useState('current');
  const [workInitialSection, setWorkInitialSection] = useState('os');
  const [workInitialIntent, setWorkInitialIntent] = useState(null);
  const [workIntentTick, setWorkIntentTick] = useState(0);
  const [financeInitialIntent, setFinanceInitialIntent] = useState(null);
  const [financeIntentTick, setFinanceIntentTick] = useState(0);
  const [tripStatusIntent, setTripStatusIntent] = useState(false);
  const [tripStatusTick, setTripStatusTick] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);
  const [employeeId, setEmployeeId] = useLocalStorageState('employeeId', '1');
  const [requestModal, setRequestModal] = useState({ open: false, type: null, title: '' });
  const [requestDescription, setRequestDescription] = useState('');

  const [workOrders, setWorkOrders] = useLocalStorageState(
    'el_workOrders',
    createInitialWorkOrders()
  );
  const [dailyReports, setDailyReports] = useLocalStorageState('el_dailyReports', []);
  const [syncLog, setSyncLog] = useLocalStorageState('el_syncLog', []);
  const [isOnBase, setIsOnBase] = useLocalStorageState('el_isOnBase', false);
  const [expenses, setExpenses] = useLocalStorageState('el_expenses', mockExpenses);
  const [advances, setAdvances] = useLocalStorageState('el_advances', mockAdvances);
  const [equipment, setEquipment] = useLocalStorageState('el_equipment', mockEquipment);
  const [journeySteps, setJourneySteps] = useLocalStorageState(
    `el_tripJourneySteps_${employeeId}`,
    []
  );

  const { employee, loading, screenError, dailyReportsApi, serviceOrdersApi, refreshLists } =
    useEmployeeData({ api, employeeId, mockEmployee });
  const {
    loading: syncLoading,
    error: syncError,
    currentEmbarkation,
    nextEmbarkation,
    journey,
    trainingsScheduled,
    documents: documentsApi,
    requests: requestsApi,
    refresh: refreshSync,
    updateJourney,
  } = useEmployeeSyncData({ api, employeeId });
  const { isOnline } = useOutboxSync({ api, employeeId, refreshLists });
  const {
    items: notifications,
    unreadCount,
    toast,
    markRead,
  } = useNotifications({ api, employeeId });

  useEffect(() => {
    if (journey?.length) setJourneySteps(journey);
    else if (!currentEmbarkation) setJourneySteps([]);
  }, [journey, currentEmbarkation, setJourneySteps]);

  const mergedWork = useMemo(
    () => [...(serviceOrdersApi || []), ...(workOrders || [])],
    [serviceOrdersApi, workOrders]
  );
  const mergedRdo = useMemo(
    () => [...(dailyReportsApi || []), ...(dailyReports || [])],
    [dailyReportsApi, dailyReports]
  );
  const mergedRequests = useMemo(() => [...(requestsApi || [])], [requestsApi]);

  const { pendingApprovalCount, rejectedCount } = useMemo(() => {
    const all = [...mergedWork, ...mergedRdo, ...mergedRequests];
    return all.reduce(
      (acc, item) => {
        const normalized = normalizeApprovalStatus(item);
        if (normalized === 'pending') acc.pendingApprovalCount += 1;
        if (normalized === 'rejected') acc.rejectedCount += 1;
        return acc;
      },
      { pendingApprovalCount: 0, rejectedCount: 0 }
    );
  }, [mergedWork, mergedRdo, mergedRequests]);

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

  const openTripDetails = (mode = 'current') => {
    setTripMode(mode);
    setTripStatusIntent(false);
    setActiveView('trip');
  };

  const openTripStatus = () => {
    setTripMode('current');
    setTripStatusIntent(true);
    setTripStatusTick((prev) => prev + 1);
    setActiveView('trip');
  };

  const selectedTrip = tripMode === 'next' ? nextEmbarkation : currentEmbarkation;

  const createRequest = async (type, payload = {}) => {
    const employeeNum = Number(employeeId);
    await api.requests.create(type, { employeeId: employeeNum, payload });
    await refreshSync();
    setSyncLog((prev) => [
      {
        id: `req-${Date.now()}`,
        ts: new Date().toISOString(),
        message: `Solicitação ${type.toUpperCase()} enviada`,
        status: 'SUCCESS',
      },
      ...prev,
    ]);
  };

  const handleFabAction = (action) => {
    setFabOpen(false);
    if (action === 'create_rdo') openWork('rdo', 'create_rdo');
    if (action === 'create_os') openWork('os', 'create_os');
    if (action === 'finance_request') openFinance('create_request');
    if (action === 'lodging_request')
      setRequestModal({ open: true, type: 'lodging', title: 'Solicitação de Hospedagem' });
    if (action === 'epi_request')
      setRequestModal({ open: true, type: 'epi', title: 'Solicitação de EPI' });
  };

  const pageTitle =
    {
      home: 'Início',
      trip: 'Meu embarque',
      work: 'OS e RDO',
      finance: 'Financeiro',
      profile: 'Perfil',
      epis: 'EPIs',
      history: 'Histórico',
      docs: 'Documentações',
      notifications: 'Notificações',
    }[activeView] || 'Início';

  const currentEmployee = employee || mockEmployee;

  return (
    <div className="min-h-[100dvh] bg-slate-100 flex justify-center">
      <div className="relative w-full max-w-[430px] h-[100dvh] bg-white overflow-hidden">
        <div className="flex h-full flex-col">
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
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}
                >
                  {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{' '}
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <button
                  onClick={() => setActiveView('profile')}
                  className="rounded-full border border-slate-200 p-1.5 hover:bg-slate-100"
                  aria-label="Abrir perfil"
                >
                  <img
                    src={currentEmployee.photo}
                    alt="Avatar do colaborador"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                </button>
                <button
                  onClick={() => setActiveView('profile')}
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                  aria-label="Configurações"
                >
                  <Settings className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setActiveView('notifications')}
                  className="relative rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                  aria-label="Notificações"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
                >
                  Sair
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto space-y-4 p-4 pb-[calc(7rem+env(safe-area-inset-bottom))]">
            {(loading || syncLoading) && <LoadingSpinner />}
            {screenError && (
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
                {screenError}
              </div>
            )}
            {syncError && (
              <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">{syncError}</div>
            )}
            {toast && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{toast}</div>
            )}

            {activeView === HOME_VIEW && (
              <HomePage
                employee={currentEmployee}
                nextTrip={currentEmbarkation || null}
                upcomingTrip={nextEmbarkation || null}
                trainingsScheduled={trainingsScheduled}
                pendingApprovalCount={pendingApprovalCount}
                rejectedCount={rejectedCount}
                onOpenTrip={() => openTripDetails('current')}
                onOpenNextTrip={() => openTripDetails('next')}
                onOpenTripStatus={openTripStatus}
                onOpenDocs={() => setActiveView('docs')}
                onOpenTrainings={() => setActiveView('docs')}
                onOpenEpis={() => setActiveView('epis')}
                onOpenFinance={() => setActiveView('finance')}
                onOpenHistory={() => setActiveView('history')}
              />
            )}

            {activeView === 'trip' && (
              <TripTab
                trip={selectedTrip}
                employee={currentEmployee}
                boarding={buildBoardingData(selectedTrip)}
                journeySteps={tripMode === 'current' ? journeySteps : []}
                onUpdateJourney={async (steps) => {
                  setJourneySteps(steps);
                  if (tripMode === 'current' && currentEmbarkation?.id) {
                    await updateJourney(steps);
                  }
                }}
                openStatusFlow={tripMode === 'current' && (tripStatusIntent || tripStatusTick > 0)}
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
                onCreateRequest={createRequest}
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
                onCreateRequest={createRequest}
              />
            )}

            {activeView === 'docs' && (
              <DocumentsView documents={documentsApi || []} trainings={trainingsScheduled || []} />
            )}

            {activeView === 'profile' && (
              <ProfileTab
                employee={currentEmployee}
                personalDocuments={documentsApi || []}
                emergencyContacts={mockEmergencyContacts}
                onNavigateToEquipment={() => setActiveView('epis')}
                onNavigateToHistory={() => setActiveView('history')}
              />
            )}

            {activeView === 'epis' && (
              <EquipmentView
                equipment={equipment}
                onBack={() => setActiveView(HOME_VIEW)}
                onToggleStatus={(id) => {
                  setEquipment((prev) =>
                    prev.map((item) =>
                      item.id === id
                        ? {
                            ...item,
                            status: item.status === 'embarcado' ? 'pendente' : 'embarcado',
                          }
                        : item
                    )
                  );
                }}
              />
            )}

            {activeView === 'history' && (
              <HistoryView
                embarkHistory={mockEmbarkHistory}
                onBack={() => setActiveView('profile')}
              />
            )}

            {activeView === 'notifications' && (
              <NotificationsView items={notifications} onMarkAllRead={(ids) => markRead(ids)} />
            )}
          </main>

          <FabRadialMenu open={fabOpen} onOpenChange={setFabOpen} onAction={handleFabAction} />
        </div>

        {requestModal.open && (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
            <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">{requestModal.title}</h3>
                <button
                  onClick={() => setRequestModal({ open: false, type: null, title: '' })}
                  aria-label="Fechar solicitação"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              <textarea
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                className="h-24 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Descreva sua solicitação"
              />
              <button
                onClick={async () => {
                  await createRequest(requestModal.type, { description: requestDescription });
                  setRequestDescription('');
                  setRequestModal({ open: false, type: null, title: '' });
                }}
                className="mt-3 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Enviar solicitação
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
