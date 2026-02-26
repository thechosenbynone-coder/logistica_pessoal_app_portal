import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import apiService from '../../services/api';

export default function EpiStockTab() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCatalog(await apiService.epiCatalog.list()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return <Card className="p-4"><div className="flex justify-between"><h3 className="font-semibold">Estoque EPI</h3><Button onClick={load}>Atualizar</Button></div>{loading ? <p className="text-sm mt-3">Carregando...</p> : <div className="mt-3 space-y-2">{catalog.map((item) => <div key={item.id} className="border rounded p-2 text-sm">{item.name} • estoque: {item.stock_qty}</div>)}</div>}</Card>;
}
