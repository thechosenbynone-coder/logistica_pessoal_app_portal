import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Anchor, RefreshCw, Users } from 'lucide-react';
import api from '../../services/api';
import GlassCard from '../../ui/GlassCard';

function useNavigate() {
  return (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
}

function normalizeStatus(value) {
  return String(value || '').trim().toUpperCase();
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEmployeeName(employee, index) {
  return employee.name || employee.NOME_COMPLETO || employee.nome || employee.COLABORADOR_ID || `Colaborador ${index + 1}`;
}

function getEmbarkDate(employee) {
  return employee.nextDeployment?.embarkDate || employee.embarkDate || employee.nextEmbarkDate || employee.proximoEmbarque || null;
}

function getDocumentRisk(employee) {
  if (employee.docs?.expired && employee.docs.expired > 0) return true;
  const statuses = [employee.docStatus, employee.documentStatus, employee.statusDocumentacao, employee.STATUS_DOCUMENTACAO]
    .map(normalizeStatus)
    .filter(Boolean);
  return statuses.some((status) => status.includes('VENCIDO') || status.includes('CRITIC'));
}

function MetricCard({ label, value, hint, icon: Icon, borderClass, pulse, onClick }) {
  return (
    <GlassCard onClick={onClick} variant={pulse ? 'alert' : 'default'}>
      <div className={`rounded-xl border ${borderClass} bg-slate-900/50 p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
          <Icon className={`h-4 w-4 text-slate-300 ${pulse ? 'animate-pulse text-rose-300' : ''}`} />
        </div>
        <p className="text-3xl font-bold text-slate-100">{value}</p>
        <p className="mt-2 text-xs text-slate-400">{hint}</p>
      </div>
    </GlassCard>
  );
}

function CompliancePie({ compliant, nonCompliant }) {
  const total = compliant + nonCompliant;
  const compliantAngle = total > 0 ? (compliant / total) * 360 : 360;

  return (
    <div className="mx-auto h-52 w-52 rounded-full" style={{ background: `conic-gradient(#10b981 0deg ${compliantAngle}deg, #f43f5e ${compliantAngle}deg 360deg)` }}>
      <div className="m-10 flex h-32 w-32 items-center justify-center rounded-full border border-slate-700/50 bg-slate-950/90 backdrop-blur">
        <span className="text-lg font-semibold text-slate-100">{total > 0 ? Math.round((compliant / total) * 100) : 100}%</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadEmployees() {
      setLoading(true);
      const response = await api.employees.list();
      if (!isMounted) return;
      setEmployees(Array.isArray(response) ? response : response?.employees || []);
      setLoading(false);
    }
    loadEmployees();
    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((employee) => normalizeStatus(employee.status || employee.STATUS_ATUAL) === 'ATIVO').length;
    const expired = employees.filter(getDocumentRisk).length;
    const compliant = Math.max(total - expired, 0);

    const upcomingEmbarks = employees
      .map((employee, index) => {
        const embarkDate = parseDate(getEmbarkDate(employee));
        return {
          id: employee.id || employee.COLABORADOR_ID || `row-${index}`,
          name: getEmployeeName(employee, index),
          unit: employee.unit || employee.UNIDADE || employee.base || employee.BASE_OPERACIONAL || 'N/D',
          dateLabel: embarkDate ? embarkDate.toLocaleDateString('pt-BR') : 'Sem data',
          dateValue: embarkDate ? embarkDate.getTime() : Number.MAX_SAFE_INTEGER,
          status: getDocumentRisk(employee) ? 'VENCIDO' : 'OK'
        };
      })
      .sort((a, b) => a.dateValue - b.dateValue)
      .slice(0, 8);

    return { total, active, expired, compliant, nonCompliant: expired, upcomingEmbarks };
  }, [employees]);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-200 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400">Offshore Command Center</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Portal RH</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-xs text-slate-300 backdrop-blur-md">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Sincronizando dados...' : 'Sincronia SISPAT estável'}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Efetivo Total" value={metrics.total} hint="Headcount geral monitorado" icon={Users} borderClass="border-blue-500/50" />
        <MetricCard label="Em Operação" value={metrics.active} hint="Colaboradores com status ATIVO" icon={Anchor} borderClass="border-emerald-500/50" />
        <MetricCard
          label="Alertas Críticos"
          value={metrics.expired}
          hint="Documentação vencida ou crítica"
          icon={AlertTriangle}
          borderClass="border-rose-500/50"
          pulse={metrics.expired > 0}
          onClick={() => navigate('/colaboradores?filter=VENCIDO')}
        />
        <MetricCard
          label="Status do Bot"
          value={loading ? 'SYNC' : 'ONLINE'}
          hint="Simulação de sincronia com SISPAT"
          icon={Activity}
          borderClass="border-sky-500/50"
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        <GlassCard title="Compliance" className="xl:col-span-2">
          <CompliancePie compliant={metrics.compliant} nonCompliant={metrics.nonCompliant} />
          <div className="mt-3 flex items-center justify-center gap-4 text-xs">
            <span className="font-mono text-emerald-300">● CONFORMES: {metrics.compliant}</span>
            <span className="font-mono text-rose-300">● NÃO CONFORMES: {metrics.nonCompliant}</span>
          </div>
        </GlassCard>

        <GlassCard title="Próximos Embarques" className="xl:col-span-3">
          <div className="overflow-hidden rounded-xl border border-slate-700/50">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-slate-400">Colaborador</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-slate-400">Unidade</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-slate-400">Data</th>
                  <th className="px-3 py-2 text-left text-[10px] uppercase tracking-widest text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/30">
                {metrics.upcomingEmbarks.map((item) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-sm text-slate-200">{item.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-300">{item.unit}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-200">{item.dateLabel}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <span className={item.status === 'VENCIDO' ? 'text-rose-300' : 'text-emerald-300'}>{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
