import React, { useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

function normalizeText(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function digitsOnly(s) {
  return (s || '').toString().replace(/\D/g, '');
}

export default function EmployeePickerModal({
  isOpen,
  onClose,
  employees,
  title = 'Selecionar colaborador',
  hint = 'Digite nome ou CPF',
  onSelect,
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = normalizeText(q);
    const d = digitsOnly(q);
    if (!t && !d) return employees;
    return employees.filter((e) => {
      const name = normalizeText(e.name);
      const cpf = digitsOnly(e.cpf);
      return (t && name.includes(t)) || (d && cpf.includes(d));
    });
  }, [employees, q]);

  const list = filtered.slice(0, 30);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setQ('');
        onClose?.();
      }}
      title={title}
    >
      <div className="space-y-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={hint} />

        <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
          {list.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Nenhum colaborador encontrado.</div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {list.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect?.(e);
                      setQ('');
                      onClose?.();
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{e.name}</div>
                      <div className="text-xs text-slate-500">
                        {e.cpf || 'CPF não informado'} • {e.role || 'Função'} • {e.hub || 'HUB'}
                      </div>
                    </div>
                    <Badge tone="gray">Selecionar</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              setQ('');
              onClose?.();
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
