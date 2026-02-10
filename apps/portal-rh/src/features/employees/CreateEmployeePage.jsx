// apps/portal-rh/src/features/employees/CreateEmployeePage.jsx
import React, { useState } from 'react';
import api from '../../services/api';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

export default function CreateEmployeePage({ onCreateEmployee }) {
  const [form, setForm] = useState({ name: '', cpf: '', role: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.employees.create(form);
      onCreateEmployee(); // Avisa o pai para atualizar a lista
    } catch (err) {
      alert("Erro ao salvar no banco: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Novo Cadastro (Banco de Dados)</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          placeholder="Nome" 
          value={form.name} 
          onChange={e => setForm({...form, name: e.target.value})} 
          required 
        />
        <Input 
          placeholder="CPF" 
          value={form.cpf} 
          onChange={e => setForm({...form, cpf: e.target.value})} 
          required 
        />
        <Input 
          placeholder="Cargo" 
          value={form.role} 
          onChange={e => setForm({...form, role: e.target.value})} 
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Gravando...' : 'Salvar no Banco'}
        </Button>
      </form>
    </Card>
  );
}
