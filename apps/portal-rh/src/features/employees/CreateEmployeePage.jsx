import React, { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, FileText, IdCard, UserPlus } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Badge from '../../ui/Badge';
import { buildMinimalCollaborators, computeDashboardMetrics, parseXlsxToDataset } from '../../services/portalXlsxImporter';

function digitsOnly(s) {
  return (s || '').toString().replace(/\D/g, '');
}

function formatCPF(digits) {
  const d = digitsOnly(digits).slice(0, 11);
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `emp_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export default function CreateEmployeePage({ employees = [], onCreateEmployee }) {
  const [mode, setMode] = useState('choose'); // choose | manual
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const fileInputRef = useRef(null);

  const existingCpfs = useMemo(() => new Set(employees.map((e) => digitsOnly(e.cpf))), [employees]);

  const [form, setForm] = useState({
    name: '',
    cpf: '',
    role: '',
    base: '',
    unit: ''
  });

  function setField(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  function resetMessages() {
    setErr('');
    setOk('');
  }

  function submitManual(e) {
    e.preventDefault();
    resetMessages();

    const name = form.name.trim();
    const cpfDigits = digitsOnly(form.cpf);

    if (!name) return setErr('Informe o nome do colaborador.');
    if (cpfDigits.length !== 11) return setErr('CPF inválido. Digite os 11 números.');
    if (existingCpfs.has(cpfDigits)) return setErr('Já existe um colaborador cadastrado com este CPF.');

    const base = form.base.trim() || '—';
    const unit = form.unit.trim() || '—';

    const employee = {
      id: uid(),
      name,
      cpf: formatCPF(cpfDigits),
      role: form.role.trim() || '—',

      // ✅ Novo domínio
      base,
      unit,

      // compat: evita quebrar partes antigas enquanto você migra
      hub: base,
      client: unit,

      status: 'ATIVO',
      docs: { valid: 0, warning: 0, expired: 0 },
      equipment: { assigned: 0, pendingReturn: 0 },
      nextDeployment: null,
      finance: {
        status: 'Em análise',
        note: '',
        bank: '—',
        pix: '—',
        lastPayment: null,
        lastAmount: null,
        notes: ''
      }
    };

    onCreateEmployee?.(employee);
    setOk('Colaborador cadastrado com sucesso.');

    setForm({ name: '', cpf: '', role: '', base: '', unit: '' });
    setMode('choose');
  }

  async function handleXlsxImport(file) {
    if (!file) return;
    resetMessages();
    try {
      const dataset = await parseXlsxToDataset(file);
      const metrics = computeDashboardMetrics(dataset);
      const importedAt = new Date().toISOString();
      const payload = { version: 1, importedAt, dataset, metrics };
      try {
        window.localStorage.setItem('portal_rh_xlsx_v1', JSON.stringify(payload));
        setOk('Planilha importada com sucesso.');
        return;
      } catch (storageErr) {
        try {
          const colaboradores_minimos = buildMinimalCollaborators(dataset.colaboradores);
          window.localStorage.setItem(
            'portal_rh_xlsx_v1',
            JSON.stringify({ version: 1, importedAt, metrics, colaboradores_minimos })
          );
          setOk('Planilha importada com sucesso (dados resumidos).');
          return;
        } catch (fallbackErr) {
          setErr('Planilha carregada, mas não foi possível salvar os dados no navegador.');
        }
      }
    } catch (parseErr) {
      setErr('Falha ao importar planilha XLSX. Verifique o arquivo.');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">Cadastrar colaborador</div>
            <div className="text-sm text-slate-500">Escolha o método de cadastro.</div>
          </div>
          <UserPlus />
        </div>

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              resetMessages();
              setErr('Integração via e-CPF: em breve.');
            }}
            className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Inserir via e-CPF</div>
                <div className="text-sm text-slate-500">Automatizado via certificado digital (em breve).</div>
              </div>
              <IdCard />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              setMode('manual');
            }}
            className="w-full rounded-xl border border-slate-900 p-4 text-left hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Inserir manualmente</div>
                <div className="text-sm text-slate-500">Cadastro rápido, sem duplicidade (CPF único).</div>
              </div>
              <FileText />
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              resetMessages();
              fileInputRef.current?.click();
            }}
            className="w-full rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Inserir via Excel</div>
                <div className="text-sm text-slate-500">Upload de planilha com validação (em breve).</div>
              </div>
              <FileSpreadsheet />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (e.target) e.target.value = '';
              handleXlsxImport(file);
            }}
          />

          {err && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{err}</div>
          )}
          {ok && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{ok}</div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        {mode !== 'manual' ? (
          <div className="text-sm text-slate-500">
            Selecione <Badge tone="gray">Inserir manualmente</Badge> para preencher o cadastro.
          </div>
        ) : (
          <form onSubmit={submitManual} className="space-y-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">Cadastro manual</div>
              <div className="text-sm text-slate-500">CPF é obrigatório e não pode repetir.</div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <div className="text-sm font-medium text-slate-700">Nome</div>
                <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Nome completo" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">CPF</div>
                <Input
                  value={form.cpf}
                  onChange={(e) => setField('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Função</div>
                <Input value={form.role} onChange={(e) => setField('role', e.target.value)} placeholder="Ex: Motorista" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Base (terra)</div>
                <Input value={form.base} onChange={(e) => setField('base', e.target.value)} placeholder="Ex: Base Cabiúnas" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Unidade (plataforma/embarcação)</div>
                <Input value={form.unit} onChange={(e) => setField('unit', e.target.value)} placeholder="Ex: Plataforma P-74" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Salvar colaborador</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  resetMessages();
                  setMode('choose');
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
