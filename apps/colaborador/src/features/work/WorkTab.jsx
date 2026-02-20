import React, { useState } from 'react';
import { FileText, Send, CheckCircle } from 'lucide-react';
import api from '../../services/api'; 
import { enqueueSyncAction } from '../../lib/outbox';

export default function WorkTab() {
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleSubmitRDO = async (e) => {
    e.preventDefault();
    if (!descricao.trim()) return;

    setEnviando(true);

    const payload = {
      employeeId: "cl_demo_user", // Na versão final, pegar ID do usuário logado
      date: new Date().toISOString(),
      description: descricao,
      status: 'PENDING'
    };

    // 1. Salva na caixa de saída (Garante que funciona sem internet)
    enqueueSyncAction({
      type: 'SYNC_RDO',
      payload: payload
    });

    // 2. Disparo forçado para a demonstração (Tempo Real)
    try {
      await api.post('/integration/sync/rdo', payload);
      setSucesso(true);
      setDescricao(''); // Limpa o formulário
      
      // Reseta o aviso de sucesso após 3 segundos
      setTimeout(() => setSucesso(false), 3000);
    } catch (error) {
      console.error('Erro ao enviar:', error);
      alert("Aviso: Sem conexão, salvo para envio offline.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Cabeçalho */}
      <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <FileText size={28} className="text-blue-200" />
          <h2 className="text-xl font-bold">Relatório de Obra</h2>
        </div>
        <p className="text-blue-100 text-sm">Registre as atividades executadas no seu turno (RDO).</p>
      </div>

      {/* Formulário do RDO */}
      <form onSubmit={handleSubmitRDO} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Descrição das Atividades (Hoje)
          </label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            className="w-full h-32 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-slate-800"
            placeholder="Ex: Realizada manutenção preventiva da válvula de sucção..."
          ></textarea>
        </div>

        {sucesso ? (
          <div className="flex items-center justify-center space-x-2 bg-green-100 text-green-700 py-4 rounded-xl font-medium animate-pulse">
            <CheckCircle size={20} />
            <span>RDO Enviado ao RH!</span>
          </div>
        ) : (
          <button
            type="submit"
            disabled={enviando || !descricao.trim()}
            className="w-full flex justify-center items-center space-x-2 bg-blue-600 text-white font-bold py-4 rounded-xl shadow-md hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all"
          >
            <Send size={20} />
            <span>{enviando ? 'Enviando...' : 'Enviar Relatório'}</span>
          </button>
        )}
      </form>
    </div>
  );
}
