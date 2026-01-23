import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Plane,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Bell,
  User,
  Home,
  Briefcase,
  QrCode,
  Phone,
  Shield,
  AlertTriangle,
  Wallet,
  Plus,
  Camera,
  X,
  Check,
  Package,
  History,
  ChevronRight,
  Filter
} from 'lucide-react';

// --- Helpers & Hooks ---

/**
 * useLocalStorageState (SSR-safe)
 * Custom hook to persist state in localStorage.
 */
function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.warn(`Error writing localStorage key "${key}":`, error);
      }
    }
  }, [key, state]);

  return [state, setState];
}

/**
 * Returns current date in YYYY-MM-DD format.
 */
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generates a unique ID with an optional prefix.
 */
function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * safeGeo: Promise that returns { ok, lat, lng, accuracy, ts, error }.
 * Defaults to mock=true for demo/dev stability.
 */
function safeGeo({ mock = true, timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    if (mock) {
      return resolve({
        ok: true,
        lat: -22.9068, // RJ Mock
        lng: -43.1729,
        accuracy: 10,
        ts: new Date().toISOString()
      });
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return resolve({ ok: false, error: "Geolocation not supported" });
    }

    const timer = setTimeout(() => {
      resolve({ ok: false, error: "Timeout getting location" });
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          ts: new Date().toISOString(),
        });
      },
      (err) => {
        clearTimeout(timer);
        resolve({ ok: false, error: err.message });
      },
      { enableHighAccuracy: true, timeout: timeoutMs }
    );
  });
}

/**
 * Converts a File object to a Data URL (Base64).
 */
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Formats an ISO date or Date object to HH:mm:ss.
 */
function formatTimeBR(dateLike) {
  if (!dateLike) return "--:--";
  try {
    const d = new Date(dateLike);
    return d.toLocaleTimeString('pt-BR');
  } catch (e) {
    return "--:--";
  }
}

/**
 * Calculates minutes between two dates.
 */
function minutesBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.floor((e - s) / 60000);
  return diff >= 0 ? diff : 0;
}

/**
 * Sums minutes of pauses.
 */
function sumPauseMinutes(pauses = []) {
  return pauses.reduce((acc, p) => {
    if (p.start && p.end) {
      return acc + minutesBetween(p.start, p.end);
    }
    return acc;
  }, 0);
}

/**
 * Utility to download text/html content as a file.
 */
function downloadTextFile(filename, content, mime = 'text/html;charset=utf-8') {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * EmployeeLogisticsApp (Mock UI)
 * - Feito para rodar SEM backend (mock em memória)
 * - Pronto para você evoluir para chamadas de API depois
 */
const EmployeeLogisticsApp = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [checkInStatus, setCheckInStatus] = useState('pending');
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [profileView, setProfileView] = useState('main'); // main | equipment | history

  // Mock: token seguro deveria vir do backend (assinado / expira)
  const [qrCodeData] = useState('SECURE_TOKEN_V1_748291_HMAC_SIG');

  // Financeiro
  const [expenses, setExpenses] = useState([
    { id: 1, type: 'Alimentação', value: 85.5, date: '2026-01-15', receipt: true, status: 'approved', trip: 'P-74 Jan/2026' },
    { id: 2, type: 'Transporte', value: 45.0, date: '2026-01-15', receipt: true, status: 'pending', trip: 'P-74 Jan/2026' },
    { id: 3, type: 'Hospedagem', value: 220.0, date: '2026-01-14', receipt: true, status: 'approved', trip: 'P-74 Jan/2026' },
  ]);
  const [advances, setAdvances] = useState([
    { id: 1, value: 500.0, date: '2026-01-10', status: 'approved', trip: 'P-74 Jan/2026', used: 350.5 },
    { id: 2, value: 300.0, date: '2025-12-20', status: 'paid', trip: 'P-62 Dez/2025', used: 300.0 },
  ]);
  const [reimbursements] = useState([
    { id: 1, value: 130.0, date: '2026-01-16', status: 'paid', description: 'Reembolso Transporte (ajuste)', trip: 'P-74 Jan/2026' },
    { id: 2, value: 85.5, date: '2026-01-17', status: 'scheduled', description: 'Reembolso Alimentação', trip: 'P-74 Jan/2026' },
  ]);

  const [newExpense, setNewExpense] = useState({ type: '', value: '', date: '', description: '' });
  const [newAdvance, setNewAdvance] = useState({ value: '', justification: '' });
  const [receiptPreview, setReceiptPreview] = useState(null); // object URL

  // --------------------------------------
  // TRABALHO (OS / RDO / Timesheet) - 100% mock + offline
  // --------------------------------------
  const [workSection, setWorkSection] = useState('os'); // os | rdo | timesheet | sync
  const [workScreen, setWorkScreen] = useState({ view: 'list', id: null }); // list | detail | rdoForm

  const [isOnBase, setIsOnBase] = useLocalStorageState('el_isOnBase', false);

  const initialWorkOrders = useMemo(() => {
    const day = todayISO();
    const now = new Date().toISOString();
    return [
      {
        id: uid(),
        code: 'OS-2026-0102',
        title: 'Inspeção e reaperto de flange (Linha A-17)',
        origin: 'Drake',
        destination: 'Plataforma P-74',
        location: 'Bacia de Campos - RJ',
        assignedAt: now,
        dueDate: day,
        status: 'RECEIVED', // RECEIVED | IN_PROGRESS | COMPLETED
        safetyChecklist: [
          { id: uid(), label: 'DDS realizado (briefing de segurança)', done: false },
          { id: uid(), label: 'Permissão de Trabalho (PT) válida', done: false },
          { id: uid(), label: 'EPI completo e inspecionado', done: false },
          { id: uid(), label: 'Área sinalizada / isolada (se aplicável)', done: false },
        ],
        executionChecklist: [
          { id: uid(), label: 'Inspecionar flange visualmente', done: false },
          { id: uid(), label: 'Reapertar para torque especificado', done: false },
          { id: uid(), label: 'Registrar leitura/medição no app', done: false },
          { id: uid(), label: 'Limpeza e organização da área', done: false },
        ],
        time: { startedAt: null, endedAt: null, currentPauseStart: null, pauses: [] },
        evidences: [],
        incidents: [],
        signatures: { worker: null, workerSignedAt: null, supervisor: null, supervisorSignedAt: null },
        sync: { status: 'PENDING', lastAttemptAt: null, syncedAt: null },
      },
      {
        id: uid(),
        code: 'OS-2026-0103',
        title: 'Troca de sensor de vibração (Bomba 2)',
        origin: 'Drake',
        destination: 'Plataforma P-74',
        location: 'Bacia de Campos - RJ',
        assignedAt: now,
        dueDate: day,
        status: 'IN_PROGRESS',
        safetyChecklist: [
          { id: uid(), label: 'DDS realizado (briefing de segurança)', done: true },
          { id: uid(), label: 'Permissão de Trabalho (PT) válida', done: true },
          { id: uid(), label: 'Bloqueio/Tagout aplicado (se aplicável)', done: false },
          { id: uid(), label: 'EPI completo e inspecionado', done: true },
        ],
        executionChecklist: [
          { id: uid(), label: 'Remover sensor antigo', done: true },
          { id: uid(), label: 'Instalar sensor novo', done: false },
          { id: uid(), label: 'Testar leitura / calibração', done: false },
          { id: uid(), label: 'Registrar evidências no app', done: false },
        ],
        time: { startedAt: new Date().toISOString(), endedAt: null, currentPauseStart: null, pauses: [] },
        evidences: [],
        incidents: [],
        signatures: { worker: null, workerSignedAt: null, supervisor: null, supervisorSignedAt: null },
        sync: { status: 'PENDING', lastAttemptAt: null, syncedAt: null },
      },
    ];
  }, []);

  const [workOrders, setWorkOrders] = useLocalStorageState('el_workOrders', initialWorkOrders);

  const initialDailyReports = useMemo(() => {
    // Deixa vazio por padrão para incentivar preencher o RDO no fim do turno
    return [];
  }, []);

  const [dailyReports, setDailyReports] = useLocalStorageState('el_dailyReports', initialDailyReports);
  const [syncLog, setSyncLog] = useLocalStorageState('el_syncLog', []);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState({ title: '', severity: 'media', description: '', photos: [] });
  const [incidentTargetOsId, setIncidentTargetOsId] = useState(null);
  const [rdoDraft, setRdoDraft] = useState({
    date: todayISO(),
    shiftStart: '',
    shiftEnd: '',
    activities: '',
    notes: '',
    safetyChecklistOk: false,
    photos: [],
    workerSignature: null,
    supervisorSignature: null,
  });



  // Equipamentos / EPIs
  const [equipment, setEquipment] = useState([
    { id: 1, name: 'Capacete de Segurança', code: 'EPI-001', status: 'embarcado', condition: 'bom', required: true },
    { id: 2, name: 'Óculos de Proteção', code: 'EPI-002', status: 'embarcado', condition: 'bom', required: true },
    { id: 3, name: 'Luvas de Segurança', code: 'EPI-003', status: 'embarcado', condition: 'bom', required: true },
    { id: 4, name: 'Botina com Biqueira', code: 'EPI-004', status: 'embarcado', condition: 'bom', required: true },
    { id: 5, name: 'Protetor Auricular', code: 'EPI-005', status: 'embarcado', condition: 'bom', required: true },
    { id: 6, name: 'Cinto de Segurança', code: 'EPI-006', status: 'embarcado', condition: 'bom', required: true },
    { id: 7, name: 'Talabarte', code: 'EPI-007', status: 'pendente', condition: 'novo', required: false },
    { id: 8, name: 'Notebook Dell', code: 'EQP-101', status: 'embarcado', condition: 'bom', required: false },
    { id: 9, name: 'Tablet Samsung', code: 'EQP-102', status: 'base', condition: 'bom', required: false },
  ]);

  // Histórico de embarques
  const embarkHistory = [
    {
      id: 1,
      destination: 'Plataforma P-74',
      location: 'Bacia de Campos - RJ',
      embarkDate: '2026-01-18',
      disembarkDate: '2026-02-01',
      status: 'agendado',
      days: 14,
      transportation: 'Helicóptero',
    },
    {
      id: 2,
      destination: 'Plataforma P-62',
      location: 'Bacia de Campos - RJ',
      embarkDate: '2025-12-20',
      disembarkDate: '2026-01-03',
      status: 'concluido',
      days: 14,
      transportation: 'Helicóptero',
    },
    {
      id: 3,
      destination: 'FPSO P-70',
      location: 'Bacia de Santos - SP',
      embarkDate: '2025-11-22',
      disembarkDate: '2025-12-06',
      status: 'concluido',
      days: 14,
      transportation: 'Barco',
    },
    {
      id: 4,
      destination: 'Plataforma P-58',
      location: 'Bacia de Campos - RJ',
      embarkDate: '2025-10-25',
      disembarkDate: '2025-11-08',
      status: 'concluido',
      days: 14,
      transportation: 'Helicóptero',
    },
    {
      id: 5,
      destination: 'Plataforma P-74',
      location: 'Bacia de Campos - RJ',
      embarkDate: '2025-09-27',
      disembarkDate: '2025-10-11',
      status: 'concluido',
      days: 14,
      transportation: 'Helicóptero',
    },
  ];

  // Mock do colaborador
  const employee = {
    name: 'João Silva',
    registration: '12345',
    cpf: '123.456.789-00',
    currentStatus: 'Em Trânsito',
    photo: 'https://ui-avatars.com/api/?name=Joao+Silva&background=0D47A1&color=fff&size=128',
  };

  const currentTrip = {
    destination: 'Plataforma P-74',
    embarkDate: '2026-01-18',
    disembarkDate: '2026-02-01',
    daysRemaining: 3,
    location: 'Bacia de Campos - RJ',
    transportation: 'Helicóptero',
  };

  const boarding = {
    date: '2026-01-18',
    time: '06:30',
    location: 'Base de Cabo Frio - RJ',
    flight: 'HEL-458',
    seat: '3A',
    terminal: 'Heliponto 2',
    checkInTime: '05:30',
  };

  const documents = [
    { name: 'Cartão de Embarque', type: 'PDF', date: '18/01/2026', icon: Plane },
    { name: 'Ordem de Serviço', type: 'PDF', date: '15/01/2026', icon: FileText },
    { name: 'Comprovante de Diária', type: 'PDF', date: '15/01/2026', icon: FileText },
    { name: 'Seguro Viagem', type: 'PDF', date: '10/01/2026', icon: FileText },
  ];

  // Documentos pessoais
  const personalDocuments = [
    {
      name: 'RG',
      number: '12.345.678-9',
      issueDate: '15/03/2020',
      expiryDate: null,
      status: 'valid',
    },
    {
      name: 'CPF',
      number: '123.456.789-00',
      issueDate: '10/01/2000',
      expiryDate: null,
      status: 'valid',
    },
    {
      name: 'CNH',
      number: '12345678900',
      issueDate: '20/06/2021',
      expiryDate: '20/06/2026',
      daysToExpiry: 155,
      status: 'valid',
    },
    {
      name: 'ASO',
      number: 'ASO-2024-001',
      issueDate: '10/01/2026',
      expiryDate: '10/07/2026',
      daysToExpiry: 175,
      status: 'valid',
    },
    {
      name: 'NR-35 (Trabalho em Altura)',
      number: 'NR35-2024-456',
      issueDate: '05/02/2024',
      expiryDate: '05/02/2026',
      daysToExpiry: 20,
      status: 'warning',
    },
    {
      name: 'NR-10 (Segurança Elétrica)',
      number: 'NR10-2023-789',
      issueDate: '15/12/2023',
      expiryDate: '15/12/2025',
      daysToExpiry: -32,
      status: 'expired',
    },
  ];

  // Contatos de emergência
  const emergencyContacts = [
    {
      name: 'Emergência - Central 24h',
      phone: '0800-123-4567',
      type: 'emergency',
      description: 'Qualquer emergência médica ou de segurança',
    },
    {
      name: 'RH - Logística',
      phone: '(21) 3456-7890',
      type: 'rh',
      description: 'Dúvidas sobre embarque e viagens',
    },
    {
      name: 'SESMT',
      phone: '(21) 3456-7891',
      type: 'safety',
      description: 'Segurança e saúde ocupacional',
    },
    {
      name: 'Suporte TI',
      phone: '(21) 3456-7892',
      type: 'support',
      description: 'Problemas com sistemas e app',
    },
  ];

  const timeline = [
    { date: '18/01', event: 'Check-in Base Cabo Frio', time: '05:30', status: 'pending' },
    { date: '18/01', event: 'Embarque Helicóptero', time: '06:30', status: 'pending' },
    { date: '18/01', event: 'Chegada Plataforma', time: '07:45', status: 'pending' },
    { date: '01/02', event: 'Desembarque Plataforma', time: '14:00', status: 'scheduled' },
  ];

  // --- Utils ---

  // Corrige bug de timezone: new Date('YYYY-MM-DD') pode voltar dia anterior dependendo do fuso.
  const formatDateBR = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  const formatMoney = (n) => {
    const v = Number(n || 0);
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getDocumentStatusColor = (status) => {
    switch (status) {
      case 'expired':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'valid':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getDocumentStatusText = (doc) => {
    if (!doc.expiryDate) return 'Válido';
    if (doc.status === 'expired') return 'VENCIDO';
    if (doc.status === 'warning') return `Vence em ${doc.daysToExpiry} dias`;
    return 'Válido';
  };

  const handleCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  const registerCheck = async (type) => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const payload = {
          type, // CHECK_IN | CHECK_OUT
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        try {
          // TODO: POST /api/checkins (quando você ligar backend)
          console.log('TODO: POST /api/checkins', payload);

          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });

          if (type === 'CHECK_IN') {
            setCheckInStatus('success');
            setTimeout(() => setCheckInStatus('completed'), 1200);
          } else {
            alert('Check-out realizado com sucesso!');
          }
        } catch (err) {
          console.error('Erro ao registrar check:', err);
          alert('Erro de conexão. Tente novamente.');
        }
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        alert('Não foi possível obter sua localização. Verifique as permissões do navegador.');
      }
    );
  };

  const handleCheckIn = () => registerCheck('CHECK_IN');
  const handleCheckOut = () => registerCheck('CHECK_OUT');

  // --- Tabs ---

  const HomeTab = () => (
    <div className="space-y-4">
      {/* Status Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm">Status Atual</p>
            <h2 className="text-2xl font-bold">{employee.currentStatus}</h2>
          </div>
          <div className="bg-white/20 p-3 rounded-full">
            <Briefcase className="w-8 h-8" />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="w-4 h-4" />
          <span>{currentTrip.location}</span>
        </div>
      </div>

      {/* Próximo Embarque */}
      <div className="bg-white rounded-xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Próximo Embarque
          </h3>
          <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
            {currentTrip.daysRemaining} dias
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-600 text-sm">Destino</span>
            <span className="font-semibold text-gray-800">{currentTrip.destination}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-600 text-sm">Data de Embarque</span>
            <span className="font-semibold text-gray-800">{formatDateBR(currentTrip.embarkDate)}</span>
          </div>
          <div className="flex justify-between items-center pb-3 border-b">
            <span className="text-gray-600 text-sm">Data de Desembarque</span>
            <span className="font-semibold text-gray-800">{formatDateBR(currentTrip.disembarkDate)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 text-sm">Transporte</span>
            <span className="font-semibold text-gray-800">{currentTrip.transportation}</span>
          </div>
        </div>
      </div>

      {/* Check-in/Check-out */}
      <div className="bg-white rounded-xl p-5 shadow-md">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-600" />
          Confirmar Localização
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCheckIn}
            disabled={checkInStatus === 'completed'}
            className={`${
              checkInStatus === 'completed'
                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            } py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors`}
          >
            {checkInStatus === 'completed' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Check-in Feito
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Check-in
              </>
            )}
          </button>

          <button
            onClick={handleCheckOut}
            className="bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center gap-2 transition-colors"
          >
            <MapPin className="w-5 h-5" />
            Check-out
          </button>
        </div>

        {currentLocation && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
            <p className="font-semibold text-gray-800 mb-1">Localização capturada:</p>
            <p>Lat: {currentLocation.lat.toFixed(6)}</p>
            <p>Lng: {currentLocation.lng.toFixed(6)}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl p-5 shadow-md">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600" />
          Cronograma
        </h3>

        <div className="space-y-3">
          {timeline.map((item, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-3 h-3 rounded-full ${
                    item.status === 'completed'
                      ? 'bg-green-500'
                      : item.status === 'pending'
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                  }`}
                />
                {index < timeline.length - 1 && <div className="w-0.5 h-12 bg-gray-200 my-1" />}
              </div>
              <div className="flex-1 pb-3">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-semibold text-gray-800 text-sm">{item.event}</p>
                  <span className="text-xs text-gray-500">{item.date}</span>
                </div>
                <p className="text-sm text-gray-600">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const TripTab = () => {
    // Para demo: gera QR via imagem externa (rápido) usando apenas o token mock.
    // Produção: prefira QR gerado no backend e com expiração.
    const qrCodeUrl = useMemo(() => {
      const data = `EMBARQUE|${employee.registration}|${boarding.flight}|${boarding.date}|${qrCodeData}`;
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
    }, [employee.registration, boarding.flight, boarding.date, qrCodeData]);

    return (
      <div className="space-y-4">
        {/* QR Code */}
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            QR Code de Identificação
          </h3>

          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-3 flex items-center justify-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-sm text-gray-600 text-center mb-2">Apresente este QR Code nos terminais de embarque</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 w-full">
              <p className="text-xs text-blue-800">
                <strong>Matrícula:</strong> {employee.registration}
              </p>
              <p className="text-xs text-blue-800">
                <strong>Voo:</strong> {boarding.flight}
              </p>
              <p className="text-[11px] text-blue-800 mt-1 font-mono break-all">
                <strong>Token:</strong> {qrCodeData.substring(0, 18)}...
              </p>
            </div>
          </div>
        </div>

        {/* Cartão de Embarque */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">CARTÃO DE EMBARQUE</span>
              <Plane className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{boarding.flight}</p>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">PASSAGEIRO</p>
                <p className="font-semibold text-gray-800">{employee.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">ASSENTO</p>
                <p className="font-semibold text-gray-800">{boarding.seat}</p>
              </div>
            </div>

            <div className="border-t pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">DATA</p>
                <p className="font-semibold text-gray-800">{formatDateBR(boarding.date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">HORÁRIO</p>
                <p className="font-semibold text-gray-800">{boarding.time}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-500 mb-1">LOCAL DE EMBARQUE</p>
              <p className="font-semibold text-gray-800">{boarding.location}</p>
              <p className="text-sm text-gray-600 mt-1">{boarding.terminal}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Apresente-se às {boarding.checkInTime}</p>
                <p className="text-xs text-yellow-700 mt-1">Check-in obrigatório com 1 hora de antecedência</p>
              </div>
            </div>

            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Download className="w-5 h-5" />
              Baixar Cartão de Embarque
            </button>
          </div>
        </div>

        {/* Documentos */}
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Documentos da Viagem
          </h3>

          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => alert(`(Demo) Abrir documento: ${doc.name}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <doc.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{doc.name}</p>
                    <p className="text-xs text-gray-500">
                      {doc.type} • {doc.date}
                    </p>
                  </div>
                </div>
                <Download className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };


  // --------------------------------------
  // Trabalho Tab (OS / RDO / Timesheet / Sync)
  // --------------------------------------
  const getOsStatusChip = (os) => {
    if (os.status === 'COMPLETED') return { label: 'Concluída', cls: 'bg-green-100 text-green-700' };
    if (os.status === 'IN_PROGRESS') return { label: 'Em Execução', cls: 'bg-blue-100 text-blue-700' };
    return { label: 'Recebida', cls: 'bg-gray-100 text-gray-700' };
  };

  const countChecklistDone = (items = []) => items.filter((i) => i.done).length;

  const WorkTab = () => {
    const selectedOs =
      workScreen.view === 'detail' ? workOrders.find((o) => o.id === workScreen.id) : null;

    const pendingSyncOs = workOrders.filter((o) => o.status === 'COMPLETED' && o.sync?.status !== 'SYNCED');
    const pendingSyncRdo = dailyReports.filter((r) => r.sync?.status !== 'SYNCED');
    const pendingSyncCount = pendingSyncOs.length + pendingSyncRdo.length;

    const addMockOsFromDrake = () => {
      const day = todayISO();
      const newOs = {
        id: uid(),
        code: `OS-2026-${String(Math.floor(1000 + Math.random() * 8999))}`,
        title: 'OS recebida do Drake (mock)',
        origin: 'Drake',
        destination: currentTrip.destination,
        location: currentTrip.location,
        assignedAt: new Date().toISOString(),
        dueDate: day,
        status: 'RECEIVED',
        safetyChecklist: [
          { id: uid(), label: 'DDS realizado (briefing de segurança)', done: false },
          { id: uid(), label: 'Permissão de Trabalho (PT) válida', done: false },
          { id: uid(), label: 'EPI completo e inspecionado', done: false },
        ],
        executionChecklist: [
          { id: uid(), label: 'Executar atividade principal', done: false },
          { id: uid(), label: 'Registrar evidências no app', done: false },
          { id: uid(), label: 'Encerrar com assinatura do supervisor', done: false },
        ],
        time: { startedAt: null, endedAt: null, currentPauseStart: null, pauses: [] },
        evidences: [],
        incidents: [],
        signatures: { worker: null, workerSignedAt: null, supervisor: null, supervisorSignedAt: null },
        sync: { status: 'PENDING', lastAttemptAt: null, syncedAt: null },
      };
      setWorkOrders([newOs, ...workOrders]);
    };

    const updateWorkOrder = (id, updater) => {
      setWorkOrders(workOrders.map((os) => (os.id === id ? updater(os) : os)));
    };

    const toggleChecklistItem = (osId, listKey, itemId) => {
      updateWorkOrder(osId, (os) => ({
        ...os,
        [listKey]: os[listKey].map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
      }));
    };

    const startOs = async (osId) => {
      const geo = await safeGeo();
      updateWorkOrder(osId, (os) => ({
        ...os,
        status: 'IN_PROGRESS',
        time: { ...os.time, startedAt: os.time.startedAt ?? new Date().toISOString() },
        geoStart: geo ? { ...geo, capturedAt: new Date().toISOString() } : os.geoStart,
      }));
    };

    const pauseOs = (osId) => {
      updateWorkOrder(osId, (os) => ({
        ...os,
        time: { ...os.time, currentPauseStart: new Date().toISOString() },
      }));
    };

    const resumeOs = (osId) => {
      updateWorkOrder(osId, (os) => {
        const start = os.time.currentPauseStart;
        if (!start) return os;
        const pause = { id: uid(), start, end: new Date().toISOString() };
        return {
          ...os,
          time: { ...os.time, currentPauseStart: null, pauses: [...(os.time.pauses ?? []), pause] },
        };
      });
    };

    const finishOs = async (osId) => {
      const geo = await safeGeo();
      updateWorkOrder(osId, (os) => ({
        ...os,
        status: 'COMPLETED',
        time: { ...os.time, endedAt: new Date().toISOString(), currentPauseStart: null },
        geoEnd: geo ? { ...geo, capturedAt: new Date().toISOString() } : os.geoEnd,
        sync: { ...(os.sync ?? {}), status: 'PENDING', lastAttemptAt: null, syncedAt: null },
      }));
    };

    const addEvidencePhotos = async (osId, files) => {
      if (!files || files.length === 0) return;
      const geo = await safeGeo();
      const createdAt = new Date().toISOString();
      const items = await Promise.all(
        Array.from(files).map(async (f) => ({
          id: uid(),
          name: f.name,
          dataUrl: await fileToDataUrl(f),
          createdAt,
          geo: geo ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : null,
        }))
      );
      updateWorkOrder(osId, (os) => ({ ...os, evidences: [...(os.evidences ?? []), ...items] }));
    };

    const removeEvidencePhoto = (osId, photoId) => {
      updateWorkOrder(osId, (os) => ({ ...os, evidences: (os.evidences ?? []).filter((p) => p.id !== photoId) }));
    };

    const openIncidentForOs = (osId) => {
      setIncidentTargetOsId(osId);
      setIncidentDraft({ title: '', severity: 'media', description: '', photos: [] });
      setShowIncidentModal(true);
    };

    const addIncidentPhotos = async (files) => {
      if (!files || files.length === 0) return;
      const geo = await safeGeo();
      const createdAt = new Date().toISOString();
      const items = await Promise.all(
        Array.from(files).map(async (f) => ({
          id: uid(),
          name: f.name,
          dataUrl: await fileToDataUrl(f),
          createdAt,
          geo: geo ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : null,
        }))
      );
      setIncidentDraft((d) => ({ ...d, photos: [...(d.photos ?? []), ...items] }));
    };

    const submitIncident = () => {
      if (!incidentTargetOsId) return;
      if (!incidentDraft.title || !incidentDraft.description) {
        alert('Preencha título e descrição da intercorrência.');
        return;
      }
      const incident = { id: uid(), ...incidentDraft, createdAt: new Date().toISOString() };
      updateWorkOrder(incidentTargetOsId, (os) => ({
        ...os,
        incidents: [incident, ...(os.incidents ?? [])],
        sync: { ...(os.sync ?? {}), status: 'PENDING' },
      }));
      setShowIncidentModal(false);
      setIncidentTargetOsId(null);
    };

    const SignaturePad = ({ value, onChange }) => {
      const canvasRef = useRef(null);
      const drawingRef = useRef(false);
      const lastRef = useRef({ x: 0, y: 0 });

      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#111827';

        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.floor(rect.width * ratio);
        canvas.height = Math.floor(rect.height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

        ctx.clearRect(0, 0, rect.width, rect.height);
        if (value) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
          img.src = value;
        }
      }, [value]);

      const getPoint = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
      };

      const start = (e) => {
        e.preventDefault();
        drawingRef.current = true;
        lastRef.current = getPoint(e);
      };

      const move = (e) => {
        if (!drawingRef.current) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const p = getPoint(e);
        ctx.beginPath();
        ctx.moveTo(lastRef.current.x, lastRef.current.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastRef.current = p;
      };

      const end = () => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        try {
          onChange(canvasRef.current.toDataURL('image/png'));
        } catch (e) {}
      };

      const clear = () => onChange(null);

      return (
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-800">Assine aqui</p>
            <button onClick={clear} className="text-xs px-3 py-1 rounded-lg bg-white border hover:bg-gray-50">
              Limpar
            </button>
          </div>
          <div className="h-32 bg-white border rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-full touch-none"
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
              onTouchStart={start}
              onTouchMove={move}
              onTouchEnd={end}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Assinatura fica salva localmente (mock) e entra na fila de sync.
          </p>
        </div>
      );
    };

    const setSignature = (osId, who, dataUrl) => {
      updateWorkOrder(osId, (os) => ({
        ...os,
        signatures: { ...(os.signatures ?? {}), [who]: dataUrl, [`${who}SignedAt`]: dataUrl ? new Date().toISOString() : null },
        sync: { ...(os.sync ?? {}), status: 'PENDING' },
      }));
    };

    const exportOsReport = (os) => {
      const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"/><title>Relatório - ${os.code}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;color:#111827}
h1{margin:0 0 8px}.muted{color:#6b7280;font-size:12px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:12px}img{width:100%;border-radius:10px;border:1px solid #e5e7eb}.meta{margin-top:8px;font-size:12px;color:#374151}</style></head>
<body><h1>${os.code} • ${os.title}</h1><div class="muted">${os.destination} • ${os.location} • Venc.: ${os.dueDate}</div>
<div class="muted">Início: ${formatTimeBR(os.time?.startedAt)} • Fim: ${formatTimeBR(os.time?.endedAt)}</div>
<h2>Fotos/Evidências</h2><div class="grid">${(os.evidences ?? []).map((p) => `
<div class="card"><img src="${p.dataUrl}" alt="evidência"/><div class="meta">
<div><strong>Timestamp:</strong> ${new Date(p.createdAt).toLocaleString('pt-BR')}</div>
<div><strong>Geo:</strong> ${p.geo ? `${p.geo.lat.toFixed(6)}, ${p.geo.lng.toFixed(6)} (±${Math.round(p.geo.accuracy)}m)` : 'não capturado'}</div>
</div></div>`).join('')}</div>
<h2>Checklist de Segurança</h2><ul>${(os.safetyChecklist ?? []).map((i) => `<li>${i.done ? '✅' : '⬜'} ${i.label}</li>`).join('')}</ul>
<h2>Checklist de Execução</h2><ul>${(os.executionChecklist ?? []).map((i) => `<li>${i.done ? '✅' : '⬜'} ${i.label}</li>`).join('')}</ul>
<h2>Intercorrências</h2><ul>${(os.incidents ?? []).map((inc) => `<li><strong>${inc.title}</strong> (${inc.severity}) • ${new Date(inc.createdAt).toLocaleString('pt-BR')}<br/>${inc.description}</li>`).join('') || '<li>Nenhuma</li>'}</ul>
</body></html>`;
      downloadTextFile(`${os.code}-relatorio.html`, html, 'text/html;charset=utf-8');
    };

    const canConcludeOs = (os) => {
      const missing = [];
      if ((os.safetyChecklist ?? []).some((i) => !i.done)) missing.push('Checklist de segurança');
      if ((os.executionChecklist ?? []).some((i) => !i.done)) missing.push('Checklist de execução');
      if (!(os.evidences ?? []).length) missing.push('Pelo menos 1 foto/evidência');
      if (!os.signatures?.worker) missing.push('Assinatura do colaborador');
      if (!os.signatures?.supervisor) missing.push('Assinatura do supervisor');
      return { ok: missing.length === 0, missing };
    };

    const concludeOs = async (osId) => {
      const os = workOrders.find((o) => o.id === osId);
      if (!os) return;
      const check = canConcludeOs(os);
      if (!check.ok) {
        alert(`Não dá pra concluir ainda. Falta:
- ${check.missing.join('\n- ')}`);
        return;
      }
      await finishOs(osId);
      alert('OS concluída e enviada para fila de sincronização (mock).');
    };

    const startRdo = () => {
      setRdoDraft({
        date: todayISO(),
        shiftStart: '',
        shiftEnd: '',
        activities: '',
        notes: '',
        safetyChecklistOk: false,
        photos: [],
        workerSignature: null,
        supervisorSignature: null,
      });
      setWorkSection('rdo');
      setWorkScreen({ view: 'rdoForm', id: null });
    };

    const addRdoPhotos = async (files) => {
      if (!files || files.length === 0) return;
      const geo = await safeGeo();
      const createdAt = new Date().toISOString();
      const items = await Promise.all(
        Array.from(files).map(async (f) => ({
          id: uid(),
          name: f.name,
          dataUrl: await fileToDataUrl(f),
          createdAt,
          geo: geo ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : null,
        }))
      );
      setRdoDraft((d) => ({ ...d, photos: [...(d.photos ?? []), ...items] }));
    };

    const removeRdoPhoto = (photoId) => {
      setRdoDraft((d) => ({ ...d, photos: (d.photos ?? []).filter((p) => p.id !== photoId) }));
    };

    const submitRdo = async () => {
      if (!rdoDraft.shiftStart || !rdoDraft.shiftEnd || !rdoDraft.activities) {
        alert('Preencha: início do turno, fim do turno e atividades realizadas.');
        return;
      }
      if (!rdoDraft.workerSignature || !rdoDraft.supervisorSignature) {
        alert('Falta assinatura do colaborador e/ou do supervisor.');
        return;
      }
      const geo = await safeGeo();
      const day = rdoDraft.date || todayISO();
      const completedOs = workOrders.filter((o) => o.status === 'COMPLETED');

      const rdo = {
        id: uid(),
        date: day,
        shiftStart: rdoDraft.shiftStart,
        shiftEnd: rdoDraft.shiftEnd,
        activities: rdoDraft.activities,
        notes: rdoDraft.notes,
        safetyChecklistOk: !!rdoDraft.safetyChecklistOk,
        photos: rdoDraft.photos ?? [],
        workerSignature: rdoDraft.workerSignature,
        supervisorSignature: rdoDraft.supervisorSignature,
        osCompleted: completedOs.map((o) => ({ code: o.code, title: o.title })),
        incidents: completedOs.flatMap((o) => o.incidents ?? []).slice(0, 20),
        geo: geo ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : null,
        createdAt: new Date().toISOString(),
        sync: { status: 'PENDING', lastAttemptAt: null, syncedAt: null },
      };

      setDailyReports([rdo, ...dailyReports]);
      setWorkScreen({ view: 'list', id: null });
      alert('RDO salvo no dispositivo e entrou na fila de sincronização (mock).');
    };

    const exportRdoReport = (rdo) => {
      const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"/><title>RDO - ${rdo.date}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;padding:24px;color:#111827}
h1{margin:0 0 8px}.muted{color:#6b7280;font-size:12px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}
.card{border:1px solid #e5e7eb;border-radius:12px;padding:12px}img{width:100%;border-radius:10px;border:1px solid #e5e7eb}.meta{margin-top:8px;font-size:12px;color:#374151}</style></head>
<body><h1>RDO • ${rdo.date}</h1><div class="muted">Turno: ${rdo.shiftStart} → ${rdo.shiftEnd}</div>
<div class="muted">Geo: ${rdo.geo ? `${rdo.geo.lat.toFixed(6)}, ${rdo.geo.lng.toFixed(6)} (±${Math.round(rdo.geo.accuracy)}m)` : 'não capturado'}</div>
<h2>Atividades realizadas</h2><p>${(rdo.activities ?? '').split('\n').join('<br/>')}</p>
<h2>OS concluídas</h2><ul>${(rdo.osCompleted ?? []).map((o)=>`<li><strong>${o.code}</strong> • ${o.title}</li>`).join('') || '<li>Nenhuma</li>'}</ul>
<h2>Fotos (geo + timestamp)</h2><div class="grid">${(rdo.photos ?? []).map((p)=>`
<div class="card"><img src="${p.dataUrl}" alt="evidência"/><div class="meta">
<div><strong>Timestamp:</strong> ${new Date(p.createdAt).toLocaleString('pt-BR')}</div>
<div><strong>Geo:</strong> ${p.geo ? `${p.geo.lat.toFixed(6)}, ${p.geo.lng.toFixed(6)} (±${Math.round(p.geo.accuracy)}m)` : 'não capturado'}</div>
</div></div>`).join('')}</div></body></html>`;
      downloadTextFile(`RDO-${rdo.date}.html`, html, 'text/html;charset=utf-8');
    };

    const syncNow = () => {
      if (!isOnBase) {
        alert('Para sincronizar com o Drake (mock), marque “Voltei à base”.');
        return;
      }
      const now = new Date().toISOString();

      setWorkOrders(
        workOrders.map((o) =>
          o.status === 'COMPLETED' ? { ...o, sync: { status: 'SYNCED', lastAttemptAt: now, syncedAt: now } } : o
        )
      );
      setDailyReports(
        dailyReports.map((r) =>
          r.sync?.status !== 'SYNCED' ? { ...r, sync: { status: 'SYNCED', lastAttemptAt: now, syncedAt: now } } : r
        )
      );

      setSyncLog([{ id: uid(), at: now, message: `Sync concluído: ${pendingSyncCount} item(ns)` }, ...syncLog].slice(0, 30));
      alert('Sincronização mock concluída ✅');
    };

    const TimesheetView = () => {
      const rows = workOrders
        .filter((o) => o.time?.startedAt)
        .map((o) => {
          const end = o.time.endedAt ?? new Date().toISOString();
          const total = minutesBetween(o.time.startedAt, end);
          const pause = sumPauseMinutes(o.time.pauses ?? []) + (o.time.currentPauseStart ? minutesBetween(o.time.currentPauseStart, end) : 0);
          const worked = Math.max(0, total - pause);
          return { code: o.code, title: o.title, startedAt: o.time.startedAt, endedAt: o.time.endedAt, pause, worked };
        });

      const workedTotal = rows.reduce((s, r) => s + r.worked, 0);
      const pauseTotal = rows.reduce((s, r) => s + r.pause, 0);
      const overtime = Math.max(0, workedTotal - 8 * 60);

      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">Timesheet (mock)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Trabalhado</p>
                <p className="font-bold text-gray-800">{Math.floor(workedTotal / 60)}h {workedTotal % 60}m</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Pausas</p>
                <p className="font-bold text-gray-800">{Math.floor(pauseTotal / 60)}h {pauseTotal % 60}m</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Banco de horas</p>
                <p className="font-bold text-gray-800">+{Math.floor(overtime / 60)}h {overtime % 60}m</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md">
            <h3 className="font-bold text-gray-800 mb-4">Registros por OS</h3>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.code} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{r.code}</p>
                      <p className="text-xs text-gray-500">{r.title}</p>
                    </div>
                    <div className="text-right text-xs text-gray-600">
                      <div>Trabalhado: <strong>{Math.floor(r.worked / 60)}h {r.worked % 60}m</strong></div>
                      <div>Pausas: <strong>{Math.floor(r.pause / 60)}h {r.pause % 60}m</strong></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 pt-2 border-t">
                    Início: {formatTimeBR(r.startedAt)} • Fim: {formatTimeBR(r.endedAt)}
                  </div>
                </div>
              ))}
              {rows.length === 0 && <div className="text-sm text-gray-500">Nenhuma OS iniciada ainda.</div>}
            </div>
          </div>
        </div>
      );
    };

    const WorkOrdersList = () => (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-300 text-sm">Trabalho</p>
              <h2 className="text-2xl font-bold">OS • RDO • Timesheet</h2>
            </div>
            <div className="bg-white/15 px-3 py-1 rounded-full text-xs font-semibold">
              {pendingSyncCount} pendência(s) p/ sync
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-200">Status de conexão</span>
            <button
              onClick={() => setIsOnBase(!isOnBase)}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors ${isOnBase ? 'bg-green-500/20 text-green-200' : 'bg-yellow-500/20 text-yellow-200'}`}
            >
              {isOnBase ? 'Voltei à base' : 'Em campo (offline)'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={addMockOsFromDrake} className="bg-white/15 hover:bg-white/20 py-3 rounded-lg font-semibold">
              Receber OS (mock)
            </button>
            <button
              onClick={() => { setWorkSection('sync'); setWorkScreen({ view: 'list', id: null }); }}
              className="bg-white/15 hover:bg-white/20 py-3 rounded-lg font-semibold"
            >
              Ver Sync
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-2 shadow-md flex gap-2">
          {[
            { key: 'os', label: 'OS' },
            { key: 'rdo', label: 'RDO' },
            { key: 'timesheet', label: 'Timesheet' },
            { key: 'sync', label: 'Sync' },
          ].map((b) => (
            <button
              key={b.key}
              onClick={() => { setWorkSection(b.key); setWorkScreen({ view: 'list', id: null }); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${workSection === b.key ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {workSection === 'os' && (
          <div className="bg-white rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">Ordens de Serviço</h3>
              <span className="text-xs text-gray-500">{workOrders.length} no total</span>
            </div>

            <div className="space-y-2">
              {workOrders.map((os) => {
                const chip = getOsStatusChip(os);
                const safetyDone = countChecklistDone(os.safetyChecklist);
                const execDone = countChecklistDone(os.executionChecklist);
                const safetyTotal = os.safetyChecklist?.length ?? 0;
                const execTotal = os.executionChecklist?.length ?? 0;
                const hasPhotos = (os.evidences ?? []).length > 0;
                const hasWorkerSig = !!os.signatures?.worker;
                const hasSupSig = !!os.signatures?.supervisor;

                return (
                  <button
                    key={os.id}
                    onClick={() => setWorkScreen({ view: 'detail', id: os.id })}
                    className="w-full text-left border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{os.code}</p>
                        <p className="text-sm text-gray-600">{os.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{os.destination} • Venc.: {os.dueDate}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${chip.cls}`}>{chip.label}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-xs pt-3 border-t">
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-500">Seg.</p>
                        <p className="font-semibold text-gray-800">{safetyDone}/{safetyTotal}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2 text-center">
                        <p className="text-gray-500">Exec.</p>
                        <p className="font-semibold text-gray-800">{execDone}/{execTotal}</p>
                      </div>
                      <div className={`rounded p-2 text-center ${hasPhotos ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <p className="text-gray-500">Fotos</p>
                        <p className={`font-semibold ${hasPhotos ? 'text-green-700' : 'text-gray-800'}`}>{os.evidences?.length ?? 0}</p>
                      </div>
                      <div className={`rounded p-2 text-center ${(hasWorkerSig && hasSupSig) ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <p className="text-gray-500">Assin.</p>
                        <p className={`font-semibold ${(hasWorkerSig && hasSupSig) ? 'text-green-700' : 'text-gray-800'}`}>
                          {(hasWorkerSig ? 1 : 0) + (hasSupSig ? 1 : 0)}/2
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button onClick={startRdo} className="bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
                Preencher RDO (fim do turno)
              </button>
              <button onClick={() => setWorkSection('timesheet')} className="bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-black">
                Ver Timesheet
              </button>
            </div>
          </div>
        )}

        {workSection === 'rdo' && workScreen.view === 'list' && (
          <div className="bg-white rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">RDOs</h3>
              <button onClick={startRdo} className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ Novo RDO</button>
            </div>

            <div className="space-y-2">
              {dailyReports.map((rdo) => (
                <div key={rdo.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800">{rdo.date}</p>
                      <p className="text-xs text-gray-500">Turno: {rdo.shiftStart} → {rdo.shiftEnd}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${rdo.sync?.status === 'SYNCED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {rdo.sync?.status === 'SYNCED' ? 'Sincronizado' : 'Pendente'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 pt-2 border-t flex items-center justify-between">
                    <span>Fotos: <strong>{rdo.photos?.length ?? 0}</strong></span>
                    <button onClick={() => exportRdoReport(rdo)} className="text-blue-600 font-semibold hover:text-blue-700">
                      Exportar relatório
                    </button>
                  </div>
                </div>
              ))}
              {dailyReports.length === 0 && <div className="text-sm text-gray-500">Nenhum RDO ainda. Crie no fim do turno.</div>}
            </div>
          </div>
        )}

        {workSection === 'rdo' && workScreen.view === 'rdoForm' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-md">
              <button onClick={() => setWorkScreen({ view: 'list', id: null })} className="text-blue-600 font-semibold hover:text-blue-700">
                ← Voltar
              </button>
              <h3 className="text-xl font-bold text-gray-800 mt-2">RDO (fim do turno)</h3>
              <p className="text-sm text-gray-600">Preencha no celular e anexe evidências.</p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-md space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Início do turno *</label>
                  <input value={rdoDraft.shiftStart} onChange={(e) => setRdoDraft({ ...rdoDraft, shiftStart: e.target.value })} placeholder="07:00" className="w-full p-3 border rounded-lg"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fim do turno *</label>
                  <input value={rdoDraft.shiftEnd} onChange={(e) => setRdoDraft({ ...rdoDraft, shiftEnd: e.target.value })} placeholder="19:00" className="w-full p-3 border rounded-lg"/>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Checklist de atividades realizadas *</label>
                <textarea value={rdoDraft.activities} onChange={(e) => setRdoDraft({ ...rdoDraft, activities: e.target.value })} rows="4" className="w-full p-3 border rounded-lg" placeholder="- Atividade 1...&#10;- Atividade 2..."/>
                <p className="text-xs text-gray-500 mt-1">Dica: cite as OS (código) e resultados.</p>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Checklist de segurança</p>
                  <p className="text-xs text-gray-600">Confirma que os itens de segurança foram seguidos.</p>
                </div>
                <input type="checkbox" checked={!!rdoDraft.safetyChecklistOk} onChange={(e) => setRdoDraft({ ...rdoDraft, safetyChecklistOk: e.target.checked })} className="w-5 h-5"/>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Observações (intercorrências)</label>
                <textarea value={rdoDraft.notes} onChange={(e) => setRdoDraft({ ...rdoDraft, notes: e.target.value })} rows="3" className="w-full p-3 border rounded-lg" placeholder="Descreva intercorrências e ações tomadas..."/>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-800">Fotos/Evidências (geo + timestamp)</p>
                  <label className="text-sm font-semibold text-blue-600 cursor-pointer">
                    + Adicionar
                    <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addRdoPhotos(e.target.files)}/>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(rdoDraft.photos ?? []).map((p) => (
                    <div key={p.id} className="relative">
                      <img src={p.dataUrl} alt="foto" className="w-full h-20 object-cover rounded-lg border"/>
                      <button onClick={() => removeRdoPhoto(p.id)} className="absolute top-1 right-1 bg-white/90 border rounded-full w-6 h-6 flex items-center justify-center text-xs" title="Remover">×</button>
                    </div>
                  ))}
                </div>

                {(rdoDraft.photos ?? []).length === 0 && <p className="text-xs text-gray-500">Nenhuma foto anexada ainda.</p>}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800 mb-2">Assinatura do colaborador *</p>
                  <SignaturePad value={rdoDraft.workerSignature} onChange={(v) => setRdoDraft({ ...rdoDraft, workerSignature: v })}/>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-2">Assinatura do supervisor *</p>
                  <SignaturePad value={rdoDraft.supervisorSignature} onChange={(v) => setRdoDraft({ ...rdoDraft, supervisorSignature: v })}/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setWorkScreen({ view: 'list', id: null })} className="border border-gray-300 rounded-lg py-3 font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={submitRdo} className="bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700">Salvar RDO</button>
              </div>
            </div>
          </div>
        )}

        {workSection === 'timesheet' && <TimesheetView />}

        {workSection === 'sync' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-800">Sincronização com Drake (mock)</h3>
                <span className="text-xs text-gray-500">{pendingSyncCount} item(ns)</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Situação</p>
                  <p className="text-xs text-gray-600">{isOnBase ? 'Na base: pronto para sincronizar' : 'Em campo: salva local e sincroniza depois'}</p>
                </div>
                <button onClick={() => setIsOnBase(!isOnBase)} className={`px-3 py-1 rounded-lg font-semibold transition-colors ${isOnBase ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {isOnBase ? 'Voltei à base' : 'Em campo'}
                </button>
              </div>

              <button onClick={syncNow} className={`w-full mt-4 py-3 rounded-lg font-semibold ${isOnBase ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`} disabled={!isOnBase}>
                Sincronizar agora
              </button>

              <div className="mt-4 text-xs text-gray-600">
                <p className="font-semibold text-gray-800 mb-2">Pendências</p>
                <ul className="list-disc pl-5 space-y-1">
                  {pendingSyncOs.map((o) => <li key={o.id}>{o.code} • {o.title}</li>)}
                  {pendingSyncRdo.map((r) => <li key={r.id}>RDO • {r.date}</li>)}
                  {pendingSyncCount === 0 && <li>Nenhuma pendência 🎉</li>}
                </ul>
              </div>
            </div>

            {syncLog.length > 0 && (
              <div className="bg-white rounded-xl p-5 shadow-md">
                <h3 className="font-bold text-gray-800 mb-4">Log de sync</h3>
                <div className="space-y-2">
                  {syncLog.map((l) => (
                    <div key={l.id} className="border rounded-lg p-3">
                      <p className="text-sm text-gray-800">{l.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(l.at).toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );

    const WorkOrderDetail = ({ os }) => {
      if (!os) return null;
      const chip = getOsStatusChip(os);

      const end = os.time?.endedAt ?? new Date().toISOString();
      const total = minutesBetween(os.time?.startedAt, end);
      const pause = sumPauseMinutes(os.time?.pauses ?? []) + (os.time?.currentPauseStart ? minutesBetween(os.time.currentPauseStart, end) : 0);
      const worked = Math.max(0, total - pause);

      const check = canConcludeOs(os);

      return (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <button onClick={() => setWorkScreen({ view: 'list', id: null })} className="text-blue-600 font-semibold hover:text-blue-700">← Voltar</button>

            <div className="mt-3 flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500">{os.origin}</p>
                <h2 className="text-xl font-bold text-gray-800">{os.code}</h2>
                <p className="text-sm text-gray-600">{os.title}</p>
                <p className="text-xs text-gray-500 mt-1">{os.destination} • {os.location}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${chip.cls}`}>{chip.label}</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Início</p>
                <p className="font-semibold text-gray-800">{formatTimeBR(os.time?.startedAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Pausas</p>
                <p className="font-semibold text-gray-800">{Math.floor(pause / 60)}h {pause % 60}m</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Trabalhado</p>
                <p className="font-semibold text-gray-800">{Math.floor(worked / 60)}h {worked % 60}m</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button onClick={() => startOs(os.id)} className="bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700" disabled={!!os.time?.startedAt} title={os.time?.startedAt ? 'Já iniciado' : 'Iniciar'}>
                Iniciar
              </button>

              <button
                onClick={() => (os.time?.currentPauseStart ? resumeOs(os.id) : pauseOs(os.id))}
                className={`py-2 rounded-lg font-semibold ${os.time?.startedAt ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                disabled={!os.time?.startedAt || !!os.time?.endedAt}
              >
                {os.time?.currentPauseStart ? 'Retomar' : 'Pausar'}
              </button>

              <button onClick={() => concludeOs(os.id)} className={`py-2 rounded-lg font-semibold ${os.time?.startedAt ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`} disabled={!os.time?.startedAt}>
                Concluir
              </button>
            </div>

            {!check.ok && (
              <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-semibold">Para concluir, falta:</p>
                <ul className="list-disc pl-5 mt-1">{check.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">Checklist de segurança</h3>
            <div className="space-y-2">
              {(os.safetyChecklist ?? []).map((it) => (
                <label key={it.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={!!it.done} onChange={() => toggleChecklistItem(os.id, 'safetyChecklist', it.id)} className="w-5 h-5"/>
                  <span className="text-sm text-gray-800">{it.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md">
            <h3 className="font-bold text-gray-800 mb-3">Checklist de execução</h3>
            <div className="space-y-2">
              {(os.executionChecklist ?? []).map((it) => (
                <label key={it.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={!!it.done} onChange={() => toggleChecklistItem(os.id, 'executionChecklist', it.id)} className="w-5 h-5"/>
                  <span className="text-sm text-gray-800">{it.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Intercorrências</h3>
              <button onClick={() => openIncidentForOs(os.id)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">+ Registrar</button>
            </div>

            <div className="space-y-2">
              {(os.incidents ?? []).map((inc) => (
                <div key={inc.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-semibold text-gray-800">{inc.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${inc.severity === 'alta' ? 'bg-red-100 text-red-700' : inc.severity === 'media' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                      {inc.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{inc.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(inc.createdAt).toLocaleString('pt-BR')}</p>

                  {(inc.photos ?? []).length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {inc.photos.slice(0, 6).map((p) => <img key={p.id} src={p.dataUrl} alt="inc" className="w-full h-20 object-cover rounded-lg border"/>)}
                    </div>
                  )}
                </div>
              ))}
              {(os.incidents ?? []).length === 0 && <p className="text-sm text-gray-500">Nenhuma intercorrência registrada.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">Fotos/Evidências</h3>
              <label className="text-sm font-semibold text-blue-600 cursor-pointer">
                + Adicionar
                <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addEvidencePhotos(os.id, e.target.files)} />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(os.evidences ?? []).map((p) => (
                <div key={p.id} className="relative">
                  <img src={p.dataUrl} alt="evidência" className="w-full h-20 object-cover rounded-lg border"/>
                  <button onClick={() => removeEvidencePhoto(os.id, p.id)} className="absolute top-1 right-1 bg-white/90 border rounded-full w-6 h-6 flex items-center justify-center text-xs" title="Remover">×</button>
                </div>
              ))}
            </div>

            {(os.evidences ?? []).length === 0 && <p className="text-sm text-gray-500">Nenhuma foto anexada ainda.</p>}

            {(os.evidences ?? []).length > 0 && (
              <div className="mt-3 text-xs text-gray-600">
                <p className="font-semibold text-gray-800 mb-1">Metadados (geo + timestamp)</p>
                <div className="space-y-1">
                  {os.evidences.slice(0, 3).map((p) => (
                    <div key={p.id} className="bg-gray-50 border rounded p-2">
                      <div><strong>{new Date(p.createdAt).toLocaleString('pt-BR')}</strong></div>
                      <div>{p.geo ? `${p.geo.lat.toFixed(6)}, ${p.geo.lng.toFixed(6)} (±${Math.round(p.geo.accuracy)}m)` : 'Geo não capturado'}</div>
                    </div>
                  ))}
                  {os.evidences.length > 3 && <div className="text-gray-500">+ {os.evidences.length - 3} foto(s)</div>}
                </div>
              </div>
            )}

            <button onClick={() => exportOsReport(os)} className="w-full mt-4 bg-gray-900 text-white py-3 rounded-lg font-semibold hover:bg-black">
              Gerar relatório fotográfico (HTML)
            </button>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-md space-y-3">
            <h3 className="font-bold text-gray-800">Assinaturas digitais</h3>

            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Colaborador</p>
              <SignaturePad value={os.signatures?.worker ?? null} onChange={(v) => setSignature(os.id, 'worker', v)}/>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 mb-2">Supervisor</p>
              <SignaturePad value={os.signatures?.supervisor ?? null} onChange={(v) => setSignature(os.id, 'supervisor', v)}/>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {workSection === 'os' && workScreen.view === 'detail' && selectedOs ? (
          <WorkOrderDetail os={selectedOs} />
        ) : (
          <WorkOrdersList />
        )}

        {showIncidentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Registrar intercorrência</h3>
                <button onClick={() => setShowIncidentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Título *</label>
                  <input value={incidentDraft.title} onChange={(e) => setIncidentDraft({ ...incidentDraft, title: e.target.value })} className="w-full p-3 border rounded-lg" placeholder="Ex: Vazamento identificado"/>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Severidade</label>
                  <select value={incidentDraft.severity} onChange={(e) => setIncidentDraft({ ...incidentDraft, severity: e.target.value })} className="w-full p-3 border rounded-lg">
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição *</label>
                  <textarea value={incidentDraft.description} onChange={(e) => setIncidentDraft({ ...incidentDraft, description: e.target.value })} rows="4" className="w-full p-3 border rounded-lg" placeholder="O que aconteceu? Qual ação foi tomada?"/>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-gray-800">Fotos (geo + timestamp)</p>
                    <label className="text-sm font-semibold text-blue-600 cursor-pointer">
                      + Adicionar
                      <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => addIncidentPhotos(e.target.files)}/>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(incidentDraft.photos ?? []).map((p) => <img key={p.id} src={p.dataUrl} alt="foto" className="w-full h-20 object-cover rounded-lg border"/>)}
                  </div>
                  {(incidentDraft.photos ?? []).length === 0 && <p className="text-xs text-gray-500">Nenhuma foto anexada.</p>}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowIncidentModal(false)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button onClick={submitIncident} className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


  const FinanceTab = () => {
    const totalAdvances = advances
      .filter((a) => a.status === 'approved' || a.status === 'paid')
      .reduce((sum, a) => sum + a.value, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
    const totalReimbursements = reimbursements.reduce((sum, r) => sum + r.value, 0);

    // Saldo aqui é só uma leitura de demo, você pode trocar por regra real depois.
    const balance = totalAdvances + totalReimbursements - totalExpenses;

    const pendingExpenses = expenses.filter((e) => e.status === 'pending').length;

    const [txFilter, setTxFilter] = useState('all'); // all | expense | advance | reimbursement

    const transactions = useMemo(() => {
      const tx = [];

      for (const e of expenses) {
        tx.push({
          id: `expense-${e.id}`,
          kind: 'expense',
          title: e.type,
          subtitle: e.trip,
          date: e.date,
          amount: -Math.abs(e.value),
          status: e.status,
          hasReceipt: !!e.receipt,
        });
      }

      for (const a of advances) {
        tx.push({
          id: `advance-${a.id}`,
          kind: 'advance',
          title: 'Adiantamento',
          subtitle: a.trip,
          date: a.date,
          amount: Math.abs(a.value),
          status: a.status,
          meta: `Utilizado: ${formatMoney(a.used)} / ${formatMoney(a.value)}`,
        });
      }

      for (const r of reimbursements) {
        tx.push({
          id: `reimb-${r.id}`,
          kind: 'reimbursement',
          title: 'Reembolso',
          subtitle: r.trip,
          date: r.date,
          amount: Math.abs(r.value),
          status: r.status,
          meta: r.description,
        });
      }

      // Ordena por data desc (YYYY-MM-DD funciona bem como string para sort)
      tx.sort((a, b) => (a.date < b.date ? 1 : -1));

      return tx;
    }, [advances, expenses, reimbursements]);

    const filteredTx = useMemo(() => {
      if (txFilter === 'all') return transactions;
      return transactions.filter((t) => t.kind === txFilter);
    }, [transactions, txFilter]);

    const handleAddExpense = () => {
      if (!newExpense.type || !newExpense.value || !newExpense.date) {
        alert('Preencha todos os campos obrigatórios');
        return;
      }

      const expense = {
        id: expenses.length + 1,
        type: newExpense.type,
        value: parseFloat(String(newExpense.value).replace(',', '.')),
        date: newExpense.date,
        description: newExpense.description,
        receipt: !!receiptPreview,
        status: 'pending',
        trip: `${currentTrip.destination} Jan/2026`,
      };

      setExpenses([expense, ...expenses]);
      setNewExpense({ type: '', value: '', date: '', description: '' });
      setReceiptPreview(null);
      setShowExpenseModal(false);
      alert('Despesa registrada com sucesso!');
    };

    const handleRequestAdvance = () => {
      if (!newAdvance.value || !newAdvance.justification) {
        alert('Preencha todos os campos obrigatórios');
        return;
      }

      const advance = {
        id: advances.length + 1,
        value: parseFloat(String(newAdvance.value).replace(',', '.')),
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        trip: `${currentTrip.destination} Jan/2026`,
        justification: newAdvance.justification,
        used: 0,
      };

      setAdvances([advance, ...advances]);
      setNewAdvance({ value: '', justification: '' });
      setShowAdvanceModal(false);
      alert('Solicitação de adiantamento enviada!');
    };

    const onReceiptSelected = (file) => {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    };

    return (
      <div className="space-y-4">
        {/* Resumo Financeiro */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-sm text-green-100 mb-2">Saldo Disponível</h3>
          <p className="text-3xl font-bold mb-4">{formatMoney(balance)}</p>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-green-500">
            <div>
              <p className="text-[11px] text-green-100">Adiantamentos</p>
              <p className="text-base font-semibold">{formatMoney(totalAdvances)}</p>
            </div>
            <div>
              <p className="text-[11px] text-green-100">Reembolsos</p>
              <p className="text-base font-semibold">{formatMoney(totalReimbursements)}</p>
            </div>
            <div>
              <p className="text-[11px] text-green-100">Despesas</p>
              <p className="text-base font-semibold">{formatMoney(totalExpenses)}</p>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="bg-blue-600 text-white p-4 rounded-xl hover:bg-blue-700 transition-colors flex flex-col items-center gap-2"
          >
            <Wallet className="w-8 h-8" />
            <span className="text-sm font-semibold">Solicitar Adiantamento</span>
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="bg-purple-600 text-white p-4 rounded-xl hover:bg-purple-700 transition-colors flex flex-col items-center gap-2"
          >
            <Plus className="w-8 h-8" />
            <span className="text-sm font-semibold">Registrar Despesa</span>
          </button>
        </div>

        {/* Alertas */}
        {pendingExpenses > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800">{pendingExpenses} despesa(s) aguardando aprovação</p>
              <p className="text-xs text-yellow-700 mt-1">O RH irá analisar em até 3 dias úteis</p>
            </div>
          </div>
        )}

        {/* Histórico de Transações */}
        <div className="bg-white rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <History className="w-5 h-5 text-gray-700" />
              Histórico de Transações
            </h3>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                className="text-xs border rounded-md px-2 py-1"
                value={txFilter}
                onChange={(e) => setTxFilter(e.target.value)}
              >
                <option value="all">Todas</option>
                <option value="advance">Adiantamentos</option>
                <option value="expense">Despesas</option>
                <option value="reimbursement">Reembolsos</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredTx.slice(0, 12).map((t) => (
              <div key={t.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 truncate">{t.subtitle}</p>
                    {t.meta && <p className="text-[11px] text-gray-600 mt-1">{t.meta}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${t.amount < 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {t.amount < 0 ? '-' : '+'} {formatMoney(Math.abs(t.amount))}
                    </p>
                    <p className="text-[11px] text-gray-500">{formatDateBR(t.date)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-600 pt-2 mt-2 border-t">
                  <span>
                    {t.kind === 'expense' && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        t.status === 'approved' ? 'bg-green-100 text-green-700' :
                        t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {t.status === 'approved' ? 'Aprovada' : t.status === 'pending' ? 'Pendente' : 'Rejeitada'}
                      </span>
                    )}

                    {t.kind === 'advance' && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        t.status === 'approved' ? 'bg-green-100 text-green-700' :
                        t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {t.status === 'approved' ? 'Aprovado' : t.status === 'pending' ? 'Pendente' : 'Pago'}
                      </span>
                    )}

                    {t.kind === 'reimbursement' && (
                      <span className={`px-2 py-0.5 rounded-full ${
                        t.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {t.status === 'paid' ? 'Pago' : 'Agendado'}
                      </span>
                    )}
                  </span>

                  {t.kind === 'expense' && t.hasReceipt && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="w-3 h-3" />
                      Nota anexada
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 mt-3">Mostrando até 12 itens (demo)</p>
        </div>

        {/* Despesas Recentes */}
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Despesas Recentes
          </h3>

          <div className="space-y-2">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{expense.type}</p>
                    <p className="text-xs text-gray-500">{expense.trip}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{formatMoney(expense.value)}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        expense.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : expense.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {expense.status === 'approved' ? 'Aprovada' : expense.status === 'pending' ? 'Pendente' : 'Rejeitada'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
                  <span>{formatDateBR(expense.date)}</span>
                  {expense.receipt && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="w-3 h-3" />
                      Nota anexada
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Adiantamentos */}
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Adiantamentos
          </h3>

          <div className="space-y-2">
            {advances.map((advance) => (
              <div key={advance.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{advance.trip}</p>
                    <p className="text-xs text-gray-500">Utilizado: {formatMoney(advance.used)} de {formatMoney(advance.value)}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      advance.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : advance.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {advance.status === 'approved' ? 'Aprovado' : advance.status === 'pending' ? 'Pendente' : 'Pago'}
                  </span>
                </div>

                <div className="text-xs text-gray-600">{formatDateBR(advance.date)}</div>

                {advance.status === 'approved' && advance.used < advance.value && (
                  <div className="mt-2 bg-blue-50 rounded p-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-700">Saldo restante</span>
                      <span className="font-semibold text-blue-800">{formatMoney(advance.value - advance.used)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Solicitar Adiantamento */}
        {showAdvanceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Solicitar Adiantamento</h3>
                <button onClick={() => setShowAdvanceModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAdvance.value}
                    onChange={(e) => setNewAdvance({ ...newAdvance, value: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Justificativa *</label>
                  <textarea
                    value={newAdvance.justification}
                    onChange={(e) => setNewAdvance({ ...newAdvance, justification: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    placeholder="Descreva o motivo do adiantamento"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Viagem:</strong> {currentTrip.destination}
                    <br />
                    <strong>Data:</strong> {formatDateBR(currentTrip.embarkDate)}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAdvanceModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRequestAdvance}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Solicitar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Registrar Despesa */}
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Registrar Despesa</h3>
                <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Despesa *</label>
                  <select
                    value={newExpense.type}
                    onChange={(e) => setNewExpense({ ...newExpense, type: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Hospedagem">Hospedagem</option>
                    <option value="Combustível">Combustível</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newExpense.value}
                    onChange={(e) => setNewExpense({ ...newExpense, value: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data *</label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
                  <textarea
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows="2"
                    placeholder="Detalhes da despesa (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Comprovante (Nota Fiscal)</label>
                  <label className="block border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-purple-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => onReceiptSelected(e.target.files?.[0])}
                    />
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Tire uma foto ou faça upload</p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, PDF até 5MB</p>
                    {receiptPreview && (
                      <p className="text-xs text-green-700 font-semibold mt-2">Arquivo anexado ✅</p>
                    )}
                  </label>

                  {receiptPreview && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Prévia (demo)</p>
                      {/* Se for PDF, o browser pode não renderizar aqui. Mantemos simples. */}
                      <img
                        src={receiptPreview}
                        alt="Comprovante"
                        className="w-full rounded-lg border"
                        onError={(e) => {
                          // fallback caso não seja imagem
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowExpenseModal(false);
                      setReceiptPreview(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddExpense}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Registrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const ProfileTab = () => {
    if (profileView === 'equipment') return <EquipmentView />;
    if (profileView === 'history') return <HistoryView />;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-6 shadow-md">
          <div className="flex flex-col items-center mb-6">
            <img src={employee.photo} alt={employee.name} className="w-24 h-24 rounded-full mb-4" />
            <h2 className="text-xl font-bold text-gray-800">{employee.name}</h2>
            <p className="text-gray-600">Matrícula: {employee.registration}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Status</span>
              <span className="font-semibold text-blue-600">{employee.currentStatus}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Localização Atual</span>
              <span className="font-semibold text-gray-800">{currentTrip.location}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Próximo Desembarque</span>
              <span className="font-semibold text-gray-800">{formatDateBR(currentTrip.disembarkDate)}</span>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4">Menu</h3>
          <div className="space-y-2">
            <button
              onClick={() => setProfileView('equipment')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">Equipamentos/EPIs</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => setProfileView('history')}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-800">Histórico de Embarques</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Documentos Pessoais */}
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Documentos Pessoais
          </h3>

          {/* Alertas */}
          {personalDocuments.some((doc) => doc.status !== 'valid') && (
            <div className="mb-4 space-y-2">
              {personalDocuments.filter((doc) => doc.status === 'expired').length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      {personalDocuments.filter((doc) => doc.status === 'expired').length} documento(s) vencido(s)
                    </p>
                    <p className="text-xs text-red-700">Regularize sua documentação o quanto antes</p>
                  </div>
                </div>
              )}
              {personalDocuments.filter((doc) => doc.status === 'warning').length > 0 && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">
                      {personalDocuments.filter((doc) => doc.status === 'warning').length} documento(s) próximo do vencimento
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            {personalDocuments.map((doc, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{doc.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Nº {doc.number}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${getDocumentStatusColor(doc.status)}`}>
                    {getDocumentStatusText(doc)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-3">
                  <div>
                    <p className="text-gray-500">Emissão</p>
                    <p className="font-semibold">{doc.issueDate}</p>
                  </div>
                  {doc.expiryDate && (
                    <div>
                      <p className="text-gray-500">Validade</p>
                      <p className="font-semibold">{doc.expiryDate}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            onClick={() => alert('(Demo) Fluxo de upload de documentos (em breve)')}
          >
            Atualizar Documentos
          </button>
        </div>

        {/* Emergência */}
        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Contatos de Emergência
          </h3>

          <div className="space-y-2">
            {emergencyContacts.map((contact, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 flex items-center gap-2">
                      {contact.type === 'emergency' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                      {contact.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{contact.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleCall(contact.phone)}
                  className={`w-full mt-3 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    contact.type === 'emergency' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  {contact.phone}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 text-center">
              Em caso de emergência médica grave, ligue <strong>192</strong> (SAMU)
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4">Configurações</h3>
          <div className="space-y-2">
            <button
              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => alert('(Demo) Configurar notificações')}
            >
              Notificações
            </button>
            <button
              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors text-red-600"
              onClick={() => alert('(Demo) Logout')}
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EquipmentView = () => {
    const embarcadoCount = equipment.filter((e) => e.status === 'embarcado').length;
    const pendenteCount = equipment.filter((e) => e.status === 'pendente').length;

    const toggleEquipmentStatus = (id) => {
      setEquipment(
        equipment.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              status: item.status === 'embarcado' ? 'base' : 'embarcado',
            };
          }
          return item;
        })
      );
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-md">
          <button
            onClick={() => setProfileView('main')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            <span className="font-semibold">Voltar</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Equipamentos/EPIs</h2>
              <p className="text-sm text-gray-600">Gerencie seus equipamentos</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-blue-600">{equipment.length}</p>
            <p className="text-xs text-gray-600 mt-1">Total</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-green-600">{embarcadoCount}</p>
            <p className="text-xs text-gray-600 mt-1">Embarcado</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-yellow-600">{pendenteCount}</p>
            <p className="text-xs text-gray-600 mt-1">Pendente</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4">EPIs Obrigatórios</h3>
          <div className="space-y-2">
            {equipment
              .filter((e) => e.required)
              .map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        {item.status === 'embarcado' && <CheckCircle className="w-4 h-4 text-green-600" />}
                      </div>
                      <p className="text-xs text-gray-500">Código: {item.code}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        item.status === 'embarcado'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'pendente'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.status === 'embarcado' ? 'Embarcado' : item.status === 'pendente' ? 'Pendente' : 'Na Base'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-gray-600">
                      Condição: <span className="font-semibold">{item.condition}</span>
                    </span>
                    <button
                      onClick={() => toggleEquipmentStatus(item.id)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                        item.status === 'embarcado'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {item.status === 'embarcado' ? 'Devolver' : 'Embarcar'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4">Equipamentos Adicionais</h3>
          <div className="space-y-2">
            {equipment
              .filter((e) => !e.required)
              .map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-800">{item.name}</p>
                        {item.status === 'embarcado' && <CheckCircle className="w-4 h-4 text-green-600" />}
                      </div>
                      <p className="text-xs text-gray-500">Código: {item.code}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        item.status === 'embarcado'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'pendente'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {item.status === 'embarcado' ? 'Embarcado' : item.status === 'pendente' ? 'Pendente' : 'Na Base'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-xs text-gray-600">
                      Condição: <span className="font-semibold">{item.condition}</span>
                    </span>
                    <button
                      onClick={() => toggleEquipmentStatus(item.id)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${
                        item.status === 'embarcado'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {item.status === 'embarcado' ? 'Devolver' : 'Embarcar'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <p className="text-sm text-yellow-800">
            <strong>Importante:</strong> Todos os EPIs obrigatórios devem estar embarcados antes da viagem.
          </p>
        </div>
      </div>
    );
  };

  const HistoryView = () => {
    const totalDays = embarkHistory.filter((e) => e.status === 'concluido').reduce((sum, e) => sum + e.days, 0);
    const totalEmbarks = embarkHistory.filter((e) => e.status === 'concluido').length;

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-md">
          <button
            onClick={() => setProfileView('main')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            <span className="font-semibold">Voltar</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-full">
              <History className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Histórico de Embarques</h2>
              <p className="text-sm text-gray-600">Seus embarques anteriores</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-purple-600">{totalEmbarks}</p>
            <p className="text-xs text-gray-600 mt-1">Embarques</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-md text-center">
            <p className="text-2xl font-bold text-blue-600">{totalDays}</p>
            <p className="text-xs text-gray-600 mt-1">Dias Embarcado</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4">Todos os Embarques</h3>
          <div className="space-y-3">
            {embarkHistory.map((embark) => (
              <div key={embark.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{embark.destination}</p>
                    <p className="text-xs text-gray-500 mt-1">{embark.location}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      embark.status === 'agendado'
                        ? 'bg-blue-100 text-blue-700'
                        : embark.status === 'em_andamento'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {embark.status === 'agendado' ? 'Agendado' : embark.status === 'em_andamento' ? 'Em Andamento' : 'Concluído'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs">
                  <div>
                    <p className="text-gray-500">Embarque</p>
                    <p className="font-semibold text-gray-800">{formatDateBR(embark.embarkDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Desembarque</p>
                    <p className="font-semibold text-gray-800">{formatDateBR(embark.disembarkDate)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs">
                  <span className="text-gray-600">
                    <strong>{embark.days}</strong> dias • {embark.transportation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };



const pendingWorkSyncCount =
  workOrders.filter((o) => o.status === 'COMPLETED' && o.sync?.status !== 'SYNCED').length +
  dailyReports.filter((r) => r.sync?.status !== 'SYNCED').length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Logística Pessoal</h1>
            <p className="text-sm text-blue-100">Olá, {employee.name.split(' ')[0]}</p>
          </div>
          <div className="relative">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
              3
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 pb-24">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'trip' && <TripTab />}
        {activeTab === 'work' && <WorkTab />}
        {activeTab === 'finance' && <FinanceTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button
            onClick={() => {
              setActiveTab('home');
              setProfileView('main');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'home' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-semibold">Início</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('trip');
              setProfileView('main');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'trip' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Plane className="w-6 h-6" />
            <span className="text-xs font-semibold">Viagem</span>
          </button>



<button
  onClick={() => {
    setActiveTab('work');
    setProfileView('main');
  }}
  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
    activeTab === 'work' ? 'text-blue-600' : 'text-gray-400'
  }`}
>
  <div className="relative">
    <FileText className="w-6 h-6" />
    {pendingWorkSyncCount > 0 && (
      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
        {pendingWorkSyncCount > 9 ? '9+' : pendingWorkSyncCount}
      </span>
    )}
  </div>
  <span className="text-xs font-semibold">Trabalho</span>
</button>

          <button
            onClick={() => {
              setActiveTab('finance');
              setProfileView('main');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'finance' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-xs font-semibold">Financeiro</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('profile');
              setProfileView('main');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === 'profile' ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-semibold">Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLogisticsApp;
