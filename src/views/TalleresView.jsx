import { useState } from 'react';
import Modal from '../components/Modal';

const TITLES = {
  Corte:    { title: 'Producción: Corte',              desc: 'Control de lotes y saldo del cortador.' },
  Costura:  { title: 'Producción: Costura (Confección)', desc: 'Control de lotes entregados a talleres externos.' },
  Bordado:  { title: 'Producción: Bordados',            desc: 'Control de lotes entregados a bordadores.' },
  Servicio: { title: 'Otros Servicios',                 desc: 'Lavado, planchado u otros servicios externos.' },
};

export default function TalleresView({ type, lotes, addTaller, deleteTaller, updateTaller, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter, providerFilter, defaultProvider }) {
  const emptyForm = { style: '', date: '', code: '', quantity: '', provider: defaultProvider || '', unitPrice: '', paidAmount: '', paymentDate: '' };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { title: baseTitle, desc: baseDesc } = TITLES[type];
  const title = providerFilter ? `${baseTitle}: ${providerFilter}` : baseTitle;
  const desc = providerFilter ? `Lotes del bordador ${providerFilter}.` : baseDesc;

  // Si hay filtro de proveedor, pre-filtramos antes de aplicar búsqueda/fecha
  const lotesFiltradosPorProveedor = providerFilter
    ? lotes.filter(t => t.provider && t.provider.toUpperCase() === providerFilter.toUpperCase())
    : lotes;

  const filtered = lotesFiltradosPorProveedor.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      (item.style && item.style.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.provider && item.provider.toLowerCase().includes(q));
    const matchDate = !dateFilter || item.date === dateFilter || item.paymentDate === dateFilter;
    return matchSearch && matchDate;
  });

  const openNew = () => { setEditingId(null); setForm(emptyForm); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm(item); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.unitPrice) || 0;
    const data = {
      type, date: form.date, code: form.code, style: form.style,
      quantity: qty, provider: form.provider, unitPrice: price,
      totalCost: qty * price, paidAmount: parseFloat(form.paidAmount) || 0,
      paymentDate: form.paymentDate
    };
    if (editingId) updateTaller(editingId, data); else addTaller(data);
    handleClose();
    setForm(emptyForm);
  };

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <h1>{title}</h1>
          <p className="text-muted">{desc}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filtered, type)}>📊 Exportar Excel</button>
          <button className="btn btn-primary" onClick={openNew}>Registrar Lote</button>
        </div>
      </header>

      <div className="glass-panel table-container">
        {filtered.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p>
          : (
            <table style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Estilo / Nombre</th><th>Fecha</th><th>Lote / Código</th><th>Cant.</th>
                  <th>Responsable / Taller</th><th>P. Unit</th><th>Total (Costo)</th>
                  <th>Pago / Adelanto</th><th>Fecha Pago</th><th>Resta (Saldo)</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const saldo = t.totalCost - t.paidAmount;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{t.style}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{t.date}</td>
                      <td style={{ fontWeight: 600 }}>{t.code}</td>
                      <td>{t.quantity}</td>
                      <td style={{ fontWeight: 600, color: '#60a5fa' }}>{t.provider}</td>
                      <td>{formatCurrency(t.unitPrice)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(t.totalCost)}</td>
                      <td style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(t.paidAmount)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{t.paymentDate || '-'}</td>
                      <td>
                        <span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239,68,68,0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {saldo === 0 ? 'S/. 0.00' : saldo > 0 ? formatCurrency(saldo) : `-${formatCurrency(Math.abs(saldo))}`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} title="Editar" onClick={() => openEdit(t)}>✎</button>
                        {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deleteTaller(t.id)}>🗑</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
                  <td colSpan="6" style={{ textAlign: 'right', paddingRight: '12px' }}>TOTALES FILTRADOS:</td>
                  <td style={{ color: 'var(--text-main)' }}>{formatCurrency(filtered.reduce((a, c) => a + (parseFloat(c.totalCost) || 0), 0))}</td>
                  <td style={{ color: '#34d399' }}>{formatCurrency(filtered.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0))}</td>
                  <td></td>
                  <td style={{ color: '#ef4444' }}>{formatCurrency(filtered.reduce((a, c) => a + ((parseFloat(c.totalCost) || 0) - (parseFloat(c.paidAmount) || 0)), 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? `Editar — ${type}` : `Registrar — ${type}`}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Estilo / Nombre</label><input type="text" className="form-control" placeholder="Ej. CURVO" value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} required /></div>
            <div className="form-group"><label>Lote / Código</label><input type="text" className="form-control" placeholder="Ej. M03" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="form-group">
              <label>{type === 'Corte' ? 'Taller Entregado' : 'Responsable / Taller'}</label>
              <input type="text" className="form-control" placeholder="Ej. MILY" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} required />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Cantidad</label><input type="number" className="form-control" placeholder="300" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required /></div>
            <div className="form-group"><label>Precio Unitario (S/.)</label><input type="number" step="0.01" className="form-control" placeholder="0.5" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} required /></div>
          </div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado / Adelanto</label><input type="number" step="0.10" className="form-control" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} /></div>
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
