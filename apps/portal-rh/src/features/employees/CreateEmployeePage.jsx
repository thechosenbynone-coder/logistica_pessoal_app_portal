// apps/portal-rh/src/features/employees/CreateEmployeePage.jsx
import React, { useState } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

// IMPORTAÇÃO CORRETA (Sem chaves, para não quebrar o Vercel)
import api from '../../services/api';

export default function CreateEmployeePage({ onCreateEmployee }) {
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    role: '',
    base: '',
    unit: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 🚀 ENVIO REAL PARA O BANCO DE DADOS
      const createdEmployee = await api.employees.create(form);
      
      // Notifica o sistema que um novo funcionário foi criado para atualizar a lista
      if (onCreateEmployee) onCreateEmployee(createdEmployee);
      
      // Limpa o formulário
      setForm({ name: '', cpf: '', role: '', base: '', unit: '' });
      alert('Colaborador cadastrado com sucesso no banco!');
    } catch (error) {
      console.error('Erro ao salvar no banco:', error);
      alert('Falha ao salvar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Novo Cadastro (Banco de Dados)</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          placeholder="Nome Completo" 
          value={form.name} 
          onChange={e => setForm({...form, name: e.target.value})} 
          required
        />
        <Input 
          placeholder="CPF (Somente números)" 
          value={form.cpf} 
          onChange={e => setForm({...form, cpf: e.target.value})} 
          required
        />
        <Input 
          placeholder="Cargo/Função" 
          value={form.role} 
          onChange={e => setForm({...form, role: e.target.value})} 
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando no Banco...' : 'Confirmar Cadastro'}
        </Button>
      </form>
    </Card>
  );
}
