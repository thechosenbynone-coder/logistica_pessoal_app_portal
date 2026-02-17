import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plane, QrCode, XCircle } from 'lucide-react';
import { formatDateBR } from '../../utils';

const DEFAULT_STEPS = [
  { key: 'check_in_base', label: 'Check-in na base', field: 'checkInTime' },
  { key: 'embarque_voo', label: 'Embarque', field: 'flight' },
  { key: 'chegada_destino', label: 'Chegada ao destino', field: 'location' },
  { key: 'desembarque_retorno', label: 'Desembarque retorno', field: 'disembarkDate' },
];

function normalizeStepStatus(value) {
  if (value === 'confirmed' || value === 'not_applicable' || value === 'pending') return value;
  if (value === 'done' || value === 'completed') return 'confirmed';
  return 'pending';
}

function resolveJourneySteps(boarding, fallbackTimeline = []) {
  const fromBoarding = Array.isArray(boarding?.journey)
    ? boarding.journey.map((step, index) => ({
        key: step.key || `journey_${index}`,
        label: step.label || step.name || `Etapa ${index + 1}`,
        detail: step.time || step.date || step.detail || '',
        status: normalizeStepStatus(step.status),
      }))
    : [];

  if (fromBoarding.length > 0) return fromBoarding;

  if (Array.isArray(fallbackTimeline) && fallbackTimeline.length > 0) {
    return fallbackTimeline.map((item, index) => ({
      key: item.key || `timeline_${index}`,
      label: item.event,
      detail: [item.date, item.time].filter(Boolean).join(' • '),
      status: normalizeStepStatus(item.status),
    }));
  }

  return DEFAULT_STEPS
    .filter((step) => Boolean(boarding?.[step.field]))
    .map((step) => ({
      key: step.key,
      label: step.label,
      detail: step.field === 'disembarkDate' ? formatDateBR(boarding.disembarkDate) : String(boarding[step.field]),
      status: 'pending',
    }));
}

export function TripTab({
  employee,
  boarding,
  fallbackTimeline = [],
  qrCodeData = 'SECURE_TOKEN_V1',
  statusFlowTrigger = 0,
  onStatusUpdate,
}) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [journeyStatuses, setJourneyStatuses] = useState({});

  const journeySteps = useMemo(() => resolveJourneySteps(boarding, fallbackTimeline), [boarding, fallbackTimeline]);

  useEffect(() => {
    setJourneyStatuses((prev) => {
      const next = {};
      journeySteps.forEach((step) => {
        next[step.key] = prev[step.key] || step.status || 'pending';
      });
      return next;
    });
  }, [journeySteps]);

  useEffect(() => {
    if (statusFlowTrigger > 0) setShowStatusModal(true);
  }, [statusFlowTrigger]);

  const qrCodeUrl = useMemo(() => {
    const data = `EMBARQUE|${employee.registration}|${boarding.flight}|${boarding.date}|${qrCodeData}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(data)}`;
  }, [employee.registration, boarding.flight, boarding.date, qrCodeData]);

  const applyStatus = (key, status) => {
    setJourneyStatuses((prev) => ({ ...prev, [key]: status }));
  };

  const saveStatus = async () => {
    const payload = { steps: journeySteps.map((step) => ({ key: step.key, status: journeyStatuses[step.key] || 'pending' })) };
    try {
      await onStatusUpdate?.(payload);
    } catch {
      // offline-friendly: silently keep local state
    }
    setShowStatusModal(false);
  };

  return (
    <div className="space-y-4 pb-20">
      <section className="rounded-xl bg-white p-4 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Resumo do embarque</h3>
          <button
            onClick={() => setShowStatusModal(true)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Atualizar status
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-gray-500">Data</p>
            <p className="font-semibold text-gray-800">{formatDateBR(boarding.date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Horário</p>
            <p className="font-semibold text-gray-800">{boarding.time}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Local</p>
            <p className="font-semibold text-gray-800">{boarding.location}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Transporte</p>
            <p className="font-semibold text-gray-800">{boarding.flight || 'Não informado'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-md">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-gray-800">
          <QrCode className="h-5 w-5 text-blue-600" />
          QR Code de Identificação
        </h3>
        <div className="flex flex-col items-center">
          <div className="mb-3 flex items-center justify-center rounded-lg border-2 border-gray-200 bg-white p-4">
            <img src={qrCodeUrl} alt="QR Code" className="h-48 w-48" />
          </div>
          <p className="mb-2 text-center text-sm text-gray-600">Apresente este QR Code nos terminais de embarque</p>
          <div className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs text-blue-800"><strong>Matrícula:</strong> {employee.registration}</p>
            <p className="text-xs text-blue-800"><strong>Voo:</strong> {boarding.flight}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">CARTÃO DE EMBARQUE</span>
            <Plane className="h-5 w-5" />
          </div>
          <p className="text-2xl font-bold">{boarding.flight}</p>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-xs text-gray-500">PASSAGEIRO</p>
              <p className="font-semibold text-gray-800">{employee.name}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">ASSENTO</p>
              <p className="font-semibold text-gray-800">{boarding.seat}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <p className="mb-1 text-xs text-gray-500">DATA</p>
              <p className="font-semibold text-gray-800">{formatDateBR(boarding.date)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">HORÁRIO</p>
              <p className="font-semibold text-gray-800">{boarding.time}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="mb-1 text-xs text-gray-500">LOCAL DE EMBARQUE</p>
            <p className="font-semibold text-gray-800">{boarding.location}</p>
            <p className="mt-1 text-sm text-gray-600">{boarding.terminal}</p>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Apresente-se às {boarding.checkInTime}</p>
              <p className="mt-1 text-xs text-yellow-700">Tenha em mãos: RG, ASO válido e este app aberto</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-md">
        <h3 className="mb-3 font-bold text-gray-800">Minha jornada</h3>
        <div className="space-y-2">
          {journeySteps.map((step) => {
            const status = journeyStatuses[step.key] || 'pending';
            return (
              <div key={step.key} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{step.label}</p>
                  {step.detail ? <p className="text-xs text-slate-500">{step.detail}</p> : null}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-700'
                      : status === 'not_applicable'
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {status === 'confirmed' ? 'Confirmado' : status === 'not_applicable' ? 'Não se aplica' : 'Pendente'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-bold text-slate-800">Atualizar status</h4>
              <button onClick={() => setShowStatusModal(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Fechar atualização de status">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {journeySteps.map((step) => (
                <div key={step.key} className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-medium text-slate-800">{step.label}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => applyStatus(step.key, 'confirmed')}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        (journeyStatuses[step.key] || 'pending') === 'confirmed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Confirmado
                    </button>
                    <button
                      onClick={() => applyStatus(step.key, 'not_applicable')}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        (journeyStatuses[step.key] || 'pending') === 'not_applicable'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Não se aplica
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={saveStatus} className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Salvar atualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
