import React, { useState } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

// CORREÇÃO AQUI: Importação sem chaves {}
import api from '../../services/api';

export default function CreateEmployeePage({ onCreateEmployee }) {
  const [form, setForm] = useState({ name: '', cpf: '', role: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newUser = await api.employees.create(form);
      onCreateEmployee?.(newUser);
    } catch (err) {
      console.error("Erro ao criar:", err);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          placeholder="Nome" 
          value={form.name} 
          onChange={e => setForm({...form, name: e.target.value})} 
        />
        <Button type="submit">Cadastrar</Button>
      </form>
    </Card>
  );
}
