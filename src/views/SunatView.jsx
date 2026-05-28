import { useState } from 'react';
import Modal from '../components/Modal';

const FORM_EMPTY = { date: '', description: '', total: '', paidAmount: '', paymentDate: '' };

export default function SunatView({ sunat, addSunat, deleteSunat, updateSunat, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  const filtered = sunat.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (item.description && item.description.toLowerCase().includes(q));
    const matchDate = !dateFilter || item.date === dateFilter || item.paymentDate === dateFilter;
    return matchSearch && matchDate;
  });

  const openNew = () => { setEditingId(null); setForm(FORM_EMPTY); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm(item); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { date: form.date, description: form.description, total: parseFloat(form.total) || 0, paidAmount: parseFloat(form.paidAmount) || 0, paymentDate: form.paymentDate };
    if (editingId) updateSunat(editingId, data); else addSunat(data);
    handleClose();
    setForm(FORM_EMPTY);
  };

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <h1>Contador y SUNAT</h1>
          <p className="text-muted">Control de honorarios, impuestos y fraccionamientos.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filtered, 'Sunat')}>📊 Exportar Excel</button>
          <button className="btn btn-primary" onClick={openNew}>Registrar Impuesto / Honorario</button>
        </div>
      </header>

      <div className="glass-panel table-container">
        {filtered.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p>
          : (
            <table style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Fecha</th><th>Descripción / Concepto</th><th>Deuda Total</th>
                  <th>Pagado / Adelanto</th><th>Saldo</th><th>Fecha de Pago</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const saldo = s.total - s.paidAmount;
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{s.date || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{s.description}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(s.total)}</td>
                      <td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(s.paidAmount)}</td>
                      <td>
                        <span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239,68,68,0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{s.paymentDate || '-'}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} title="Editar" onClick={() => openEdit(s)}>✎</button>
                        {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deleteSunat(s.id)}>🗑</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ textAlign: 'right', paddingRight: '12px' }}>TOTALES FILTRADOS:</td>
                  <td style={{ color: 'var(--text-main)' }}>{formatCurrency(filtered.reduce((a, c) => a + (parseFloat(c.total) || 0), 0))}</td>
                  <td style={{ color: '#34d399' }}>{formatCurrency(filtered.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0))}</td>
                  <td style={{ color: '#ef4444' }}>{formatCurrency(filtered.reduce((a, c) => a + ((parseFloat(c.total) || 0) - (parseFloat(c.paidAmount) || 0)), 0))}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar SUNAT' : 'Registrar SUNAT'}>
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
          <div className="form-group"><label>Descripción / Concepto</label><input type="text" className="form-control" placeholder="Ej. HONORARIO ENERO" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
          <div className="form-group"><label>Deuda Total (S/.)</label><input type="number" step="0.10" className="form-control" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} required /></div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado (S/.)</label><input type="number" step="0.10" className="form-control" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} /></div>
            <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-danger" onClick={handleClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
