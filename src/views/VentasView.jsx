import { useState } from 'react';
import Modal from '../components/Modal';

const FORM_EMPTY = { date: '', code: '', client: '', model: '', responsible: '', quantity: '', price: '', paidAmount: '', paymentType: 'EFECTIVO', bank: '', paymentDate: '' };

export default function VentasView({ ventas, addVenta, deleteVenta, updateVenta, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  const filtered = ventas.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (item.client && item.client.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.model && item.model.toLowerCase().includes(q)) ||
      (item.responsible && item.responsible.toLowerCase().includes(q));
    const matchDate = !dateFilter || item.date === dateFilter || item.paymentDate === dateFilter;
    return matchSearch && matchDate;
  });

  const openNew = () => { setEditingId(null); setForm(FORM_EMPTY); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm(item); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.price) || 0;
    const data = {
      date: form.date, code: form.code, client: form.client, model: form.model,
      responsible: form.responsible, quantity: qty, price, totalValue: qty * price,
      paidAmount: parseFloat(form.paidAmount) || 0, paymentType: form.paymentType,
      bank: form.bank || '-', paymentDate: form.paymentDate
    };
    if (editingId) updateVenta(editingId, data); else addVenta(data);
    handleClose();
    setForm(FORM_EMPTY);
  };

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <h1>Entregas y Cobros a Clientes</h1>
          <p className="text-muted">Control de mercadería entregada a clientes y sus pagos a cuenta.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filtered, 'Cobros')}>📊 Exportar Excel</button>
          <button className="btn btn-primary" onClick={openNew}>Registrar Entrega / Cobro</button>
        </div>
      </header>

      <div className="glass-panel table-container">
        {filtered.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p>
          : (
            <table style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Fecha Entrega</th><th>Cód. / Modelo</th><th>Resp.</th><th>Cant.</th>
                  <th>Precio</th><th>Valor Total</th><th>A Cuenta</th><th>Tipo Pago</th>
                  <th>Cliente</th><th>Saldo</th><th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const saldo = v.totalValue - v.paidAmount;
                  return (
                    <tr key={v.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{v.date}</td>
                      <td style={{ fontWeight: 600 }}>{v.code}<br /><span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>{v.model}</span></td>
                      <td>{v.responsible}</td>
                      <td>{v.quantity}</td>
                      <td>{formatCurrency(v.price)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(v.totalValue)}</td>
                      <td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(v.paidAmount)}</td>
                      <td><span className="badge badge-blue">{v.paymentType}</span><br /><span style={{ fontSize: '0.7rem' }}>{v.bank}</span></td>
                      <td style={{ fontWeight: 500 }}>{v.client}</td>
                      <td>
                        <span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239,68,68,0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} title="Editar" onClick={() => openEdit(v)}>✎</button>
                        {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deleteVenta(v.id)}>🗑</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
                  <td colSpan="5" style={{ textAlign: 'right', paddingRight: '12px' }}>TOTALES FILTRADOS:</td>
                  <td style={{ color: 'var(--text-main)' }}>{formatCurrency(filtered.reduce((a, c) => a + (parseFloat(c.totalValue) || 0), 0))}</td>
                  <td style={{ color: '#34d399' }}>{formatCurrency(filtered.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0))}</td>
                  <td colSpan="2"></td>
                  <td style={{ color: '#ef4444' }}>{formatCurrency(filtered.reduce((a, c) => a + ((parseFloat(c.totalValue) || 0) - (parseFloat(c.paidAmount) || 0)), 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar Entrega / Cobro' : 'Registrar Entrega / Cobro'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Fecha de Entrega</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="form-group"><label>Código de Pedido</label><input type="text" className="form-control" placeholder="Ej. M09" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Modelo / Gorra</label><input type="text" className="form-control" placeholder="Ej. CURVO" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required /></div>
            <div className="form-group"><label>Cliente</label><input type="text" className="form-control" placeholder="Ej. JHONY" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Responsable</label><input type="text" className="form-control" placeholder="Ej. MILY" value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
            <div className="form-group"><label>Cantidad</label><input type="number" className="form-control" placeholder="300" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required /></div>
            <div className="form-group"><label>Precio Venta</label><input type="number" step="0.10" className="form-control" placeholder="20.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></div>
          </div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado (A Cuenta)</label><input type="number" step="0.10" className="form-control" placeholder="S/." value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} /></div>
            <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Tipo de Pago</label>
              <select className="form-control" value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value })}>
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="WESTER">WESTER UNION</option>
              </select>
            </div>
            <div className="form-group">
              <label>Banco (Opcional)</label>
              <select className="form-control" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })}>
                <option value="">Ninguno</option>
                <option value="BCP">BCP</option>
                <option value="BBVA">BBVA</option>
                <option value="INTERBANK">INTERBANK</option>
              </select>
            </div>
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
