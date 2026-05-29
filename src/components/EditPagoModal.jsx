import { useState, useEffect } from 'react';
import Modal from './Modal';

export default function EditPagoModal({ pago, onClose, updatePago }) {
  const [form, setForm] = useState({ date: '', amount: '', concept: '', paymentType: 'EFECTIVO', bank: '' });

  useEffect(() => {
    if (pago) setForm({
      date: pago.date || '',
      amount: pago.amount || '',
      concept: pago.concept || '',
      paymentType: pago.paymentType || 'EFECTIVO',
      bank: pago.bank || '',
    });
  }, [pago]);

  const handleSubmit = (e) => {
    e.preventDefault();
    updatePago(pago.id, { ...form, amount: parseFloat(form.amount) || 0 });
    onClose();
  };

  return (
    <Modal isOpen={!!pago} onClose={onClose} title="Editar Pago">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Monto (S/.)</label>
            <input type="number" step="0.10" className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
          </div>
        </div>
        <div className="form-group">
          <label>Concepto</label>
          <input type="text" className="form-control" placeholder="Opcional" value={form.concept} onChange={e => setForm({ ...form, concept: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Tipo de Pago</label>
            <select className="form-control" value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value })}>
              <option value="EFECTIVO">EFECTIVO</option>
              <option value="TRANSFERENCIA">TRANSFERENCIA</option>
              <option value="DEPOSITO">DEPÓSITO</option>
              <option value="WESTER">WESTER UNION</option>
            </select>
          </div>
          <div className="form-group">
            <label>Banco</label>
            <select className="form-control" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}>
              <option value="">Ninguno</option>
              <option value="BCP">BCP</option>
              <option value="BBVA">BBVA</option>
              <option value="INTERBANK">INTERBANK</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-danger" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary">Actualizar</button>
        </div>
      </form>
    </Modal>
  );
}
