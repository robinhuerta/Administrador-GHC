import { useState } from 'react';
import Modal from '../components/Modal';

const FORM_EMPTY = { date: '', description: '', type: 'Egreso', amount: '' };

export default function CajaChicaView({ cajaChica, addCajaChica, deleteCajaChica, updateCajaChica, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [sortOrder, setSortOrder] = useState('asc');

  const filtered = cajaChica.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (item.description && item.description.toLowerCase().includes(q));
    const matchDate = !dateFilter || item.date === dateFilter;
    return matchSearch && matchDate;
  });

  const openNew = () => { setEditingId(null); setForm(FORM_EMPTY); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm(item); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { date: form.date, description: form.description, type: form.type, amount: parseFloat(form.amount) };
    if (editingId) updateCajaChica(editingId, data); else addCajaChica(data);
    handleClose();
    setForm(FORM_EMPTY);
  };

  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'asc' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')
  );

  const totalIngresos = filtered.reduce((a, c) => c.type === 'Ingreso' ? a + (parseFloat(c.amount) || 0) : a, 0);
  const totalEgresos = filtered.reduce((a, c) => c.type === 'Egreso' ? a + (parseFloat(c.amount) || 0) : a, 0);

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <h1>Caja Chica</h1>
          <p className="text-muted">Registro de ingresos y gastos diarios menores.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filtered, 'CajaChica')}>📊 Exportar Excel</button>
          <button className="btn btn-primary" onClick={openNew}>Registrar Movimiento</button>
        </div>
      </header>

      {/* Resumen rápido */}
      <div className="stats-grid" style={{ marginBottom: '12px' }}>
        <div className="glass-panel stat-card"><span className="text-muted">Total Entradas</span><span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#34d399' }}>{formatCurrency(totalIngresos)}</span></div>
        <div className="glass-panel stat-card"><span className="text-muted">Total Salidas</span><span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(totalEgresos)}</span></div>
        <div className="glass-panel stat-card"><span className="text-muted">Saldo</span><span style={{ fontSize: '1.3rem', fontWeight: 700, color: totalIngresos - totalEgresos >= 0 ? '#34d399' : '#ef4444' }}>{formatCurrency(totalIngresos - totalEgresos)}</span></div>
      </div>

      <div className="glass-panel table-container">
        {filtered.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p>
          : (
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>Fecha {sortOrder === 'asc' ? '↑' : '↓'}</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Ingreso (S/.)</th>
                  <th style={{ textAlign: 'right' }}>Egreso (S/.)</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{c.date}</td>
                    <td style={{ fontWeight: 500 }}>{c.description}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>
                      {c.type === 'Ingreso' ? `+ ${formatCurrency(c.amount)}` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                      {c.type === 'Egreso' ? `- ${formatCurrency(c.amount)}` : '-'}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} title="Editar" onClick={() => openEdit(c)}>✎</button>
                      {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deleteCajaChica(c.id)}>🗑</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ textAlign: 'right', paddingRight: '12px' }}>TOTALES FILTRADOS:</td>
                  <td style={{ color: '#34d399', textAlign: 'right' }}>{formatCurrency(totalIngresos)}</td>
                  <td style={{ color: '#ef4444', textAlign: 'right' }}>{formatCurrency(totalEgresos)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="form-group">
              <label>Tipo de Movimiento</label>
              <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="Egreso">Egreso (Gasto)</option>
                <option value="Ingreso">Ingreso (Fondo)</option>
              </select>
            </div>
          </div>
          <div className="form-group"><label>Descripción / Motivo</label><input type="text" className="form-control" placeholder="Ej. Pasajes Gamarra" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
          <div className="form-group"><label>Monto (S/.)</label><input type="number" step="0.10" className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="modal-footer">
            <button type="button" className="btn btn-danger" onClick={handleClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
