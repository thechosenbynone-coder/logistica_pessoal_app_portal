import React, { useState, useEffect } from 'react';
import apiClient from '../../lib/apiClient'; 

export default function WorkPage() {
  const [rdos, setRdos] = useState([]);
  const [loading, setLoading] = useState(true);

  // O motor do Tempo Real (Polling)
  const fetchRdos = async () => {
    try {
      // Ajuste o caminho se a sua rota base for diferente de /api/integration
      const response = await apiClient.get('/integration/work-orders/rdo');
      setRdos(response.data);
    } catch (error) {
      console.error("Erro ao puxar RDOs da API", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRdos(); // Primeira carga
    const intervalId = setInterval(fetchRdos, 2000); // Pisca e atualiza a cada 2s
    
    return () => clearInterval(intervalId); // Limpa ao trocar de tela
  }, []);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Cabeçalho da Demo */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de RDO</h1>
          <p className="text-slate-500 text-sm mt-1">Relatórios Diários de Obra recebidos do campo.</p>
        </div>
        
        {/* Indicador de Tempo Real */}
        <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-lg border border-green-100">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-green-700 font-semibold tracking-wide">AO VIVO</span>
        </div>
      </div>

      {/* Tabela de Dados Reais */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500 animate-pulse">Sincronizando com banco de dados...</div>
        ) : rdos.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Nenhum RDO preenchido pelos colaboradores hoje.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-slate-600 text-sm">
                <tr>
                  <th className="p-4 font-semibold">Data do Registro</th>
                  <th className="p-4 font-semibold">Colaborador / Matrícula</th>
                  <th className="p-4 font-semibold">Descrição (RDO)</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rdos.map((rdo) => (
                  <tr key={rdo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm text-slate-700 whitespace-nowrap">
                      {new Date(rdo.date).toLocaleDateString('pt-BR')} <br/>
                      <span className="text-xs text-slate-400">{new Date(rdo.createdAt).toLocaleTimeString('pt-BR')}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{rdo.employee?.name || 'Empregado Demo'}</div>
                      <div className="text-xs text-slate-500">ID: {rdo.employeeId}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={rdo.details}>
                      {rdo.details}
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">
                        {rdo.status === 'PENDING' ? 'Análise Pendente' : rdo.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
