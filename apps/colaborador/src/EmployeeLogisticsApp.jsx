import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, LogOut, Wifi, WifiOff } from 'lucide-react';
import { LoadingSpinner } from './components';
import { useEmployeeData, useLocalStorageState, useOutboxSync } from './hooks';
import { HomePage } from './features/home';
import { TripTab } from './features/trip';
import { WorkTab } from './features/work';
import { FinanceTab } from './features/finance';
import { ProfileTab } from './features/profile';
import { EquipmentView } from './features/equipment';
import { HistoryView } from './features/history';
import api, { clearAuth, setToken } from './services/api';
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
  createInitialWorkOrders,
} from './data/mockData';

const HOME_VIEW = 'home';

export default function EmployeeLogisticsApp() {
  const [activeView, setActiveView] = useState(HOME_VIEW);
  const [workInitialSection, setWorkInitialSection] = useState('os');
  const [employeeId, setEmployeeId] = useLocalStorageState('employeeId', '');
  const [employeeInput, setEmployeeInput] = useState(employeeId || '');
  const [pinInput, setPinInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const [workOrders, setWorkOrders] = useLocalStorageState('el_workOrders', createInitialWorkOrders());
  const [dailyReports, setDailyReports] = useLocalStorageState('el_dailyReports', []);
  const [syncLog, setSyncLog] = useLocalStorageState('el_syncLog', []);
  const [isOnBase, setIsOnBase] = useLocalStorageState('el_isOnBase', false);
  const [expenses, setExpenses] = useLocalStorageState('el_expenses', mockExpenses);
  const [advances, setAdvances] = useLocalStorageState('el_advances', mockAdvances);
  const [equipment, setEquipment] = useLocalStorageState('el_equipment', mockEquipment);

  const { employee, loading, screenError, dailyReportsApi, serviceOrdersApi, refreshLists } = useEmployeeData({ api, employeeId, mockEmployee });
  const { isOnline } = useOutboxSync({ api, employeeId, refreshLists });

  useEffect(() => {
    setEmployeeInput(employeeId || '');
  }, [employeeId]);

  // TODO: substituir por endpoint consolidado de KPIs quando disponível no backend.
  const osCounter = useMemo(() => (serviceOrdersApi?.length || 0) + (workOrders?.length || 0), [serviceOrdersApi, workOrders]);
  const rdoCounter = useMemo(() => (dailyReportsApi?.length || 0) + (dailyReports?.length || 0), [dailyReportsApi, dailyReports]);

  const handleLogin = async () => {
    const next = employeeInput.trim();
    const parsedId = Number(next);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      alert('Informe um ID numérico válido');
      return;
    }

    const pin = pinInput.trim();
    if (!pin || pin.length < 4 || pin.length > 12) {
      alert('Informe um PIN válido (4 a 12 caracteres).');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    try {
      const result = await api.auth.login({ employee_id: parsedId, pin });
      setToken(result?.token || '');
      const loggedEmployeeId = String(result?.employee?.id || parsedId);
      setEmployeeId(loggedEmployeeId);
      await refreshLists(loggedEmployeeId);
      setActiveView(HOME_VIEW);
      setPinInput('');
    } catch {
      setAuthError('Falha no login. Verifique seu ID/PIN.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setEmployeeId('');
    setEmployeeInput('');
    setPinInput('');
    setAuthError('');
    window.location.reload();
  };

  const handleCheckInOut = async () => {
    const action = isOnBase ? 'out' : 'in';
    try {
      await api.checkins.create({ employee_id: Number(employeeId), action });
      setIsOnBase((prev) => !prev);
      alert(action === 'in' ? 'Check-in realizado com sucesso.' : 'Check-out realizado com sucesso.');
    } catch {
      alert('Não foi possível registrar. Tente novamente.');
    }
  };

  const openWorkSection = (section) => {
    setWorkInitialSection(section);
    setActiveView('work');
  };

  const pageTitle = {
    home: 'Início',
    trip: 'Próximo Embarque',
    work: 'OS e RDO',
    finance: 'Financeiro',
    profile: 'Perfil',
    epis: 'EPIs',
    history: 'Histórico',
  }[activeView] || 'Início';

  if (!employeeId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 shadow-md w-full max-w-sm space-y-3">
          <h1 className="text-xl font-bold">Login</h1>
          <input className="w-full border rounded-lg px-3 py-2" value={employeeInput} onChange={(e) => setEmployeeInput(e.target.value)} placeholder="ID do colaborador" />
          <input className="w-full border rounded-lg px-3 py-2" type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="PIN" />
          {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
          <button onClick={handleLogin} disabled={authLoading} className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50">{authLoading ? 'Entrando...' : 'Entrar'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white/95 border-b px-4 py-3 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-2">
          {activeView !== HOME_VIEW ? (
            <button onClick={() => setActiveView(HOME_VIEW)} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Voltar para Home">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
          ) : null}
          <div>
            <p className="text-xs text-gray-500">Portal do Colaborador</p>
            <p className="font-semibold text-gray-800">{pageTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />} {isOnline ? 'Online' : 'Offline'}
          </span>
          <button className="text-xs bg-gray-200 px-2 py-1 rounded flex items-center gap-1" onClick={handleLogout}><LogOut className="w-3 h-3" />Sair</button>
          <Bell className="w-5 h-5 text-gray-600" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {loading && <LoadingSpinner />}
        {screenError && <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg text-sm">{screenError}</div>}

        {activeView === HOME_VIEW && (
          <HomePage
            employee={employee || mockEmployee}
            nextTrip={{ ...mockCurrentTrip, status: 'Confirmado' }}
            osCount={osCounter}
            rdoCount={rdoCounter}
            onOpenTrip={() => setActiveView('trip')}
            onOpenOs={() => openWorkSection('os')}
            onOpenRdo={() => openWorkSection('rdo')}
            onOpenEpis={() => setActiveView('epis')}
            onOpenFinance={() => setActiveView('finance')}
            onOpenProfile={() => setActiveView('profile')}
            onCheckInOut={handleCheckInOut}
          />
        )}

        {activeView === 'trip' && <TripTab employee={employee || mockEmployee} boarding={mockBoarding} />}

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
          />
        )}

        {activeView === 'finance' && (
          <FinanceTab
            expenses={expenses}
            advances={advances}
            reimbursements={mockReimbursements}
            onAddExpense={(item) => setExpenses((prev) => [item, ...prev])}
            onRequestAdvance={(item) => setAdvances((prev) => [item, ...prev])}
          />
        )}

        {activeView === 'profile' && (
          <ProfileTab
            employee={employee || mockEmployee}
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
    </div>
  );
}
