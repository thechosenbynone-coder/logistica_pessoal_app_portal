import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, ClipboardList, FileText, LogOut, RefreshCw, Wifi, WifiOff, Wrench, Wallet, ListTodo, RotateCcw, Trash2 } from 'lucide-react';
import { BottomNav, LoadingSpinner } from './components';
import { useEmployeeData, useLocalStorageState, useOutboxSync } from './hooks';
import { HomeTab } from './features/home';
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
  mockTimeline,
  createInitialWorkOrders,
} from './data/mockData';
import { formatDateBR, isValidDateBR, parseDateBRtoISO } from './lib/dateBR';
import { outboxEnqueue, outboxList, outboxRemove, outboxRetry } from './lib/outbox';

const todayBR = () => formatDateBR(new Date());
const genClientId = () => {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) return crypto.randomUUID();
  return `cid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

function Badge({ value }) {
  const map = {
    Pendente: 'bg-yellow-100 text-yellow-700',
    Aprovado: 'bg-green-100 text-green-700',
    Rejeitado: 'bg-red-100 text-red-700',
    Aberto: 'bg-blue-100 text-blue-700',
    Solicitado: 'bg-purple-100 text-purple-700',
    'Pendente envio': 'bg-orange-100 text-orange-700',
    PENDING: 'bg-orange-100 text-orange-700',
    FAILED: 'bg-orange-100 text-orange-700',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full ${map[value] || 'bg-gray-100 text-gray-700'}`}>
      {value || '—'}
    </span>
  );
}

export default function EmployeeLogisticsApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [profileView, setProfileView] = useState('main');
  const [employeeId, setEmployeeId] = useLocalStorageState('employeeId', '');
  const [employeeInput, setEmployeeInput] = useState(employeeId || '');
  const [pinInput, setPinInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [outboxTick, setOutboxTick] = useState(0);

  const [workOrders, setWorkOrders] = useLocalStorageState('el_workOrders', createInitialWorkOrders());
  const [dailyReports, setDailyReports] = useLocalStorageState('el_dailyReports', []);
  const [syncLog, setSyncLog] = useLocalStorageState('el_syncLog', []);
  const [isOnBase, setIsOnBase] = useLocalStorageState('el_isOnBase', false);
  const [expenses, setExpenses] = useLocalStorageState('el_expenses', mockExpenses);
  const [advances, setAdvances] = useLocalStorageState('el_advances', mockAdvances);

  const [rdoDate, setRdoDate] = useState(todayBR());
  const [rdoContent, setRdoContent] = useState('');
  const [osDate, setOsDate] = useState(todayBR());
  const [osTitle, setOsTitle] = useState('');
  const [osDescription, setOsDescription] = useState('');
  const [osPriority, setOsPriority] = useState('Normal');
  const [finType, setFinType] = useState('Reembolso');
  const [finAmount, setFinAmount] = useState('');
  const [finDescription, setFinDescription] = useState('');

  const pendingCount = useMemo(() => {
    const currentEmployeeId = Number(employeeId);
    return outboxList().filter((item) =>
      item.employee_id === currentEmployeeId && (item.status === 'PENDING' || item.status === 'FAILED')
    ).length;
  }, [employeeId, outboxTick]);

  const pendingItems = useMemo(() => {
    const currentEmployeeId = Number(employeeId);
    return outboxList().filter((item) => item.employee_id === currentEmployeeId);
  }, [employeeId, outboxTick]);


  const {
    employee,
    loading,
    screenError,
    documents,
    deployments,
    epiDeliveries,
    dailyReportsApi,
    serviceOrdersApi,
    financialRequestsApi,
    refreshLists,
  } = useEmployeeData({ api, employeeId, mockEmployee });

  const { isOnline, flushOutbox } = useOutboxSync({
    api,
    employeeId,
    refreshLists,
    onTick: () => setOutboxTick((v) => v + 1),
  });

  const handleFlushOutbox = async () => {
    await flushOutbox();
  };

  useEffect(() => {
    setEmployeeInput(employeeId || '');
  }, [employeeId]);

  const dashboardKpis = useMemo(() => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);

    const expired = documents.filter((doc) => doc.expiration_date && new Date(doc.expiration_date) < now).length;
    const expiring = documents.filter((doc) => {
      if (!doc.expiration_date) return false;
      const dt = new Date(doc.expiration_date);
      return dt >= now && dt <= in30;
    }).length;

    const activeDeployment = deployments.find((dep) => !dep.end_date_actual);
    const finPending = financialRequestsApi.filter((f) => ['Solicitado', 'Pendente', 'Aprovado'].includes(f.status)).length;
    const rdoPending = dailyReportsApi.filter((r) => r.approval_status === 'Pendente').length;
    const rdoApproved = dailyReportsApi.filter((r) => r.approval_status === 'Aprovado').length;
    const rdoRejected = dailyReportsApi.filter((r) => r.approval_status === 'Rejeitado').length;

    return { expired, expiring, activeDeployment, finPending, rdoPending, rdoApproved, rdoRejected };
  }, [dailyReportsApi, deployments, documents, financialRequestsApi]);

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
      setActiveTab('home');
      setPinInput('');
    } catch (error) {
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

  const enqueueAndWarn = (kind, payload, clientFilledAt, clientId) => {
    outboxEnqueue(kind, Number(employeeId), payload, clientFilledAt, clientId);
    setOutboxTick((v) => v + 1);
  };


  const handleRetryOutboxItem = (itemId) => {
    outboxRetry(itemId);
    setOutboxTick((v) => v + 1);
  };

  const handleRemoveOutboxItem = (itemId) => {
    outboxRemove(itemId);
    setOutboxTick((v) => v + 1);
  };

  const submitRdo = async () => {
    if (!isValidDateBR(rdoDate) || !rdoContent.trim()) return alert('Preencha data dd/mm/aaaa e descrição.');

    const clientFilledAt = new Date().toISOString();
    const clientId = genClientId();
    const payload = {
      employee_id: Number(employeeId),
      report_date: parseDateBRtoISO(rdoDate),
      description: rdoContent,
      content: rdoContent,
      approval_status: 'Pendente',
    };

    if (!isOnline) {
      enqueueAndWarn('RDO', payload, clientFilledAt, clientId);
      alert('Salvo para envio quando houver conexão.');
      return;
    }

    try {
      await api.dailyReports.create({ ...payload, client_id: clientId, client_filled_at: clientFilledAt });
      await refreshLists(employeeId);
    } catch {
      enqueueAndWarn('RDO', payload, clientFilledAt, clientId);
      alert('Falha ao enviar. Salvo para reenvio.');
    }

    setRdoContent('');
  };

  const submitOs = async () => {
    if (!isValidDateBR(osDate) || !osTitle.trim() || !osDescription.trim()) return alert('Preencha todos os campos da OS.');

    const clientFilledAt = new Date().toISOString();
    const clientId = genClientId();
    const payload = {
      employee_id: Number(employeeId),
      opened_at: parseDateBRtoISO(osDate),
      title: osTitle,
      description: osDescription,
      priority: osPriority,
      status: 'Aberto',
      approval_status: 'Pendente',
      os_number: `OS-${Date.now()}`,
    };

    if (!isOnline) {
      enqueueAndWarn('OS', payload, clientFilledAt, clientId);
      alert('Salvo para envio quando houver conexão.');
      return;
    }

    try {
      await api.serviceOrders.create({ ...payload, client_id: clientId, client_filled_at: clientFilledAt });
      await refreshLists(employeeId);
    } catch {
      enqueueAndWarn('OS', payload, clientFilledAt, clientId);
      alert('Falha ao enviar. Salvo para reenvio.');
    }

    setOsTitle('');
    setOsDescription('');
  };

  const submitFinancial = async () => {
    if (!finAmount || !finDescription.trim()) return alert('Informe valor e descrição.');

    const clientFilledAt = new Date().toISOString();
    const clientId = genClientId();
    const payload = {
      employee_id: Number(employeeId),
      type: finType,
      amount: Number(finAmount),
      description: finDescription,
      status: 'Solicitado',
    };

    if (!isOnline) {
      enqueueAndWarn('FIN', payload, clientFilledAt, clientId);
      alert('Salvo para envio quando houver conexão.');
      return;
    }

    try {
      await api.financialRequests.create({ ...payload, client_id: clientId, client_filled_at: clientFilledAt });
      await refreshLists(employeeId);
    } catch {
      enqueueAndWarn('FIN', payload, clientFilledAt, clientId);
      alert('Falha ao enviar. Salvo para reenvio.');
    }

    setFinAmount('');
    setFinDescription('');
  };

  const outboxByKind = useMemo(() => {
    const employeeNumericId = Number(employeeId);
    return outboxList().filter((item) => item.employee_id === employeeNumericId);
  }, [employeeId, outboxTick]);

  const pendingRdos = outboxByKind.filter((item) => item.kind === 'RDO');
  const pendingOs = outboxByKind.filter((item) => item.kind === 'OS');
  const pendingFin = outboxByKind.filter((item) => item.kind === 'FIN');

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
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Portal do Colaborador</p>
          <p className="font-semibold text-gray-800">{employee?.name ?? '—'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />} {isOnline ? 'Online' : 'Offline'}
          </span>
          {pendingCount > 0 && <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700">Pendências: {pendingCount}</span>}
          {isOnline && pendingCount > 0 && (
            <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1" onClick={handleFlushOutbox}>
              <RefreshCw className="w-3 h-3" /> Sincronizar
            </button>
          )}
          <button className="text-xs bg-gray-200 px-2 py-1 rounded flex items-center gap-1" onClick={handleLogout}><LogOut className="w-3 h-3" />Sair</button>
          <Bell className="w-5 h-5 text-gray-600" />
        </div>
      </header>

      <main className="p-4 space-y-4">
        {loading && <LoadingSpinner />}
        {screenError && <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg text-sm">{screenError}</div>}

        {activeTab === 'home' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-xl shadow"><p className="text-xs text-gray-500">Docs vencidos</p><p className="text-xl font-bold">{dashboardKpis.expired}</p></div>
              <div className="bg-white p-3 rounded-xl shadow"><p className="text-xs text-gray-500">Vencendo em 30 dias</p><p className="text-xl font-bold">{dashboardKpis.expiring}</p></div>
              <div className="bg-white p-3 rounded-xl shadow"><p className="text-xs text-gray-500">Embarque ativo</p><p className="text-sm font-bold">{dashboardKpis.activeDeployment ? `Sim - Embarcação ${dashboardKpis.activeDeployment.vessel_id ?? '—'}` : 'Não'}</p></div>
              <div className="bg-white p-3 rounded-xl shadow"><p className="text-xs text-gray-500">Financeiro pendente</p><p className="text-xl font-bold">{dashboardKpis.finPending}</p></div>
              <div className="bg-white p-3 rounded-xl shadow col-span-2"><p className="text-xs text-gray-500">RDOs (Pend/Aprov/Rej)</p><p className="text-xl font-bold">{dashboardKpis.rdoPending}/{dashboardKpis.rdoApproved}/{dashboardKpis.rdoRejected}</p></div>
            </div>
            <HomeTab employee={employee} currentTrip={mockCurrentTrip} timeline={mockTimeline} onCheckIn={() => api.checkins.create({ employee_id: Number(employeeId), action: 'in' })} onCheckOut={() => api.checkins.create({ employee_id: Number(employeeId), action: 'out' })} />
          </>
        )}

        {activeTab === 'trip' && <TripTab employee={employee} boarding={mockBoarding} />}

        {activeTab === 'work' && (
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
        )}

        {activeTab === 'finance' && <FinanceTab expenses={expenses} advances={advances} reimbursements={mockReimbursements} onAddExpense={(exp) => setExpenses((prev) => [exp, ...prev])} onRequestAdvance={(adv) => setAdvances((prev) => [adv, ...prev])} />}

        {activeTab === 'profile' && profileView === 'main' && <ProfileTab employee={employee} personalDocuments={mockPersonalDocuments.map((doc) => ({ ...doc, issueDate: formatDateBR(doc.issueDate), expiryDate: doc.expiryDate ? formatDateBR(doc.expiryDate) : null }))} emergencyContacts={mockEmergencyContacts} onNavigateToEquipment={() => setProfileView('equipment')} onNavigateToHistory={() => setProfileView('history')} />}

        {activeTab === 'profile' && profileView === 'equipment' && <EquipmentView equipment={mockEquipment.map((item, idx) => ({ ...item, id: idx + 1 }))} onBack={() => setProfileView('main')} />}
        {activeTab === 'profile' && profileView === 'history' && <HistoryView embarkHistory={mockEmbarkHistory} onBack={() => setProfileView('main')} />}

        {activeTab === 'rdos' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />RDOS</h2>
            <div className="bg-white rounded-xl p-4 shadow space-y-2">
              <input value={rdoDate} onChange={(e) => setRdoDate(e.target.value)} placeholder="dd/mm/aaaa" className="w-full border rounded px-3 py-2" />
              <textarea value={rdoContent} onChange={(e) => setRdoContent(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Descrição" />
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={submitRdo}>Enviar</button>
            </div>
            <div className="bg-white rounded-xl p-4 shadow space-y-2">
              {dailyReportsApi.length === 0 && pendingRdos.length === 0 ? 'Sem RDOS.' : null}
              {dailyReportsApi.map((item) => <div key={`api-${item.id}`} className="flex justify-between border-b pb-2"><span>{formatDateBR(item.report_date)}</span><Badge value={item.approval_status} /></div>)}
              {pendingRdos.map((item) => <div key={item.id} className="border-b pb-2"><div className="flex justify-between"><span>{formatDateBR(item.payload.report_date)}</span><Badge value="Pendente envio" /></div><p className="text-xs text-gray-500">Preenchido em {formatDateBR(item.client_filled_at)}</p></div>)}
            </div>
          </section>
        )}

        {activeTab === 'oss' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-600" />OSs</h2>
            <div className="bg-white rounded-xl p-4 shadow space-y-2">
              <input value={osDate} onChange={(e) => setOsDate(e.target.value)} placeholder="dd/mm/aaaa" className="w-full border rounded px-3 py-2" />
              <input value={osTitle} onChange={(e) => setOsTitle(e.target.value)} placeholder="Título" className="w-full border rounded px-3 py-2" />
              <textarea value={osDescription} onChange={(e) => setOsDescription(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Descrição" />
              <select value={osPriority} onChange={(e) => setOsPriority(e.target.value)} className="w-full border rounded px-3 py-2"><option>Baixa</option><option>Normal</option><option>Alta</option><option>Critica</option></select>
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={submitOs}>Abrir OS</button>
            </div>
            <div className="bg-white rounded-xl p-4 shadow space-y-2">
              {serviceOrdersApi.length === 0 && pendingOs.length === 0 ? 'Sem OSs.' : null}
              {serviceOrdersApi.map((item) => <div key={`api-${item.id}`} className="border-b pb-2"><div className="flex justify-between"><span>{item.title || item.os_number}</span><Badge value={item.status} /></div><div className="text-sm text-gray-500">{formatDateBR(item.opened_at || item.created_at)} · {item.approval_status || '—'}</div></div>)}
              {pendingOs.map((item) => <div key={item.id} className="border-b pb-2"><div className="flex justify-between"><span>{item.payload.title || item.payload.os_number}</span><Badge value="Pendente envio" /></div><p className="text-xs text-gray-500">Preenchido em {formatDateBR(item.client_filled_at)}</p></div>)}
            </div>
          </section>
        )}

        {activeTab === 'fin-api' && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" />Financeiro (Portal RH)</h2>
            <div className="bg-white rounded-xl p-4 shadow space-y-2">
              <select value={finType} onChange={(e) => setFinType(e.target.value)} className="w-full border rounded px-3 py-2"><option>Reembolso</option><option>Adiantamento</option></select>
              <input type="number" step="0.01" value={finAmount} onChange={(e) => setFinAmount(e.target.value)} placeholder="Valor" className="w-full border rounded px-3 py-2" />
              <textarea value={finDescription} onChange={(e) => setFinDescription(e.target.value)} placeholder="Descrição" className="w-full border rounded px-3 py-2" />
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={submitFinancial}>Solicitar</button>
            </div>
            <div className="bg-white rounded-xl p-4 shadow space-y-2">
              {financialRequestsApi.length === 0 && pendingFin.length === 0 ? 'Sem solicitações.' : null}
              {financialRequestsApi.map((item) => <div key={`api-${item.id}`} className="flex justify-between border-b pb-2"><span>{item.type} · {formatDateBR(item.created_at || item.date)}</span><Badge value={item.status} /></div>)}
              {pendingFin.map((item) => <div key={item.id} className="border-b pb-2"><div className="flex justify-between"><span>{item.payload.type} · R$ {item.payload.amount}</span><Badge value="Pendente envio" /></div><p className="text-xs text-gray-500">Preenchido em {formatDateBR(item.client_filled_at)}</p></div>)}
            </div>
          </section>
        )}


        {activeTab === 'pending' && (
          <section className="bg-white rounded-xl p-4 shadow space-y-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><ListTodo className="w-5 h-5 text-blue-600" />Pendências</h2>
            {pendingItems.length === 0 ? <p className="text-sm text-gray-500">Sem pendências.</p> : null}
            {pendingItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{item.kind}</span>
                  <Badge value={item.status === 'PENDING' || item.status === 'FAILED' ? 'Pendente envio' : item.status} />
                </div>
                <p className="text-xs text-gray-500">Preenchido em {formatDateBR(item.client_filled_at)}</p>
                <p className="text-xs text-gray-500">Tentativas: {item.attempts || 0}</p>
                <p className="text-xs text-gray-500">Erro: {item.last_error || '—'}</p>
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1 rounded bg-blue-600 text-white text-xs flex items-center gap-1" onClick={() => handleRetryOutboxItem(item.id)}><RotateCcw className="w-3 h-3" />Tentar agora</button>
                  <button className="px-3 py-1 rounded bg-gray-200 text-gray-700 text-xs flex items-center gap-1" onClick={() => handleRemoveOutboxItem(item.id)}><Trash2 className="w-3 h-3" />Remover</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'guides' && (
          <section className="bg-white rounded-xl p-4 shadow">
            <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" />Guias e Dúvidas</h2>
            <ul className="list-disc pl-5 mt-3 text-sm text-gray-700 space-y-1">
              <li>Como enviar RDO diariamente.</li>
              <li>Prazos de aprovação de OSs e solicitações financeiras.</li>
              <li>Checklist para embarque e documentos obrigatórios.</li>
              <li>Contatos úteis em caso de emergência e suporte.</li>
            </ul>
          </section>
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} extraItems={[
        { key: 'rdos', label: 'RDOS', icon: ClipboardList },
        { key: 'oss', label: 'OSs', icon: Wrench },
        { key: 'fin-api', label: 'Fin RH', icon: Wallet },
        { key: 'pending', label: 'Pend.', icon: ListTodo },
        { key: 'guides', label: 'Guias', icon: BookOpen },
      ]} />
    </div>
  );
}
