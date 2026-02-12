import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import api from '../../services/api';

function normalizeEmployeesResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.employees.list();
      setEmployees(normalizeEmployeesResponse(data));
    } catch (err) {
      console.error('Erro:', err);
      setError('Falha na conexão com o servidor.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (employees || []).filter(
      (e) => (e.name || '').toLowerCase().includes(s) || (e.cpf || '').includes(s) || (e.registration || '').includes(s)
    );
  }, [employees, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar colaborador..." />
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {error && <Card className="p-4 text-sm text-red-600">{error}</Card>}

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {!loading && filtered.length === 0 ? (
            search.trim() ? (
              <Card className="p-4 text-sm text-slate-600">Nenhum colaborador encontrado.</Card>
            ) : (
              <Card className="p-4 text-sm text-slate-600">Em desenvolvimento</Card>
            )
          ) : (
            filtered.map((e) => (
              <Card key={e.id || `${e.cpf || 'no-cpf'}-${e.registration || 'no-reg'}`} className="mb-2 p-4">
                <div className="font-medium text-slate-900">{e.name || 'Sem nome'}</div>
                <div className="text-xs text-slate-500">CPF: {e.cpf || '—'} • Matrícula: {e.registration || '—'}</div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
