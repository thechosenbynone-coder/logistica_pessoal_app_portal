import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../ui/ui.js";
import { api } from "../../services/api";
import { computeDashboardMetrics } from "../../services/portalXlsxImporter";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ClipboardCheck,
  ClipboardList,
  ClipboardX,
  FileText,
  HardHat,
  Minus,
  Plane,
  Users,
  Clock,
} from "lucide-react";

/**
 * DashboardMetricCard (JSX)
 * - Lift + shadow no hover
 * - Header: título + ícone
 * - Valor grande + trend
 * - Clicável (atalho) via onNavigate
 */

const TrendIconFor = (trendType) =>
  trendType === "up" ? ArrowUp : trendType === "down" ? ArrowDown : Minus;

const TrendColorClassFor = (trendType) =>
  trendType === "up" ? "text-green-600" : trendType === "down" ? "text-red-600" : "text-slate-500";

function DashboardMetricCard({
  value,
  title,
  icon: IconComponent,
  trendChange,
  trendType = "neutral",
  className,
  onClick,
  hint,
}) {
  const TrendIcon = TrendIconFor(trendType);
  const trendColorClass = TrendColorClassFor(trendType);
  const clickable = typeof onClick === "function";

  return (
    <motion.div
      whileHover={
        clickable
          ? { y: -4, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)" }
          : undefined
      }
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={cn(clickable ? "cursor-pointer" : "", "rounded-2xl", className)}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
      aria-label={clickable ? `${title}: ${value}` : undefined}
    >
      <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors duration-200">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          {IconComponent ? <IconComponent className="h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
        </div>

        <div className="px-4 pb-4">
          <div className="text-2xl font-extrabold text-slate-900">{value}</div>

          <div className="mt-2 flex items-center justify-between gap-3">
            {trendChange ? (
              <div className={cn("flex items-center text-xs font-semibold", trendColorClass)}>
                <TrendIcon className="h-3 w-3 mr-1" aria-hidden="true" />
                <span className="whitespace-nowrap">{trendChange}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400"> </div>
            )}

            {hint ? <div className="text-xs text-slate-500 truncate">{hint}</div> : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="px-5 pb-5 pt-4">{children}</div>
    </div>
  );
}

function Pill({ tone = "slate", icon: Icon, label, onClick }) {
  const clickable = typeof onClick === "function";
  const toneCls =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        clickable ? "hover:brightness-[0.98] active:brightness-[0.96]" : "cursor-default",
        toneCls
      )}
      aria-label={label}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function ProgressRow({ label, value, total, tone = "blue" }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const barTone =
    tone === "amber" ? "bg-amber-500" : tone === "red" ? "bg-red-500" : tone === "green" ? "bg-green-500" : "bg-blue-600";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-700 truncate">{label}</div>
        <div className="text-xs font-semibold text-slate-600">
          {value} <span className="text-slate-400">({pct}%)</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={cn("h-full rounded-full", barTone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage({ onNavigate }) {
  const go = (key) => {
    if (typeof onNavigate === "function") onNavigate(key);
  };

  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeDeployments: 0,
    pendingDocs: 0,
    pendingExpenses: 0,
  });

  useEffect(() => {
    let isMounted = true;
    api.dashboard
      .get()
      .then((data) => {
        if (!isMounted) return;
        if (data?.stats) setStats(data.stats);
      })
      .catch((err) => console.error("Failed to load dashboard stats", err));
    return () => {
      isMounted = false;
    };
  }, []);

  const readStoredMetrics = useCallback(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("portal_rh_xlsx_v1");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.metrics) return parsed.metrics;
      if (parsed?.dataset) return computeDashboardMetrics(parsed.dataset);
      return null;
    } catch {
      return null;
    }
  }, []);

  const [storedMetrics, setStoredMetrics] = useState(() => readStoredMetrics());

  useEffect(() => {
    const handleUpdate = () => {
      setStoredMetrics(readStoredMetrics());
    };
    window.addEventListener("portal_rh_xlsx_updated", handleUpdate);
    return () => {
      window.removeEventListener("portal_rh_xlsx_updated", handleUpdate);
    };
  }, [readStoredMetrics]);

  const fallbackMetrics = useMemo(() => computeDashboardMetrics(null), []);

  // MOCK USER (depois puxamos do login)
  const user = useMemo(() => ({ name: "Ana Silva" }), []);
  const firstName = (user?.name || "").trim().split(" ")[0] || "Usuário";

  // MOCK DATA (depois plugamos API)
  const mock = useMemo(
    () => ({
      hc: { total: 128, embarked: 84, base: 44, delta: "+6 (últimos 7d)" },

      docs: {
        expiring30: 19,
        expired: 7,
        // “faltando” continua existindo no mock p/ usar depois,
        // mas não vai mais aparecer como card separado agora.
        missing: 11,
      },

      inventory: {
        epiLowStock: 6,
        critical: 2, // subset: muito baixo
        deltaLowStock: "+1 (7d)",
      },

      requests: {
        pendingApprovals: 14,
        upcomingEmbark: 12,
        deltaPending: "+3",
      },

      rdo: {
        generated: 92,
        pendingApproval: 8,
        rejected: 3,
        missingDays: 6,
      },

      os: {
        generated: 41,
        pendingApproval: 5,
        rejected: 2,
        missingDays: 3,
      },

      distribution: {
        platforms: [
          { label: "P-74", value: 46 },
          { label: "MODEC", value: 38 },
          { label: "SBM", value: 21 },
          { label: "ESS", value: 23 },
        ],
        vessels: [
          { label: "Embarcação Alpha", value: 28 },
          { label: "Embarcação Delta", value: 22 },
          { label: "Plataforma P-09", value: 19 },
          { label: "Plataforma P-12", value: 15 },
        ],
      },

      recommendedActions: [
        { tone: "red", label: "Documentações vencidas para regularizar", go: () => go("employees") },
        { tone: "amber", label: "RDOs aguardando aprovação", go: () => go("work") },
        { tone: "blue", label: "EPIs com estoque baixo para repor", go: () => go("equipment") },
      ],

      recentActivity: [
        { ts: "Hoje 09:12", text: "OS #1043 enviada por João S." },
        { ts: "Hoje 08:40", text: "Doc. CNH de Maria L. vence em 12 dias" },
        { ts: "Ontem 18:06", text: "EPI (Capacete) aprovado para Carlos F." },
      ],
    }),
    []
  );

  const fallbackDistribution = useMemo(
    () => ({
      platforms: mock.distribution.platforms.map((p) => ({ ...p, value: 0 })),
      vessels: mock.distribution.vessels.map((p) => ({ ...p, value: 0 })),
    }),
    [mock]
  );

  const currentData = useMemo(
    () => ({
      ...mock,
      ...(storedMetrics || fallbackMetrics),
      hc: {
        ...mock.hc,
        ...(storedMetrics || fallbackMetrics).hc,
      },
      docs: {
        ...mock.docs,
        ...(storedMetrics || fallbackMetrics).docs,
      },
      inventory: {
        ...mock.inventory,
        ...(storedMetrics || fallbackMetrics).inventory,
      },
      requests: {
        ...mock.requests,
        ...(storedMetrics || fallbackMetrics).requests,
      },
      rdo: {
        ...mock.rdo,
        ...(storedMetrics || fallbackMetrics).rdo,
      },
      os: {
        ...mock.os,
        ...(storedMetrics || fallbackMetrics).os,
      },
      distribution: {
        platforms:
          (storedMetrics || fallbackMetrics).distribution?.platforms?.length > 0
            ? (storedMetrics || fallbackMetrics).distribution.platforms
            : fallbackDistribution.platforms,
        vessels:
          (storedMetrics || fallbackMetrics).distribution?.vessels?.length > 0
            ? (storedMetrics || fallbackMetrics).distribution.vessels
            : fallbackDistribution.vessels,
      },
      recommendedActions: mock.recommendedActions,
      recentActivity: mock.recentActivity,
    }),
    [fallbackDistribution, fallbackMetrics, mock, storedMetrics]
  );

  const docsTotalIssues = currentData.docs.expired + currentData.docs.expiring30; // ✅ só vencido + vencendo
  const totalByPlatform = currentData.distribution.platforms.reduce((s, x) => s + x.value, 0);
  const totalByVessel = currentData.distribution.vessels.reduce((s, x) => s + x.value, 0);
  const missingTotal = currentData.rdo.missingDays + currentData.os.missingDays;

  return (
    <div className="p-6 lg:p-8">
      {/* Cabeçalho do Dashboard (novo) */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-extrabold text-slate-900">Olá, {firstName}</div>
          <div className="text-sm text-slate-500">Qual o plano de hoje?</div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill
            tone={currentData.docs.expired > 0 ? "red" : "amber"}
            icon={FileText}
            label={`Docs: ${currentData.docs.expired} vencidas • ${currentData.docs.expiring30} vencendo`}
            onClick={() => go("employees")}
          />
          <Pill
            tone={currentData.rdo.pendingApproval > 0 ? "amber" : "slate"}
            icon={ClipboardList}
            label={`${currentData.rdo.pendingApproval} RDOs pendentes`}
            onClick={() => go("work")}
          />
          <Pill
            tone={currentData.inventory.critical > 0 ? "red" : "blue"}
            icon={HardHat}
            label={`${currentData.inventory.epiLowStock} EPIs com estoque baixo`}
            onClick={() => go("equipment")}
          />
          <Pill
            tone="blue"
            icon={Plane}
            label={`${currentData.requests.upcomingEmbark} próximos embarques`}
            onClick={() => go("mobility")}
          />
        </div>
      </div>

      {/* Cards topo */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="HC (Colaboradores)"
          value={`${currentData.hc.total}`}
          icon={Users}
          trendChange={currentData.hc.delta}
          trendType="up"
          hint={`Embarcados ${currentData.hc.embarked} • Base ${currentData.hc.base}`}
          onClick={() => go("employees")}
        />

        {/* ✅ DOCS em 1 card só */}
        <DashboardMetricCard
          title="Documentos - Atenção"
          value={`${docsTotalIssues}`}
          icon={FileText}
          trendType={currentData.docs.expired > 0 ? "down" : "neutral"}
          hint={`Vencidas ${currentData.docs.expired} • Vencendo ${currentData.docs.expiring30}`}
          onClick={() => go("employees")}
        />

        {/* ✅ Card que faltou: RDOs aguardando aprovação */}
        <DashboardMetricCard
          title="RDOs aguardando aprovação"
          value={`${currentData.rdo.pendingApproval}`}
          icon={ClipboardCheck}
          trendType={currentData.rdo.pendingApproval > 0 ? "up" : "neutral"}
          hint={`Reprovados ${currentData.rdo.rejected}`}
          onClick={() => go("work")}
        />

        <DashboardMetricCard
          title="OS aguardando aprovação"
          value={`${currentData.os.pendingApproval}`}
          icon={ClipboardCheck}
          trendType={currentData.os.pendingApproval > 0 ? "up" : "neutral"}
          hint={`Reprovadas ${currentData.os.rejected}`}
          onClick={() => go("work")}
        />
      </div>

      {/* Cards operação */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard
          title="Solicitações pendentes"
          value={`${currentData.requests.pendingApprovals}`}
          icon={AlertTriangle}
          trendChange={currentData.requests.deltaPending}
          trendType="up"
          hint="Aguardando aprovação"
          onClick={() => go("employees")}
        />

        {/* ✅ EPIs: estoque baixo */}
        <DashboardMetricCard
          title="EPIs com estoque baixo"
          value={`${currentData.inventory.epiLowStock}`}
          icon={HardHat}
          trendChange={currentData.inventory.deltaLowStock}
          trendType={currentData.inventory.epiLowStock > 0 ? "down" : "neutral"}
          hint={`Crítico ${currentData.inventory.critical}`}
          onClick={() => go("equipment")}
        />

        <DashboardMetricCard
          title="Próximos embarques (7 dias)"
          value={`${currentData.requests.upcomingEmbark}`}
          icon={Plane}
          trendType="neutral"
          hint="Checar pendências"
          onClick={() => go("mobility")}
        />

        <DashboardMetricCard
          title="RDO/OS faltando"
          value={`${missingTotal}`}
          icon={ClipboardX}
          trendChange={missingTotal > 0 ? "atenção" : "ok"}
          trendType={missingTotal > 0 ? "down" : "neutral"}
          hint={`RDO ${currentData.rdo.missingDays} • OS ${currentData.os.missingDays}`}
          onClick={() => go("work")}
        />
      </div>

      {/* Seções inferiores */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <SectionCard
          title="Colaboradores por plataforma"
          subtitle="Distribuição de HC (mock)"
          right={
            <button type="button" onClick={() => go("employees")} className="text-xs font-semibold text-blue-700 hover:underline">
              Ver detalhes
            </button>
          }
        >
          <div className="space-y-4">
            {currentData.distribution.platforms.map((p) => (
              <ProgressRow key={p.label} label={p.label} value={p.value} total={totalByPlatform} tone="blue" />
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Colaboradores por embarcação/plataforma"
          subtitle="Top alocações (mock)"
          right={
            <button type="button" onClick={() => go("mobility")} className="text-xs font-semibold text-blue-700 hover:underline">
              Abrir operação
            </button>
          }
        >
          <div className="space-y-4">
            {currentData.distribution.vessels.map((p) => (
              <ProgressRow key={p.label} label={p.label} value={p.value} total={totalByVessel} tone="amber" />
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Ações recomendadas" subtitle="Atalhos para resolver o que dói primeiro">
          <div className="flex flex-col gap-2.5">
            {currentData.recommendedActions.map((a, idx) => (
              <button
                key={idx}
                type="button"
                onClick={a.go}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition",
                  a.tone === "red"
                    ? "border-red-200 bg-red-50 hover:brightness-[0.98]"
                    : a.tone === "amber"
                      ? "border-amber-200 bg-amber-50 hover:brightness-[0.98]"
                      : "border-blue-200 bg-blue-50 hover:brightness-[0.98]"
                )}
              >
                <div className="text-sm font-semibold text-slate-900">{a.label}</div>
                <span className="text-xs font-extrabold text-slate-600">Ir</span>
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-extrabold text-slate-900">Últimas movimentações</div>
            <div className="mt-3 space-y-2">
              {currentData.recentActivity.map((x, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="text-xs text-slate-500 shrink-0">{x.ts}</div>
                  <div className="text-xs font-semibold text-slate-700 text-right">{x.text}</div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 text-xs text-slate-500">
        Dados mock por enquanto. Depois conectamos API e fazemos cada card abrir com o filtro correto (ex.: “docs vencidas”, “RDO pendente”, “estoque baixo”).
      </div>
    </div>
  );
}
