import React, { useCallback, useEffect, useState } from 'react';
import Button from '../../ui/Button';
import apiService from '../../services/api';

export default function SemPreenchimentoTab() {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [data, setData] = useState({ semRdo: [], counts: { embarcados: 0, preencheram: 0 } });
  const load = useCallback(async () => setData(await apiService.dailyReports.semPreenchimento(date)), [date]);
  useEffect(() => { load(); }, [load]);
  return <div className="space-y-3"><input type="date" className="border rounded p-2" value={date} onChange={(e)=>setDate(e.target.value)} /><div className="text-sm">{data.counts.preencheram} preencheram de {data.counts.embarcados} embarcados</div>{(data.semRdo||[]).map((item) => <div key={item.deploymentId} className="border rounded p-2 flex justify-between"><span>{item.employee?.name}</span><Button onClick={() => apiService.dailyReports.cobrar(item.employee?.id)}>Cobrar</Button></div>)}</div>;
}
