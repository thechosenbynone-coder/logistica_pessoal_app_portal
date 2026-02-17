import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, Plus, Settings, Wifi, WifiOff, X } from 'lucide-react';
import { LoadingSpinner } from './components';
import { useEmployeeData, useLocalStorageState, useOutboxSync } from './hooks';
import { HomePage } from './features/home';
import { TripTab } from './features/trip';
import { WorkTab } from './features/work';
import { FinanceTab } from './features/finance';
import { ProfileTab } from './features/profile';
import { EquipmentView } from './features/equipment';
import { HistoryView } from './features/history';
import api from './services/api';
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
  if (['rejected', 'reprovado', 'reject'].includes(value)) return 'rejected';
  if (['approved', 'aprovado', 'done', 'completed', 'concluded', 'synced'].includes(value)) return 'approved';
  if (['pending', 'pendente', 'received', 'in_progress', 'ready'].includes(value)) return 'pending';
  return 'pending';
}

function FloatingActionMenu({ open, onOpenChange, onAction }) {
  useEffect(() => {
    if (!open) return undefined;
    const onEsc = (event) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onOpenChange]);

  return (
    <>
      {open && <button type="button" aria-label="Fechar menu rápido" className="fixed inset-0 z-30 bg-black/30" onClick={() => onOpenChange(false)} />}

      <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
        <div className="relative flex items-center justify-center">
          {open ? (
            <>
              <button
                type="button"
                aria-label="Criar RDO"
                className="absolute -left-32 -top-16 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => onAction('create_rdo')}
              >
                Criar RDO
              </button>
              <button
                type="button"
                aria-label="Criar OS"
                className="absolute -left-16 -top-28 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => onAction('create_os')}
              >
                Criar OS
              </button>
              <button
                type="button"
                aria-label="Nova solicitação ao RH"
                className="absolute left-0 -top-32 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => onAction('create_request')}
              >
                Solicitação RH
              </button>
              <button
                type="button"
                aria-label="EPIs"
                className="absolute left-20 -top-22 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => onAction('epis')}
              >
                EPIs
              </button>
            </>
          ) : null}

          <button
            type="button"
            aria-label={open ? 'Fechar menu rápido' : 'Abrir menu rápido'}
            onClick={() => onOpenChange(!open)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
          </button>
        </div>
      </div>
    </>
  );
}

export default function EmployeeLogisticsApp() {
  const [activeView, setActiveView] = useState(HOME_VIEW);
  const [workInitialSection, setWorkInitialSection] = useState('os');
  const [workInitialIntent, setWorkInitialIntent] = useState(null);
  const [workIntentTick, setWorkIntentTick] = useState(0);
  const [financeInitialIntent, setFinanceInitialIntent] = useState(null);
  const [financeIntentTick, setFinanceIntentTick] = useState(0);
  const [tripStatusFlowTick, setTripStatusFlowTick] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);
  const [employeeId] = useLocalStorageState('employeeId', '1');

  const [workOrders, setWorkOrders] = useLocalStorageState('el_workOrders', createInitialWorkOrders());
  const [dailyReports, setDailyReports] = useLocalStorageState('el_dailyReports', []);
  const [syncLog, setSyncLog] = useLocalStorageState('el_syncLog', []);
  const [isOnBase, setIsOnBase] = useLocalStorageState('el_isOnBase', false);
  const [expenses, setExpenses] = useLocalStorageState('el_expenses', mockExpenses);
  const [advances, setAdvances] = useLocalStorageState('el_advances', mockAdvances);
  const [equipment, setEquipment] = useLocalStorageState('el_equipment', mockEquipment);

  const { employee, loading, screenError, dailyReportsApi, serviceOrdersApi, refreshLists } = useEmployeeData({ api, employeeId, mockEmployee });
  const { isOnline } = useOutboxSync({ api, employeeId, refreshLists });

  const combinedOs = useMemo(() => [...(serviceOrdersApi || []), ...(workOrders || [])], [serviceOrdersApi, workOrders]);
  const combinedRdo = useMemo(() => [...(dailyReportsApi || []), ...(dailyReports || [])], [dailyReportsApi, dailyReports]);

  const approvalSummary = useMemo(() => {
    const all = [...combinedOs, ...combinedRdo];
    return all.reduce((acc, item) => {
      const status = normalizeApprovalStatus(item);
      if (status === 'rejected') acc.rejected += 1;
      if (status === 'pending') acc.pending += 1;
      return acc;
    }, { pending: 0, rejected: 0 });
  }, [combinedOs, combinedRdo]);

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

  const openTripStatusFlow = () => {
    setTripStatusFlowTick((prev) => prev + 1);
    setActiveView('trip');
  };

  const handleFabAction = (action) => {
    setFabOpen(false);
    if (action === 'create_rdo') openWork('rdo', 'create_rdo');
    if (action === 'create_os') openWork('os', 'create_os');
    if (action === 'create_request') openFinance('create_request');
    if (action === 'epis') setActiveView('epis');
  };

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

      <main className="space-y-4 p-4">
        {loading && <LoadingSpinner />}
        {screenError && <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">{screenError}</div>}

        {activeView === HOME_VIEW && (
          <HomePage
            employee={currentEmployee}
            tripSummary={{ ...mockCurrentTrip, statusLabel: 'Confirmado' }}
            approvalSummary={approvalSummary}
            onOpenTrip={openTripStatusFlow}
            onOpenWork={() => openWork('os', null)}
          />
        )}

        {activeView === 'trip' && (
          <TripTab
            employee={currentEmployee}
            boarding={{ ...mockBoarding, disembarkDate: mockCurrentTrip.disembarkDate }}
            fallbackTimeline={mockTimeline}
            statusFlowTrigger={tripStatusFlowTick}
            onStatusUpdate={async (payload) => {
              // TODO: conectar endpoint de atualização de jornada quando disponível no backend.
              setSyncLog((prev) => [{ id: `trip-${Date.now()}`, message: `Status atualizado (${payload.steps.length} etapas)`, ts: new Date().toISOString() }, ...prev]);
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

      <FloatingActionMenu open={fabOpen} onOpenChange={setFabOpen} onAction={handleFabAction} />
    </div>
  );
}
