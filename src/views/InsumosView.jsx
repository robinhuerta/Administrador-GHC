import { useState } from 'react';
import Modal from '../components/Modal';

const FORM_EMPTY = { date: '', provider: '', invoice: '', totalCost: '', paidAmount: '', paymentDate: '' };

export default function InsumosView({ insumos, addInsumo, deleteInsumo, updateInsumo, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  const filtered = insumos.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (item.provider && item.provider.toLowerCase().includes(q)) ||
      (item.invoice && item.invoice.toLowerCase().includes(q));
    const matchDate = !dateFilter || item.date === dateFilter || item.paymentDate === dateFilter;
    return matchSearch && matchDate;
  });

  const openNew = () => { setEditingId(null); setForm(FORM_EMPTY); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm(item); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { date: form.date, provider: form.provider, invoice: form.invoice, totalCost: parseFloat(form.totalCost) || 0, paidAmount: parseFloat(form.paidAmount) || 0, paymentDate: form.paymentDate };
    if (editingId) updateInsumo(editingId, data); else addInsumo(data);
    handleClose();
    setForm(FORM_EMPTY);
  };

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <h1>Compras a Crédito (Insumos)</h1>
          <p className="text-muted">Control de telas, avíos y deudas con proveedores (Ej. MASVAL).</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filtered, 'Insumos')}>📊 Exportar Excel</button>
          <button className="btn btn-primary" onClick={openNew}>Registrar Compra / Pago</button>
        </div>
      </header>

      <div className="glass-panel table-container">
        {filtered.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p>
          : (
            <table>
              <thead>
                <tr>
                  <th>Fecha Compra</th><th>Proveedor / Nombre</th><th>Descripción / Factura</th>
                  <th>Total Deuda</th><th>Adelanto / Pagado</th><th>Saldo</th>
                  <th>Fecha de Pago</th><th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const saldo = i.totalCost - i.paidAmount;
                  return (
                    <tr key={i.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i.date}</td>
                      <td style={{ fontWeight: 600 }}>{i.provider}</td>
                      <td style={{ fontWeight: 500 }}>{i.invoice}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(i.totalCost)}</td>
                      <td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(i.paidAmount)}</td>
                      <td>
                        <span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239,68,68,0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{i.paymentDate || '-'}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} title="Editar" onClick={() => openEdit(i)}>✎</button>
                        {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deleteInsumo(i.id)}>🗑</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
                  <td colSpan="3" style={{ textAlign: 'right', paddingRight: '12px' }}>TOTALES FILTRADOS:</td>
                  <td style={{ color: 'var(--text-main)' }}>{formatCurrency(filtered.reduce((a, c) => a + (parseFloat(c.totalCost) || 0), 0))}</td>
                  <td style={{ color: '#34d399' }}>{formatCurrency(filtered.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0))}</td>
                  <td style={{ color: '#ef4444' }}>{formatCurrency(filtered.reduce((a, c) => a + ((parseFloat(c.totalCost) || 0) - (parseFloat(c.paidAmount) || 0)), 0))}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar Insumo' : 'Registrar Insumo'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Fecha de Compra</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="form-group"><label>Proveedor / Nombre</label><input type="text" className="form-control" placeholder="Ej. MASVAL" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} required /></div>
          </div>
          <div className="form-group"><label>Descripción / Factura</label><input type="text" className="form-control" placeholder="Ej. FA04-5189" value={form.invoice} onChange={e => setForm({ ...form, invoice: e.target.value })} required /></div>
          <div className="form-group"><label>Total Deuda (S/.)</label><input type="number" step="0.10" className="form-control" value={form.totalCost} onChange={e => setForm({ ...form, totalCost: e.target.value })} required /></div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado / Adelanto (S/.)</label><input type="number" step="0.10" className="form-control" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} /></div>
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
