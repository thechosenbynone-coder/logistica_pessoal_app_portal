import React, { useState } from 'react';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

export default function DeploymentFormModal({ open, onClose, onCreate }) {
  const [employeeId, setEmployeeId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  return <Modal open={open} title="Novo deployment" onClose={onClose}><div className="space-y-3"><Input value={employeeId} onChange={(e)=>setEmployeeId(e.target.value)} placeholder="employee_id"/><Input type="date" value={start} onChange={(e)=>setStart(e.target.value)} /><Input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} /><Button onClick={() => onCreate({ employee_id: Number(employeeId), start_date: start, end_date_expected: end })}>Salvar</Button></div></Modal>;
}
