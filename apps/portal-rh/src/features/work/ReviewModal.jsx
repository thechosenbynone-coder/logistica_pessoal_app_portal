import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

export default function ReviewModal({ open, onClose, onSubmit }) {
  const [action, setAction] = useState('APROVAR');
  const [reason, setReason] = useState('');
  const [reviewedBy, setReviewedBy] = useState('RH');

  return (
    <Modal open={open} title="Revisar" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex gap-2">
          {['APROVAR', 'REJEITAR', 'SOLICITAR_CORRECAO'].map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              className={`px-3 py-1 rounded text-sm ${
                action === a ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {a === 'APROVAR' ? 'Aprovar' : a === 'REJEITAR' ? 'Rejeitar' : 'Solicitar correção'}
            </button>
          ))}
        </div>

        {action !== 'APROVAR' && (
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo" />
        )}

        <Input
          value={reviewedBy}
          onChange={(e) => setReviewedBy(e.target.value)}
          placeholder="Revisado por"
        />

        <Button onClick={() => onSubmit({ action, reason, reviewedBy })}>Enviar</Button>
      </div>
    </Modal>
  );
}
