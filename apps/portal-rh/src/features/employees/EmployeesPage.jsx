import React, { useEffect, useMemo, useState } from 'react';
import { UserCircle2, Search, RefreshCw } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import EmployeeProfile from './EmployeeProfile';

// CORREÇÃO AQUI: Importação sem chaves {}
import api from '../../services/api';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.employees.list();
      setEmployees(data);
    } catch (err) {
      console.error("Erro:", err);
      setError('Falha na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return (employees || []).filter((e) =>
      (e.name || '').toLowerCase().includes(s) ||
      (e.cpf || '').includes(s)
    );
  }, [employees, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          placeholder="Buscar colaborador..." 
        />
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {filtered.map(e => (
             <Card key={e.id} className="p-4 mb-2">
               {e.name}
             </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
