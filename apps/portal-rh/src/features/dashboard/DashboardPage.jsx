import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Anchor, RefreshCw, Users } from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import api from '../../services/api';
import GlassCard from '../../ui/GlassCard';

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

  if (statuses.some((status) => status.includes('VENCIDO') || status.includes('CRITIC'))) return true;

  const docsCollection = employee.docs || employee.documentos || employee.DOCUMENTOS;
  if (Array.isArray(docsCollection)) {
    return docsCollection.some((doc) => {
      const docStatus = normalizeStatus(doc?.status || doc?.STATUS || doc?.situacao);
      if (docStatus.includes('VENCIDO') || docStatus.includes('CRITIC')) return true;
      const dueDate = parseDate(doc?.dueDate || doc?.DATA_VENCIMENTO || doc?.validUntil);
      return dueDate ? dueDate.getTime() < Date.now() : false;
    });
  }

  return false;
}

function StatusCard({ label, value, hint, icon: Icon, accentClass, onClick, pulse = false, children }) {
  return (
    <GlassCard onClick={onClick} variant={pulse ? 'alert' : 'default'} className={`border-l-4 ${accentClass}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">{value}</p>
        </div>
        <Icon className={`mt-0.5 h-4 w-4 text-slate-300 ${pulse ? 'animate-pulse text-rose-300' : ''}`} />
      </div>
      <p className="text-xs text-slate-400">{hint}</p>
      {children}
    </GlassCard>
  );
}

export default function DashboardPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadEmployees() {
      try {
        setLoading(true);
        const response = await api.employees.list();
        if (!isMounted) return;
        const normalized = Array.isArray(response) ? response : response?.employees || [];
        setEmployees(normalized);
      } catch (error) {
        console.error('Erro ao carregar colaboradores', error);
        if (isMounted) setEmployees([]);
      } finally {
        if (isMounted) setLoading(false);
      }
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
    const compliancePct = total > 0 ? Math.round((compliant / total) * 100) : 100;

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

    const chartData = [
      { name: 'Conformes', value: compliant, color: '#10b981' },
      { name: 'Vencidos', value: expired, color: '#f43f5e' }
    ];

    return { total, active, expired, compliant, compliancePct, upcomingEmbarks, chartData };
  }, [employees]);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-200 lg:p-8">
      <header className="mb-7">
        <h1 className="text-3xl font-bold italic text-slate-100 lg:text-4xl">COMMAND CENTER</h1>
        <p className="mt-2 font-mono text-xs text-slate-500">portal-rh.offshore.status // live telemetry</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          label="Efetivo Total"
          value={metrics.total}
          hint="Headcount monitorado no ciclo atual"
          icon={Users}
          accentClass="border-l-blue-500"
        />

        <StatusCard
          label="Em Operação"
          value={metrics.active}
          hint="Status operacional ATIVO"
          icon={Anchor}
          accentClass="border-l-emerald-500"
        />

        <StatusCard
          label="Alertas"
          value={metrics.expired}
          hint="Colaboradores com documentação vencida"
          icon={AlertTriangle}
          accentClass="border-l-rose-500"
          pulse={metrics.expired > 0}
          onClick={() => {
            window.location.assign('/colaboradores?filter=VENCIDO');
          }}
        />

        <StatusCard
          label="Status do Bot"
          value={loading ? 'SYNC' : 'ONLINE'}
          hint="Sincronia visual com SISPAT"
          icon={Activity}
          accentClass="border-l-cyan-500"
        >
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
            <div className={`h-full rounded-full bg-cyan-400/80 ${loading ? 'w-1/2 animate-pulse' : 'w-full'} transition-all duration-500`} />
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-slate-500">
            <span>SISPAT_LINK</span>
            <span>{loading ? 'syncing...' : 'stable'}</span>
          </div>
        </StatusCard>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-5">
        <GlassCard title="Compliance Donut" className="xl:col-span-2">
          <div className="relative h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={95}
                  stroke="none"
                  paddingAngle={2}
                >
                  {metrics.chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(51, 65, 85, 0.8)',
                    borderRadius: 12,
                    color: '#e2e8f0'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Conformidade</p>
                <p className="mt-1 text-3xl font-bold text-emerald-300">{metrics.compliancePct}%</p>
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 font-mono text-[10px] text-slate-400">
            <span className="text-emerald-300">● CONFORMES {metrics.compliant}</span>
            <span className="text-rose-300">● VENCIDOS {metrics.expired}</span>
          </div>
        </GlassCard>

        <GlassCard title="Próximos Embarques" className="xl:col-span-3">
          <div className="overflow-hidden rounded-xl border border-slate-700/50">
            <table className="min-w-full divide-y divide-slate-700/50">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Colaborador</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Unidade</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Data</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/90 bg-slate-900/20">
                {metrics.upcomingEmbarks.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-800/40">
                    <td className="px-3 py-2 text-sm text-slate-200">{item.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-300">{item.unit}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-200">{item.dateLabel}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          item.status === 'VENCIDO'
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                            : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-1.5 font-mono text-[10px] text-slate-500 backdrop-blur-xl">
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'data stream syncing...' : 'telemetry synchronized'}
      </div>
    </div>
  );
}
