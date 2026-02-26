import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import apiService from '../../services/api';

export default function EpiReturnModal({ open, onClose, delivery, onDone }) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const submit = async () => {
    await apiService.epiDeliveries.registerReturn(delivery.id, { returned_qty: Number(qty), returned_notes: notes });
    onDone?.();
    onClose?.();
  };
  return <Modal open={open} title="Registrar devolução" onClose={onClose}><div className="space-y-3"><Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações" /><Button onClick={submit}>Salvar</Button></div></Modal>;
}
