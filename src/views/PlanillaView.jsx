import { useState } from 'react';
import Modal from '../components/Modal';

const FORM_EMPTY = { name: '', periodFrom: '', periodTo: '', hours: '', total: '', paidAmount: '', paymentDate: '' };

export default function PlanillaView({ planilla, addPlanilla, deletePlanilla, updatePlanilla, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  // Agrupamos todos los registros por nombre de trabajador
  const workerMap = planilla.reduce((acc, item) => {
    const name = item.name;
    if (!acc[name]) acc[name] = { name, totalHours: 0, totalEarned: 0, totalPaid: 0, count: 0 };
    acc[name].totalHours += parseFloat(item.hours) || 0;
    acc[name].totalEarned += parseFloat(item.total) || 0;
    acc[name].totalPaid += parseFloat(item.paidAmount) || 0;
    acc[name].count += 1;
    return acc;
  }, {});

  const allWorkers = Object.values(workerMap);

  // Filtro para la vista maestra (buscar por nombre)
  const filteredWorkers = allWorkers.filter(w =>
    !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Registros del trabajador seleccionado con filtros
  const workerRecords = selectedWorker
    ? planilla.filter(p => {
        if (p.name !== selectedWorker) return false;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || (p.name && p.name.toLowerCase().includes(q));
        const matchDate = !dateFilter || p.periodFrom === dateFilter || p.paymentDate === dateFilter;
        return matchSearch && matchDate;
      })
    : [];

  const openNew = () => {
    setEditingId(null);
    setForm({ ...FORM_EMPTY, name: selectedWorker || '' });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm(item);
    setIsModalOpen(true);
  };

  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      name: form.name,
      periodFrom: form.periodFrom,
      periodTo: form.periodTo,
      hours: parseFloat(form.hours) || 0,
      total: parseFloat(form.total) || 0,
      paidAmount: parseFloat(form.paidAmount) || 0,
      paymentDate: form.paymentDate
    };
    if (editingId) updatePlanilla(editingId, data); else addPlanilla(data);
    handleClose();
    setForm(FORM_EMPTY);
  };

  // ---- VISTA MAESTRA: tarjetas de trabajadores ----
  if (!selectedWorker) {
    return (
      <div className="fade-in">
        <header className="header">
          <div>
            <h1>Planilla de Personal</h1>
            <p className="text-muted">Selecciona un trabajador para ver su historial de períodos.</p>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo Registro</button>
        </header>

        {filteredWorkers.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>No hay registros de planilla aún.</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredWorkers.map(w => {
                const saldo = w.totalEarned - w.totalPaid;
                const alDia = saldo <= 0;
                return (
                  <div
                    key={w.name}
                    className="glass-panel"
                    style={{ padding: '20px', cursor: 'pointer', borderLeft: `4px solid ${alDia ? '#34d399' : '#f59e0b'}`, transition: 'transform 0.15s' }}
                    onClick={() => setSelectedWorker(w.name)}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>👤 {w.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '2px 10px', borderRadius: '12px' }}>
                        {w.count} período{w.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Horas totales</div>
                        <div style={{ fontWeight: 600 }}>{w.totalHours.toFixed(2)} h</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Total ganado</div>
                        <div style={{ fontWeight: 600 }}>{formatCurrency(w.totalEarned)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Pagado</div>
                        <div style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(w.totalPaid)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Saldo pendiente</div>
                        <div style={{ fontWeight: 700, color: alDia ? '#34d399' : '#f59e0b' }}>
                          {alDia ? 'Al día ✓' : formatCurrency(saldo)}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '14px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--accent)' }}>
                      Ver historial →
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }

        <Modal isOpen={isModalOpen} onClose={handleClose} title="Nuevo Registro de Planilla">
          <PlanillaForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showName />
        </Modal>
      </div>
    );
  }

  // ---- VISTA DETALLE: historial del trabajador seleccionado ----
  const summary = workerMap[selectedWorker] || { totalHours: 0, totalEarned: 0, totalPaid: 0 };
  const saldoTotal = summary.totalEarned - summary.totalPaid;

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <button
            onClick={() => setSelectedWorker(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '6px', padding: 0 }}
          >
            ← Volver a Personal
          </button>
          <h1>Planilla: {selectedWorker}</h1>
          <p className="text-muted">Historial de períodos trabajados y pagos.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(workerRecords, `Planilla_${selectedWorker}`)}>📊 Exportar</button>
          <button className="btn btn-primary" onClick={openNew}>+ Registrar Período</button>
        </div>
      </header>

      {/* Resumen del trabajador */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="glass-panel stat-card">
          <span className="text-muted">Total Horas</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.totalHours.toFixed(2)} h</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="text-muted">Total Ganado</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(summary.totalEarned)}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="text-muted">Total Pagado</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399' }}>{formatCurrency(summary.totalPaid)}</span>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: `4px solid ${saldoTotal > 0 ? '#f59e0b' : '#34d399'}` }}>
          <span className="text-muted">Saldo Pendiente</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: saldoTotal > 0 ? '#f59e0b' : '#34d399' }}>
            {saldoTotal > 0 ? formatCurrency(saldoTotal) : 'Al día ✓'}
          </span>
        </div>
      </div>

      {/* Tabla de períodos */}
      <div className="glass-panel table-container">
        {workerRecords.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p>
          : (
            <table style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Período Desde</th><th>Período Hasta</th><th>Horas</th>
                  <th>Total Ganado</th><th>Pagado / Adelanto</th><th>Saldo</th>
                  <th>Fecha Pago</th><th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {workerRecords.map(p => {
                  const saldo = p.total - p.paidAmount;
                  return (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{p.periodFrom || '-'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.periodTo || '-'}</td>
                      <td style={{ fontWeight: 500 }}>{p.hours || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(p.total)}</td>
                      <td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(p.paidAmount)}</td>
                      <td>
                        <span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239,68,68,0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.paymentDate || '-'}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} title="Editar" onClick={() => openEdit(p)}>✎</button>
                        {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deletePlanilla(p.id)}>🗑</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.2)', fontWeight: 'bold' }}>
                  <td colSpan="2" style={{ textAlign: 'right', paddingRight: '12px' }}>TOTALES:</td>
                  <td>{workerRecords.reduce((a, c) => a + (parseFloat(c.hours) || 0), 0).toFixed(2)} h</td>
                  <td style={{ color: 'var(--text-main)' }}>{formatCurrency(workerRecords.reduce((a, c) => a + (parseFloat(c.total) || 0), 0))}</td>
                  <td style={{ color: '#34d399' }}>{formatCurrency(workerRecords.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0))}</td>
                  <td style={{ color: '#ef4444' }}>{formatCurrency(workerRecords.reduce((a, c) => a + ((parseFloat(c.total) || 0) - (parseFloat(c.paidAmount) || 0)), 0))}</td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar Planilla' : `Registrar Período — ${selectedWorker}`}>
        <PlanillaForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showName={false} />
      </Modal>
    </div>
  );
}

function PlanillaForm({ form, setForm, onSubmit, onCancel, editingId, showName }) {
  return (
    <form onSubmit={onSubmit}>
      {showName && (
        <div className="form-group">
          <label>Nombre del Trabajador</label>
          <input type="text" className="form-control" placeholder="Ej. ANNGELA" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Desde</label><input type="date" className="form-control" value={form.periodFrom} onChange={e => setForm({ ...form, periodFrom: e.target.value })} required /></div>
        <div className="form-group"><label>Hasta</label><input type="date" className="form-control" value={form.periodTo} onChange={e => setForm({ ...form, periodTo: e.target.value })} required /></div>
        <div className="form-group"><label>Horas</label><input type="number" step="0.01" className="form-control" placeholder="Ej. 51.44" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} required /></div>
      </div>
      <div className="form-group">
        <label>Total a Pagar (S/.)</label>
        <input type="number" step="0.10" className="form-control" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} required />
      </div>
      <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Monto Pagado / Adelanto (S/.)</label><input type="number" step="0.10" className="form-control" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} /></div>
        <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} /></div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-danger" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>
  );
}
