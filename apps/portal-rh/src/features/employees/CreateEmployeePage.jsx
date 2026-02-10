import React, { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, FileText, IdCard, UserPlus } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Badge from '../../ui/Badge';
import { normalizeDigitsOnly } from '../../lib/documentationUtils';
import { isDemoMode } from '../../services/demoMode';
import api from '../../services/api';

function formatCPF(digits) {
  const d = normalizeDigitsOnly(digits).slice(0, 11);
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export default function CreateEmployeePage({ employees = [], onCreateEmployee }) {
  const [mode, setMode] = useState('choose'); // choose | manual
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const demoMode = isDemoMode();

  // Existing CPFs check (client-side only for immediate feedback, backup is backend unique constraint)
  const existingCpfs = useMemo(() => new Set(employees.map((e) => normalizeDigitsOnly(e.cpf))), [employees]);

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

  async function submitManual(e) {
    e.preventDefault();
    resetMessages();

    const name = form.name.trim();
    const cpfDigits = normalizeDigitsOnly(form.cpf);

    if (!name) return setErr('Informe o nome do colaborador.');
    if (cpfDigits.length !== 11) return setErr('CPF inválido. Digite os 11 números.');
    if (existingCpfs.has(cpfDigits)) return setErr('Já existe um colaborador cadastrado com este CPF (verificação local).');

    setIsSubmitting(true);

    try {
      const payload = {
        name,
        cpf: formatCPF(cpfDigits),
        role: form.role.trim() || 'Colaborador',
        base: form.base.trim(),
        unit: form.unit.trim()
      };

      // 🚀 CALL REAL API
      const createdEmployee = await api.employees.create(payload);

      // Notify parent & UI
      onCreateEmployee?.(createdEmployee);
      setOk(`Colaborador ${createdEmployee.name} cadastrado com sucesso!`);

      // Reset form
      setForm({ name: '', cpf: '', role: '', base: '', unit: '' });
      setMode('choose');

    } catch (error) {
      console.error(error);
      setErr(error.message || 'Erro desconhecido ao comunicar com o servidor.');
    } finally {
      setIsSubmitting(false);
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
            disabled={true}
            className="w-full rounded-xl border border-slate-200 p-4 text-left opacity-50 cursor-not-allowed"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Inserir via e-CPF</div>
                <div className="text-sm text-slate-500">Em breve integration Gov.br</div>
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
            className="w-full rounded-xl border border-slate-900 p-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Inserir manualmente</div>
                <div className="text-sm text-slate-500">Cadastro direto no Banco de Dados.</div>
              </div>
              <FileText />
            </div>
          </button>

          {/* Excel Import Disabled during Migration */}
          <button
            type="button"
            disabled={true}
            className="w-full rounded-xl border border-slate-200 p-4 text-left opacity-50 cursor-not-allowed"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-900">Inserir via Excel</div>
                <div className="text-sm text-slate-500">Desativado temporariamente para migração.</div>
              </div>
              <FileSpreadsheet />
            </div>
          </button>

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
              <div className="text-sm text-slate-500">Os dados serão salvos diretamente no Servidor.</div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <div className="text-sm font-medium text-slate-700">Nome</div>
                <Input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Nome completo"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">CPF</div>
                <Input
                  value={form.cpf}
                  onChange={(e) => setField('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Função</div>
                <Input
                  value={form.role}
                  onChange={(e) => setField('role', e.target.value)}
                  placeholder="Ex: Motorista"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Base (terra)</div>
                <Input
                  value={form.base}
                  onChange={(e) => setField('base', e.target.value)}
                  placeholder="Ex: Base Cabiúnas"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">Unidade (plataforma/embarcação)</div>
                <Input
                  value={form.unit}
                  onChange={(e) => setField('unit', e.target.value)}
                  placeholder="Ex: Plataforma P-74"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar colaborador'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
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
