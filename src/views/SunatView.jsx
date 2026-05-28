import { useState } from 'react';
import Modal from '../components/Modal';
import PaymentModal from '../components/PaymentModal';

const CATEGORIES = [
  { key: 'Renta',           icon: '📊', desc: 'Impuesto a la renta mensual y anual.' },
  { key: 'Fraccionamiento', icon: '📅', desc: 'Deudas fraccionadas con SUNAT.' },
  { key: 'Honorarios',      icon: '👔', desc: 'Honorarios del contador.' },
];

const FORM_EMPTY = { date: '', description: '', total: '', category: 'Renta' };

export default function SunatView({ sunat, addSunat, deleteSunat, updateSunat, pagos = [], addPago, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  // Total deuda por categoría (de los registros)
  const deudaMap = sunat.reduce((acc, s) => {
    const cat = s.category || 'Renta';
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
    acc[cat].total += parseFloat(s.total) || 0;
    acc[cat].count += 1;
    return acc;
  }, {});

  // Total pagado por categoría (de ghc_pagos)
  const pagadoMap = pagos.reduce((acc, p) => {
    if (p.tallerType !== 'Sunat') return acc;
    if (!acc[p.beneficiary]) acc[p.beneficiary] = 0;
    acc[p.beneficiary] += parseFloat(p.amount) || 0;
    return acc;
  }, {});

  // Registros de la categoría seleccionada
  const catRecords = selectedCategory
    ? sunat.filter(s => {
        const cat = s.category || 'Renta';
        if (cat !== selectedCategory) return false;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || (s.description && s.description.toLowerCase().includes(q));
        const matchDate = !dateFilter || s.date === dateFilter;
        return matchSearch && matchDate;
      })
    : [];

  // Pagos de la categoría seleccionada (ghc_pagos)
  const catPagos = selectedCategory
    ? pagos.filter(p => p.beneficiary === selectedCategory && p.tallerType === 'Sunat')
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const totalDeuda  = catRecords.reduce((a, s) => a + (parseFloat(s.total) || 0), 0);
  const totalPagado = catPagos.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0);
  const saldo = totalDeuda - totalPagado;

  const openNew = () => { setEditingId(null); setForm({ ...FORM_EMPTY, category: selectedCategory || 'Renta' }); setIsModalOpen(true); };
  const openEdit = (s) => { setEditingId(s.id); setForm({ ...s, category: s.category || 'Renta' }); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { date: form.date, description: form.description, total: parseFloat(form.total) || 0, category: form.category };
    if (editingId) updateSunat(editingId, data); else addSunat(data);
    handleClose();
    setForm(FORM_EMPTY);
  };

  // ---- VISTA MAESTRA: 3 tarjetas ----
  if (!selectedCategory) {
    return (
      <div className="fade-in">
        <header className="header">
          <div><h1>Contador y SUNAT</h1><p className="text-muted">Selecciona una categoría para ver su cuaderno.</p></div>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo Registro</button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {CATEGORIES.map(cat => {
            const d = deudaMap[cat.key] || { total: 0, count: 0 };
            const paid = pagadoMap[cat.key] || 0;
            const saldoCard = d.total - paid;
            const alDia = saldoCard <= 0;
            return (
              <div key={cat.key} className="glass-panel"
                style={{ padding: '20px', cursor: 'pointer', borderLeft: `4px solid ${alDia ? '#34d399' : '#f59e0b'}`, transition: 'transform 0.15s' }}
                onClick={() => setSelectedCategory(cat.key)}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{cat.icon} {cat.key}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '2px 10px', borderRadius: '12px' }}>
                    {d.count} registro{d.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>{cat.desc}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                  <div><div style={{ color: 'var(--text-muted)' }}>Total deuda</div><div style={{ fontWeight: 600 }}>{formatCurrency(d.total)}</div></div>
                  <div><div style={{ color: 'var(--text-muted)' }}>Pagado</div><div style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(paid)}</div></div>
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

        <Modal isOpen={isModalOpen} onClose={handleClose} title="Nuevo Registro">
          <SunatForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showCategory />
        </Modal>
      </div>
    );
  }

  // ---- VISTA CUADERNO: obligaciones + pagos ----
  const catInfo = CATEGORIES.find(c => c.key === selectedCategory);

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <button onClick={() => setSelectedCategory(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '6px', padding: 0 }}>
            ← Volver a SUNAT / Contador
          </button>
          <h1>{catInfo?.icon} {selectedCategory}</h1>
          <p className="text-muted">Cuaderno de obligaciones y pagos.</p>
        </div>
        <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(catRecords, `Sunat_${selectedCategory}`)}>📊 Exportar</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* OBLIGACIONES */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>📋 OBLIGACIONES</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={openNew}>+ Agregar</button>
          </div>
          <table style={{ fontSize: '0.82rem', width: '100%' }}>
            <thead><tr><th>Fecha</th><th>Descripción</th><th>Total</th><th style={{ textAlign: 'center' }}>Acc.</th></tr></thead>
            <tbody>
              {catRecords.length === 0
                ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin registros aún</td></tr>
                : catRecords.map(s => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{s.date || '-'}</td>
                    <td style={{ fontWeight: 500 }}>{s.description}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(s.total)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" style={{ color: '#60a5fa' }} onClick={() => openEdit(s)}>✎</button>
                      {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => deleteSunat(s.id)}>🗑</button>}
                    </td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(0,0,0,0.25)', fontWeight: 'bold' }}>
                <td colSpan="2" style={{ textAlign: 'right', padding: '10px 12px' }}>TOTAL DEUDA:</td>
                <td style={{ color: 'var(--text-main)', padding: '10px 12px' }}>{formatCurrency(totalDeuda)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PAGOS */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#34d399' }}>💰 PAGOS REALIZADOS</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => setIsPaymentOpen(true)}>+ Pago</button>
          </div>
          <table style={{ fontSize: '0.82rem', width: '100%' }}>
            <thead><tr><th>Fecha</th><th>Monto</th><th>Concepto</th></tr></thead>
            <tbody>
              {catPagos.length === 0
                ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin pagos aún</td></tr>
                : catPagos.map(p => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{p.date}</td>
                    <td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(p.amount)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{p.concept || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(0,0,0,0.25)', fontWeight: 'bold' }}>
                <td style={{ textAlign: 'right', padding: '10px 12px' }}>TOTAL PAGADO:</td>
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
          {saldo > 0 ? formatCurrency(saldo) : 'Al día ✓'}
        </span>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? `Editar — ${selectedCategory}` : `Nuevo — ${selectedCategory}`}>
        <SunatForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showCategory={false} />
      </Modal>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        beneficiary={selectedCategory}
        tallerType="Sunat"
        totalTrabajo={totalDeuda}
        totalPagado={totalPagado}
        addPago={addPago}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function SunatForm({ form, setForm, onSubmit, onCancel, editingId, showCategory }) {
  return (
    <form onSubmit={onSubmit}>
      {showCategory && (
        <div className="form-group">
          <label>Categoría</label>
          <select className="form-control" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            <option value="Renta">📊 Renta</option>
            <option value="Fraccionamiento">📅 Fraccionamiento</option>
            <option value="Honorarios">👔 Honorarios de Contador</option>
          </select>
        </div>
      )}
      <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
      <div className="form-group"><label>Descripción / Concepto</label><input type="text" className="form-control" placeholder="Ej. RENTA ENERO 2026" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required /></div>
      <div className="form-group"><label>Total Deuda (S/.)</label><input type="number" step="0.10" className="form-control" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} required /></div>
      <div className="modal-footer">
        <button type="button" className="btn btn-danger" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>
  );
}
