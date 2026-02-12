import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, MapPin, Truck } from 'lucide-react';
import Card from '../../ui/Card.jsx';
import Badge from '../../ui/Badge.jsx';
import Button from '../../ui/Button.jsx';
import Input from '../../ui/Input.jsx';
import { REQUIRED_DOC_TYPES, docWindowStatus, normalizeDocType, normalizeText } from '../../lib/documentationUtils';
import { readPayload } from '../../services/portalStorage';

function fmtDate(iso) {
  if (!iso) return '';
  // Expecting YYYY-MM-DD; keep it simple and stable
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(iso);
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

function getNextDeployment(employee) {
  return employee?.nextDeployment || null;
}

function loadStoredDocumentacoes() {
  const payload = readPayload();
  return Array.isArray(payload?.dataset?.documentacoes) ? payload.dataset.documentacoes : [];
}

function summarizeWindowDocs(documentacoes, employeeId, embarkDate, disembarkDate) {
  if (!employeeId || !embarkDate || !disembarkDate) return null;
  if (!Array.isArray(documentacoes) || documentacoes.length === 0) return null;
  const id = normalizeText(employeeId);
  const docsForEmployee = documentacoes.filter((doc) => normalizeText(doc.COLABORADOR_ID) === id);
  const missing = [];
  const expired = [];
  const during = [];
  REQUIRED_DOC_TYPES.forEach((type) => {
    const doc = docsForEmployee.find((item) => normalizeDocType(item.TIPO_DOCUMENTO) === type);
    if (!doc) {
      missing.push(type);
      return;
    }
    const status = docWindowStatus(doc, embarkDate, disembarkDate);
    if (status === 'VENCIDO') expired.push(type);
    if (status === 'VENCE_DURANTE') during.push(type);
  });
  let level = 'APTO';
  if (missing.length || expired.length) level = 'NAO_APTO';
  else if (during.length) level = 'ATENCAO';
  return { level, missing, expired, during };
}

export default function EmbarqueEscalaTab({ employee }) {
  const [note, setNote] = useState(employee?.mobility?.note || '');
  const [documentacoes, setDocumentacoes] = useState([]);

  const dep = useMemo(() => getNextDeployment(employee), [employee]);

  const schedule = employee?.mobility?.schedule || employee?.schedule || null;
  const deployments = employee?.mobility?.deployments || employee?.deployments || null;
  const embarkDate = dep?.embarkDate;
  const disembarkDate = dep?.disembarkDate || dep?.returnDate || dep?.endDate;

  useEffect(() => {
    setDocumentacoes(loadStoredDocumentacoes());
    const handleUpdate = () => {
      setDocumentacoes(loadStoredDocumentacoes());
    };
    window.addEventListener('portal_rh_data_updated', handleUpdate);
    return () => {
      window.removeEventListener('portal_rh_data_updated', handleUpdate);
    };
  }, []);

  const docWindow = useMemo(
    () => summarizeWindowDocs(documentacoes, employee?.id, embarkDate, disembarkDate),
    [documentacoes, employee?.id, embarkDate, disembarkDate]
  );
  const docWindowLabel =
    docWindow?.level === 'NAO_APTO' ? 'NÃO APTO' : docWindow?.level === 'ATENCAO' ? 'ATENÇÃO' : 'APTO';
  const docWindowTone = docWindow?.level === 'NAO_APTO' ? 'red' : docWindow?.level === 'ATENCAO' ? 'amber' : 'green';

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">Escalas & Embarques</div>
            <div className="text-sm text-slate-500">
              Visão por colaborador. (Este módulo ainda está em evolução.)
            </div>
          </div>
          <Badge tone="blue">Portal RH</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CalendarClock size={14} /> Próximo embarque
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {dep ? fmtDate(dep.embarkDate) : 'Sem embarque'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {dep?.transport ? dep.transport : 'Transporte não definido'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <MapPin size={14} /> Destino
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {dep?.destination || 'Sem destino'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {employee?.hub ? `Origem: ${employee.hub}` : 'Origem não definida'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Truck size={14} /> Status
            </div>
            <div className="mt-2">
              <Badge tone={dep ? 'green' : 'gray'}>{dep ? 'Programado' : 'Sem programação'}</Badge>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Dica: este card vai virar um CRUD (embarques, translados e checklist).
            </div>
            {!!docWindow && (
              <div className="mt-2">
                <Badge tone={docWindowTone}>Documentação: {docWindowLabel}</Badge>
              </div>
            )}
          </div>
        </div>

        {!!docWindow && (docWindow.missing.length || docWindow.expired.length || docWindow.during.length) && (
          <div className="mt-4 space-y-1 text-xs text-slate-500">
            {docWindow.missing.length > 0 && (
              <div>Faltando: {docWindow.missing.join(', ')}</div>
            )}
            {docWindow.expired.length > 0 && (
              <div>Vencidos antes do embarque: {docWindow.expired.join(', ')}</div>
            )}
            {docWindow.during.length > 0 && (
              <div>Vencem durante: {docWindow.during.join(', ')}</div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Escala</div>
        <div className="mt-1 text-sm text-slate-500">
          Se você já tiver um objeto de escala no colaborador, ele aparece aqui automaticamente.
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          {schedule ? (
            <pre className="text-xs text-slate-700 whitespace-pre-wrap">{JSON.stringify(schedule, null, 2)}</pre>
          ) : (
            <div className="text-sm text-slate-600">Sem escala cadastrada.</div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Observações do embarque</div>
            <div className="text-sm text-slate-500">
              Campo livre para instruções rápidas (checklist, ponto de encontro, documentos).
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              // placeholder: integração futura com persistência
              alert('Salvamento ainda não implementado. (Mock)');
            }}
          >
            Salvar
          </Button>
        </div>

        <div className="mt-4">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: Chegar 1h antes, levar RG original, ponto de encontro no portão 3..."
          />
        </div>
      </Card>

      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Histórico (mock)</div>
        <div className="mt-1 text-sm text-slate-500">
          Se você já tiver um array de embarques no colaborador, ele aparece aqui.
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          {Array.isArray(deployments) && deployments.length ? (
            <div className="space-y-2">
              {deployments.map((d, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                  <div className="text-slate-800">
                    {d.destination || 'Destino'} • {fmtDate(d.embarkDate)}
                  </div>
                  <Badge tone="gray">{d.transport || '—'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-600">Sem histórico cadastrado.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
