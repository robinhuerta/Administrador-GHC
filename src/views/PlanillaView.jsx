import { useState } from 'react';
import Modal from '../components/Modal';
import PaymentModal from '../components/PaymentModal';
import EditPagoModal from '../components/EditPagoModal';

const FORM_EMPTY = { name: '', periodFrom: '', periodTo: '', hours: '', total: '', paidAmount: '', paymentDate: '' };

export default function PlanillaView({ planilla, addPlanilla, deletePlanilla, updatePlanilla, pagos = [], addPago, deletePago, updatePago, isAdmin, formatCurrency, exportToCSV, searchQuery }) {
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingPago, setEditingPago] = useState(null);

  // Agrupar por trabajador
  const workerMap = planilla.reduce((acc, item) => {
    const name = item.name;
    if (!acc[name]) acc[name] = { name, totalEarned: 0, totalHours: 0, count: 0 };
    acc[name].totalEarned += parseFloat(item.total) || 0;
    acc[name].totalHours += parseFloat(item.hours) || 0;
    acc[name].count += 1;
    return acc;
  }, {});

  // Pagos de planilla agrupados por trabajador (de ghc_pagos)
  const pagosPorWorker = pagos.reduce((acc, p) => {
    if (p.tallerType !== 'Planilla') return acc;
    if (!acc[p.beneficiary]) acc[p.beneficiary] = 0;
    acc[p.beneficiary] += parseFloat(p.amount) || 0;
    return acc;
  }, {});

  const workerList = Object.values(workerMap).map(w => ({
    ...w,
    totalPagado: pagosPorWorker[w.name] || 0,
  }));

  const filteredWorkers = workerList.filter(w =>
    !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Períodos del trabajador seleccionado
  const workerPeriodos = selectedWorker
    ? planilla.filter(p => p.name === selectedWorker).sort((a, b) => b.createdAt - a.createdAt)
    : [];

  // Pagos del trabajador seleccionado (de ghc_pagos)
  const workerPagos = selectedWorker
    ? pagos.filter(p => p.beneficiary === selectedWorker && p.tallerType === 'Planilla')
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const sortedPeriodos = [...workerPeriodos].sort((a, b) =>
    sortOrder === 'asc' ? (a.periodFrom || '').localeCompare(b.periodFrom || '') : (b.periodFrom || '').localeCompare(a.periodFrom || '')
  );
  const sortedWorkerPagos = [...workerPagos].sort((a, b) =>
    sortOrder === 'asc' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')
  );

  const totalTrabajo = workerPeriodos.reduce((a, c) => a + (parseFloat(c.total) || 0), 0);
  const totalPagado = workerPagos.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0);
  const totalHoras = workerPeriodos.reduce((a, c) => a + (parseFloat(c.hours) || 0), 0);
  const saldo = totalTrabajo - totalPagado;

  const openNew = () => { setEditingId(null); setForm({ ...FORM_EMPTY, name: selectedWorker || '' }); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm(item); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { name: form.name, periodFrom: form.periodFrom, periodTo: form.periodTo, hours: parseFloat(form.hours) || 0, total: parseFloat(form.total) || 0, paidAmount: 0, paymentDate: '' };
    if (editingId) updatePlanilla(editingId, data); else addPlanilla(data);
    handleClose();
    setForm(FORM_EMPTY);
  };

  // ---- VISTA MAESTRA: tarjetas de trabajadores ----
  if (!selectedWorker) {
    return (
      <div className="fade-in">
        <header className="header">
          <div><h1>Planilla de Personal</h1><p className="text-muted">Selecciona un trabajador para ver su cuaderno.</p></div>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo Registro</button>
        </header>

        {filteredWorkers.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>No hay registros de planilla aún.</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredWorkers.map(w => {
                const saldoCard = w.totalEarned - w.totalPagado;
                const alDia = saldoCard <= 0;
                return (
                  <div key={w.name} className="glass-panel"
                    style={{ padding: '20px', cursor: 'pointer', borderLeft: `4px solid ${alDia ? '#34d399' : '#f59e0b'}`, transition: 'transform 0.15s' }}
                    onClick={() => setSelectedWorker(w.name)}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>👤 {w.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '2px 10px', borderRadius: '12px' }}>{w.count} período{w.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div><div style={{ color: 'var(--text-muted)' }}>Total ganado</div><div style={{ fontWeight: 600 }}>{formatCurrency(w.totalEarned)}</div></div>
                      <div><div style={{ color: 'var(--text-muted)' }}>Pagado</div><div style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(w.totalPagado)}</div></div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Saldo pendiente</div>
                        <div style={{ fontWeight: 700, color: alDia ? '#34d399' : '#f59e0b' }}>{alDia ? 'Al día ✓' : formatCurrency(saldoCard)}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '14px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--accent)' }}>Ver cuaderno →</div>
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

  // ---- VISTA CUADERNO: períodos (debe) + pagos (haber) ----
  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <button onClick={() => setSelectedWorker(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '6px', padding: 0 }}>
            ← Volver a Personal
          </button>
          <h1>👤 Planilla: {selectedWorker}</h1>
          <p className="text-muted">Cuaderno de horas trabajadas y pagos.</p>
        </div>
        <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(workerPeriodos, `Planilla_${selectedWorker}`)}>📊 Exportar</button>
      </header>

      {/* Resumen rápido */}
      <div className="stats-grid" style={{ marginBottom: '16px' }}>
        <div className="glass-panel stat-card"><span className="text-muted">Total Horas</span><span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{totalHoras.toFixed(2)} h</span></div>
        <div className="glass-panel stat-card"><span className="text-muted">Total Ganado</span><span style={{ fontSize: '1.3rem', fontWeight: 700 }}>{formatCurrency(totalTrabajo)}</span></div>
        <div className="glass-panel stat-card"><span className="text-muted">Total Pagado</span><span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#34d399' }}>{formatCurrency(totalPagado)}</span></div>
      </div>

      {/* Cuaderno: 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* DEBE — Períodos trabajados */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>📋 TRABAJO REALIZADO</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={openNew}>+ Período</button>
          </div>
          <table style={{ fontSize: '0.82rem', width: '100%' }}>
            <thead><tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>Período {sortOrder === 'asc' ? '↑' : '↓'}</th>
              <th>Horas</th><th>Total</th><th style={{ textAlign: 'center' }}>Acc.</th>
            </tr></thead>
            <tbody>
              {sortedPeriodos.length === 0
                ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin períodos aún</td></tr>
                : sortedPeriodos.map(p => (
                  <tr key={p.id}>
                    <td><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.periodFrom}</div><div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.periodTo}</div></td>
                    <td>{p.hours || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(p.total)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" style={{ color: '#60a5fa' }} title="Editar" onClick={() => openEdit(p)}>✎</button>
                      {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deletePlanilla(p.id)}>🗑</button>}
                    </td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(0,0,0,0.25)', fontWeight: 'bold' }}>
                <td style={{ textAlign: 'right', padding: '10px 12px' }}>TOTAL:</td>
                <td style={{ padding: '10px 0' }}>{totalHoras.toFixed(1)} h</td>
                <td style={{ color: 'var(--text-main)', padding: '10px 12px' }}>{formatCurrency(totalTrabajo)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* HABER — Pagos realizados */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#34d399' }}>💰 PAGOS REALIZADOS</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => setIsPaymentOpen(true)}>+ Pago</button>
          </div>
          <table style={{ fontSize: '0.82rem', width: '100%' }}>
            <thead><tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>Fecha {sortOrder === 'asc' ? '↑' : '↓'}</th>
              <th>Monto</th><th>Concepto</th>
            </tr></thead>
            <tbody>
              {sortedWorkerPagos.length === 0
                ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin pagos aún</td></tr>
                : sortedWorkerPagos.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{p.date}</td>
                    <td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(p.amount)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{p.concept || '—'}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" style={{ color: '#60a5fa' }} title="Editar" onClick={() => setEditingPago(p)}>✎</button>
                      {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deletePago(p.id)}>🗑</button>}
                    </td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(0,0,0,0.25)', fontWeight: 'bold' }}>
                <td style={{ textAlign: 'right', padding: '10px 12px' }}>TOTAL:</td>
                <td style={{ color: '#34d399', padding: '10px 12px' }}>{formatCurrency(totalPagado)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Saldo banner */}
      <div className="glass-panel" style={{ marginTop: '16px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${saldo > 0 ? '#f59e0b' : '#34d399'}` }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>SALDO PENDIENTE</span>
        <span style={{ fontWeight: 700, fontSize: '1.6rem', color: saldo > 0 ? '#f59e0b' : '#34d399' }}>
          {saldo > 0 ? formatCurrency(saldo) : 'Cancelado ✓'}
        </span>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar Planilla' : `Registrar Período — ${selectedWorker}`}>
        <PlanillaForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showName={false} />
      </Modal>

      <EditPagoModal pago={editingPago} onClose={() => setEditingPago(null)} updatePago={updatePago} />
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        beneficiary={selectedWorker}
        tallerType="Planilla"
        totalTrabajo={totalTrabajo}
        totalPagado={totalPagado}
        addPago={addPago}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function PlanillaForm({ form, setForm, onSubmit, onCancel, editingId, showName }) {
  return (
    <form onSubmit={onSubmit}>
      {showName && (
        <div className="form-group"><label>Nombre del Trabajador</label><input type="text" className="form-control" placeholder="Ej. ANNGELA" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Desde</label><input type="date" className="form-control" value={form.periodFrom} onChange={e => setForm({ ...form, periodFrom: e.target.value })} required /></div>
        <div className="form-group"><label>Hasta</label><input type="date" className="form-control" value={form.periodTo} onChange={e => setForm({ ...form, periodTo: e.target.value })} required /></div>
        <div className="form-group"><label>Horas</label><input type="number" step="0.01" className="form-control" placeholder="51.44" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} required /></div>
      </div>
      <div className="form-group"><label>Total a Pagar (S/.)</label><input type="number" step="0.10" className="form-control" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} required /></div>
      <div className="modal-footer">
        <button type="button" className="btn btn-danger" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>
  );
}
