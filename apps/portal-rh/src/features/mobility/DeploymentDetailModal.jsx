import React, { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import apiService from '../../services/api';
import EmbarqueEscalaTab from './EmbarqueEscalaTab';

export default function DeploymentDetailModal({ open, onClose, deployment }) {
  const [tickets, setTickets] = useState([]);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (open && deployment?.id) {
      apiService.deployments.listTickets(deployment.id).then(setTickets);
    }
  }, [open, deployment?.id]);

  const add = async () => {
    await apiService.deployments.createTicket(deployment.id, { type: 'PASSAGEM', fileUrl: url });
    setUrl('');
    setTickets(await apiService.deployments.listTickets(deployment.id));
  };

  return (
    <Modal open={open} title="Detalhes do deployment" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm">{deployment?.employee?.name}</div>
        <EmbarqueEscalaTab employee={deployment?.employee} />

        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="border rounded p-2 text-xs flex justify-between">
              <span>
                {t.type} - {t.fileUrl || 'sem link'}
              </span>
              <Button
                variant="ghost"
                onClick={async () => {
                  await apiService.deployments.removeTicket(deployment.id, t.id);
                  setTickets(await apiService.deployments.listTickets(deployment.id));
                }}
              >
                Excluir
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="fileUrl" />
          <Button onClick={add}>Adicionar ticket</Button>
        </div>
      </div>
    </Modal>
  );
}
