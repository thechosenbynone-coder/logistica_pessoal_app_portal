import React, { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import apiService from '../../services/api';

const TRANSPORT_OPTIONS = [
  { value: '', label: 'Selecionar...' },
  { value: 'Aéreo', label: 'Aéreo' },
  { value: 'Marítimo', label: 'Marítimo' },
  { value: 'Terrestre', label: 'Terrestre' },
  { value: 'Helicóptero', label: 'Helicóptero' },
];

const field = (extra = {}) => ({
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: '5px',
  padding: '7px 10px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '13px',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
  ...extra,
});

const label = (extra = {}) => ({
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  marginBottom: 4,
  display: 'block',
  ...extra,
});

const row = (extra = {}) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  ...extra,
});

const grid2 = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
};

export default function DeploymentFormModal({ open, onClose, onCreate }) {
  const [vessels, setVessels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    vessel_id: '',
    service_type: '',
    start_date: '',
    end_date_expected: '',
    departure_hub: '',
    transport_type: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      apiService.vessels.list().then(setVessels).catch(() => setVessels([]));
      setForm({ vessel_id: '', service_type: '', start_date: '', end_date_expected: '', departure_hub: '', transport_type: '', notes: '' });
      setError('');
    }
  }, [open]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.vessel_id) return setError('Selecione a embarcação.');
    if (!form.service_type) return setError('Informe o tipo de serviço.');
    if (!form.start_date) return setError('Informe a data de início.');
    if (!form.end_date_expected) return setError('Informe a previsão de término.');

    setSaving(true);
    setError('');
    try {
      await onCreate({
        vessel_id: Number(form.vessel_id),
        service_type: form.service_type.trim(),
        start_date: form.start_date,
        end_date_expected: form.end_date_expected,
        departure_hub: form.departure_hub.trim() || null,
        transport_type: form.transport_type || null,
        notes: form.notes.trim() || null,
      });
    } catch (err) {
      setError('Erro ao criar embarque. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Novo Embarque" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Embarcação */}
        <div style={row()}>
          <span style={label()}>Embarcação *</span>
          <select
            style={field()}
            value={form.vessel_id}
            onChange={(e) => set('vessel_id', e.target.value)}
          >
            <option value="">Selecionar embarcação...</option>
            {vessels.map((v) => (
              <option key={v.id} value={v.id}>{v.name}{v.type ? ` — ${v.type}` : ''}</option>
            ))}
          </select>
        </div>

        {/* Tipo de serviço */}
        <div style={row()}>
          <span style={label()}>Tipo de Serviço *</span>
          <input
            style={field()}
            value={form.service_type}
            onChange={(e) => set('service_type', e.target.value)}
            placeholder="Ex.: Inspeção, Manutenção, Instalação..."
          />
        </div>

        {/* Datas */}
        <div style={grid2}>
          <div style={row()}>
            <span style={label()}>Início *</span>
            <input type="date" style={field()} value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div style={row()}>
            <span style={label()}>Previsão de Término *</span>
            <input type="date" style={field()} value={form.end_date_expected} onChange={(e) => set('end_date_expected', e.target.value)} />
          </div>
        </div>

        {/* Hub de saída + Transporte */}
        <div style={grid2}>
          <div style={row()}>
            <span style={label()}>Base de Saída</span>
            <input
              style={field()}
              value={form.departure_hub}
              onChange={(e) => set('departure_hub', e.target.value)}
              placeholder="Ex.: Macaé, RJ"
            />
          </div>
          <div style={row()}>
            <span style={label()}>Tipo de Transporte</span>
            <select style={field()} value={form.transport_type} onChange={(e) => set('transport_type', e.target.value)}>
              {TRANSPORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Observações */}
        <div style={row()}>
          <span style={label()}>Observações</span>
          <textarea
            style={field({ minHeight: 60, resize: 'vertical', lineHeight: '1.4' })}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Informações adicionais sobre o embarque..."
          />
        </div>

        {/* Erro */}
        {error && (
          <div style={{
            background: 'var(--red-bg)', border: '1px solid var(--red-dim)',
            borderRadius: '5px', padding: '8px 10px',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--red)',
          }}>
            {error}
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: '5px',
              padding: '6px 14px', cursor: 'pointer', color: 'var(--muted)',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              background: 'var(--accent)', border: 'none', borderRadius: '5px',
              padding: '6px 16px', cursor: saving ? 'not-allowed' : 'pointer',
              color: '#fff', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              fontWeight: 600, opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Criando...' : 'Criar Embarque'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
