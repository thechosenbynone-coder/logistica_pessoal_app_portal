import React, { useCallback, useEffect, useState } from 'react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import EpiReturnModal from './EpiReturnModal';
import apiService from '../../services/api';

export default function EpiPendenciasTab() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setRows(await apiService.epiDeliveries.listPendencias());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="p-4">
      <h3 className="font-semibold">Pendências EPI</h3>

      <div className="mt-3 space-y-2">
        {rows.map((r) => {
          const d = r.next_deployment?.startDate || r.next_deployment?.endDateExpected;
          const urgent = d && (new Date(d).getTime() - Date.now()) / 86400000 <= 7;

          return (
            <div key={r.id} className="border rounded p-2 text-sm flex justify-between">
              <div>
                {r.employee?.name || `Colab ${r.employee_id}`} - {r.epi_item?.name} ({r.status}){' '}
                {urgent ? '⚠️' : ''}
              </div>
              <Button variant="secondary" onClick={() => setSelected(r)}>
                Registrar devolução
              </Button>
            </div>
          );
        })}
      </div>

      <EpiReturnModal
        open={!!selected}
        delivery={selected || {}}
        onClose={() => setSelected(null)}
        onDone={load}
      />
    </Card>
  );
}
