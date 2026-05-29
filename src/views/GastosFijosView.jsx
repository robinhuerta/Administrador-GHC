import { useState } from 'react';
import Modal from '../components/Modal';

const CATEGORIAS = ['Alquiler', 'Agua', 'Luz', 'Internet', 'Teléfono', 'Limpieza', 'Otro'];
const FORM_EMPTY = { date: '', category: 'Alquiler', description: '', amount: '' };

export default function GastosFijosView({ gastos, addGasto, deleteGasto, updateGasto, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [sortOrder, setSortOrder] = useState('desc');

  const filtered = gastos.filter(g => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || (g.description && g.description.toLowerCase().includes(q)) || (g.category && g.category.toLowerCase().includes(q));
    const matchDate = !dateFilter || g.date === dateFilter;
    return matchSearch && matchDate;
  });

  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'asc' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')
  );

  const totalGastos = filtered.reduce((a, g) => a + (parseFloat(g.amount) || 0), 0);

  // Agrupar por categoría
  const porCategoria = filtered.reduce((acc, g) => {
    const cat = g.category || 'Otro';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += parseFloat(g.amount) || 0;
    return acc;
  }, {});

  const openNew  = () => { setEditingId(null); setForm(FORM_EMPTY); setIsModalOpen(true); };
  const openEdit = (g) => { setEditingId(g.id); setForm(g); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { date: form.date, category: form.category, description: form.description, amount: parseFloat(form.amount) || 0 };
    if (editingId) updateGasto(editingId, data); else addGasto(data);
    handleClose();
    setForm(FORM_EMPTY);
  };

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <h1>Gastos Fijos</h1>
          <p className="text-muted">Alquiler, agua, luz, internet y otros gastos recurrentes.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filtered, 'GastosFijos')}>📊 Exportar</button>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo Gasto</button>
        </div>
      </header>

      {/* Resumen */}
      <div className="stats-grid" style={{ marginBottom: '12px' }}>
        <div className="glass-panel stat-card"><span className="text-muted">Total Gastos</span><span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(totalGastos)}</span></div>
        {Object.entries(porCategoria).sort((a,b) => b[1]-a[1]).slice(0,2).map(([cat, val]) => (
          <div key={cat} className="glass-panel stat-card"><span className="text-muted">{cat}</span><span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatCurrency(val)}</span></div>
        ))}
      </div>

      <div className="glass-panel table-container">
        {filtered.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay gastos registrados.</p>
          : (
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>Fecha {sortOrder === 'asc' ? '↑' : '↓'}</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Monto (S/.)</th>
                  <th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(g => (
                  <tr key={g.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{g.date}</td>
                    <td><span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.82rem' }}>{g.category}</span></td>
                    <td style={{ fontWeight: 500 }}>{g.description || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>- {formatCurrency(g.amount)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} title="Editar" onClick={() => openEdit(g)}>✎</button>
                      {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deleteGasto(g.id)}>🗑</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
                  <td colSpan="3" style={{ textAlign: 'right', paddingRight: '12px' }}>TOTAL:</td>
                  <td style={{ color: '#ef4444', textAlign: 'right' }}>{formatCurrency(totalGastos)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar Gasto' : 'Nuevo Gasto Fijo'}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="form-group">
              <label>Categoría</label>
              <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label>Descripción (opcional)</label><input type="text" className="form-control" placeholder="Ej. Agua marzo 2026" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div className="form-group"><label>Monto (S/.)</label><input type="number" step="0.01" className="form-control" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="modal-footer">
            <button type="button" className="btn btn-danger" onClick={handleClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
