import React, { useMemo, useState } from 'react';
import { Landmark, Receipt, Wallet } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

function money(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FinanceTab({ employee }) {
  const finance = employee?.finance || {};
  const bank = finance?.bank || employee?.bank || {};

  // Local-only fields (placeholder until persistence is wired to the RH store/API)
  const [status, setStatus] = useState(finance.status || 'Em análise');
  const [note, setNote] = useState(finance.note || '');
  const [pixKey, setPixKey] = useState(bank.pixKey || '');
  const [bankName, setBankName] = useState(bank.bankName || '');
  const [agency, setAgency] = useState(bank.agency || '');
  const [account, setAccount] = useState(bank.account || '');
  const [holderName, setHolderName] = useState(bank.holderName || employee?.name || '');
  const [holderCpf, setHolderCpf] = useState(bank.holderCpf || employee?.cpf || '');

  const tone = useMemo(() => {
    if ((status || '').toUpperCase() === 'OK') return 'green';
    if ((status || '').toUpperCase().includes('PEND')) return 'yellow';
    return 'gray';
  }, [status]);

  const pending = finance?.pending ?? finance?.pendingAmount ?? null;
  const lastPayment = finance?.lastPayment ?? null;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Wallet size={18} className="text-slate-500" /> Financeiro
            </div>
            <div className="text-sm text-slate-500">
              Resumo por colaborador. (Edição e persistência serão conectadas ao store/API.)
            </div>
          </div>
          <Badge tone={tone}>{status || 'Em análise'}</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Receipt size={14} /> Último pagamento
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {lastPayment?.date ? lastPayment.date : 'Sem registro'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {lastPayment?.amount ? money(lastPayment.amount) : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Wallet size={14} /> Pendências
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {pending !== null && pending !== undefined ? money(pending) : 'Sem pendências'}
            </div>
            <div className="mt-1 text-xs text-slate-500">Adiantamentos, descontos, acertos, etc.</div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <Landmark size={14} /> Dados bancários
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">
              {bankName ? bankName : 'Não informado'}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {agency || account ? `Ag ${agency || '—'} • Cc ${account || '—'}` : 'Agência/Conta não informadas'}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Status e observações</div>
            <div className="text-sm text-slate-500">
              Use isso para marcar pendências, validação de dados, bloqueios ou OK.
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              alert('Salvamento ainda não implementado. (Mock)\n\nPróximo passo: conectar ao setEmployees/store/API.');
            }}
          >
            Salvar
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500 mb-1">Status</div>
            <Input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Ex.: OK, Pendente, Em análise" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Observação</div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: aguardando comprovante de conta" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="text-sm font-semibold text-slate-900">Dados bancários</div>
        <div className="text-sm text-slate-500">
          Essas informações serão usadas para reembolsos, adiantamentos e acertos.
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500 mb-1">Chave Pix</div>
            <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou aleatória" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Banco</div>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex.: NU Pagamentos, Itaú, Bradesco..." />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Agência</div>
            <Input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="Ex.: 0001" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Conta</div>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Ex.: 12345-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Beneficiário</div>
            <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nome do beneficiário" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">CPF do beneficiário</div>
            <Input value={holderCpf} onChange={(e) => setHolderCpf(e.target.value)} placeholder="CPF do beneficiário" />
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Status: <span className="font-medium">Preparado</span> (falta conectar persistência).
        </div>
      </Card>
    </div>
  );
}
