import { useState } from 'react';
import Modal from '../components/Modal';
import PaymentModal from '../components/PaymentModal';

const FORM_EMPTY = { style: '', date: '', code: '', quantity: '', provider: '', unitPrice: '', paidAmount: '', paymentDate: '' };

const TITLES = {
  Corte:    { title: 'Producción: Corte',                desc: 'Selecciona un taller para ver su cuaderno.', icon: '✂️' },
  Costura:  { title: 'Producción: Costura (Confección)', desc: 'Selecciona un taller para ver su cuaderno.', icon: '🧵' },
  Bordado:  { title: 'Producción: Bordados',             desc: 'Selecciona un bordador para ver su cuaderno.', icon: '🪡' },
  Servicio: { title: 'Otros Servicios',                  desc: 'Selecciona un proveedor para ver su cuaderno.', icon: '🔧' },
};

export default function TalleresView({ type, lotes, pagos = [], addTaller, deleteTaller, updateTaller, addPago, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  const { title, desc, icon } = TITLES[type];

  // Agrupar lotes por proveedor para la vista maestra
  const providerMap = lotes.reduce((acc, item) => {
    const name = item.provider || 'Sin asignar';
    if (!acc[name]) acc[name] = { name, totalCost: 0, count: 0 };
    acc[name].totalCost += parseFloat(item.totalCost) || 0;
    acc[name].count += 1;
    return acc;
  }, {});

  // Pagos agrupados por proveedor (de ghc_pagos)
  const pagosPorProveedor = pagos.reduce((acc, p) => {
    if (p.tallerType !== type) return acc;
    if (!acc[p.beneficiary]) acc[p.beneficiary] = 0;
    acc[p.beneficiary] += parseFloat(p.amount) || 0;
    return acc;
  }, {});

  const providerList = Object.values(providerMap).map(p => ({
    ...p,
    totalPagado: pagosPorProveedor[p.name] || 0,
  }));

  const filteredProviders = providerList.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Registros del proveedor seleccionado
  const providerLotes = selectedProvider
    ? lotes.filter(t => {
        if (t.provider !== selectedProvider) return false;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || (t.style && t.style.toLowerCase().includes(q)) || (t.code && t.code.toLowerCase().includes(q));
        const matchDate = !dateFilter || t.date === dateFilter;
        return matchSearch && matchDate;
      })
    : [];

  // Pagos del proveedor seleccionado (de ghc_pagos)
  const providerPagos = selectedProvider
    ? pagos.filter(p => p.beneficiary === selectedProvider && p.tallerType === type)
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const totalTrabajo = providerLotes.reduce((a, c) => a + (parseFloat(c.totalCost) || 0), 0);
  const totalPagado = providerPagos.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0);
  const saldo = totalTrabajo - totalPagado;

  const emptyForm = { ...FORM_EMPTY, provider: selectedProvider || '' };
  const openNew = () => { setEditingId(null); setForm(emptyForm); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm(item); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.unitPrice) || 0;
    const data = { type, date: form.date, code: form.code, style: form.style, quantity: qty, provider: form.provider, unitPrice: price, totalCost: qty * price, paidAmount: 0, paymentDate: '' };
    if (editingId) updateTaller(editingId, data); else addTaller(data);
    handleClose();
    setForm(emptyForm);
  };

  // ---- VISTA MAESTRA: tarjetas ----
  if (!selectedProvider) {
    return (
      <div className="fade-in">
        <header className="header">
          <div><h1>{title}</h1><p className="text-muted">{desc}</p></div>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo Lote</button>
        </header>

        {filteredProviders.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>No hay registros aún.</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredProviders.map(p => {
                const saldoCard = p.totalCost - p.totalPagado;
                const alDia = saldoCard <= 0;
                return (
                  <div key={p.name} className="glass-panel"
                    style={{ padding: '20px', cursor: 'pointer', borderLeft: `4px solid ${alDia ? '#34d399' : '#f59e0b'}`, transition: 'transform 0.15s' }}
                    onClick={() => setSelectedProvider(p.name)}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{icon} {p.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '2px 10px', borderRadius: '12px' }}>{p.count} lote{p.count !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div><div style={{ color: 'var(--text-muted)' }}>Total trabajo</div><div style={{ fontWeight: 600 }}>{formatCurrency(p.totalCost)}</div></div>
                      <div><div style={{ color: 'var(--text-muted)' }}>Pagado</div><div style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(p.totalPagado)}</div></div>
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

        <Modal isOpen={isModalOpen} onClose={handleClose} title={`Nuevo Lote — ${type}`}>
          <TallerForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} type={type} showProvider />
        </Modal>
      </div>
    );
  }

  // ---- VISTA CUADERNO: lotes (debe) + pagos (haber) ----
  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <button onClick={() => setSelectedProvider(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '6px', padding: 0 }}>
            ← Volver a {title}
          </button>
          <h1>{icon} {type}: {selectedProvider}</h1>
          <p className="text-muted">Cuaderno de trabajo y pagos.</p>
        </div>
        <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(providerLotes, `${type}_${selectedProvider}`)}>📊 Exportar</button>
      </header>

      {/* Cuaderno: 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* DEBE — Trabajo realizado */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>📋 TRABAJO REALIZADO</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={openNew}>+ Lote</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: '0.82rem', width: '100%' }}>
              <thead>
                <tr><th>Estilo / Lote</th><th>Fecha</th><th>Cant.</th><th>Total</th><th style={{ textAlign: 'center' }}>Acc.</th></tr>
              </thead>
              <tbody>
                {providerLotes.length === 0
                  ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin lotes aún</td></tr>
                  : providerLotes.map(t => (
                    <tr key={t.id}>
                      <td><div style={{ fontWeight: 600 }}>{t.style}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.code}</div></td>
                      <td style={{ color: 'var(--text-muted)' }}>{t.date}</td>
                      <td>{t.quantity}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(t.totalCost)}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn-icon" style={{ color: '#60a5fa' }} title="Editar" onClick={() => openEdit(t)}>✎</button>
                        {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deleteTaller(t.id)}>🗑</button>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.25)', fontWeight: 'bold' }}>
                  <td colSpan="3" style={{ textAlign: 'right', padding: '10px 12px' }}>TOTAL TRABAJO:</td>
                  <td style={{ color: 'var(--text-main)', padding: '10px 12px' }}>{formatCurrency(totalTrabajo)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* HABER — Pagos realizados */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#34d399' }}>💰 PAGOS REALIZADOS</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => setIsPaymentOpen(true)}>+ Pago</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: '0.82rem', width: '100%' }}>
              <thead>
                <tr><th>Fecha</th><th>Monto</th><th>Concepto</th></tr>
              </thead>
              <tbody>
                {providerPagos.length === 0
                  ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin pagos aún</td></tr>
                  : providerPagos.map(p => (
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
      </div>

      {/* Saldo banner */}
      <div className="glass-panel" style={{ marginTop: '16px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${saldo > 0 ? '#f59e0b' : '#34d399'}` }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>SALDO PENDIENTE</span>
        <span style={{ fontWeight: 700, fontSize: '1.6rem', color: saldo > 0 ? '#f59e0b' : '#34d399' }}>
          {saldo > 0 ? formatCurrency(saldo) : 'Cancelado ✓'}
        </span>
      </div>

      {/* Modal lote */}
      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? `Editar — ${type}` : `Registrar Lote — ${selectedProvider}`}>
        <TallerForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} type={type} showProvider={!!editingId} />
      </Modal>

      {/* Modal pago */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        beneficiary={selectedProvider}
        tallerType={type}
        totalTrabajo={totalTrabajo}
        totalPagado={totalPagado}
        addPago={addPago}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function TallerForm({ form, setForm, onSubmit, onCancel, editingId, type, showProvider }) {
  return (
    <form onSubmit={onSubmit}>
      {showProvider && (
        <div className="form-group">
          <label>{type === 'Corte' ? 'Taller Entregado' : 'Responsable / Taller'}</label>
          <input type="text" className="form-control" placeholder="Ej. MILY" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} required />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Estilo / Nombre</label><input type="text" className="form-control" placeholder="Ej. CURVO" value={form.style} onChange={e => setForm({ ...form, style: e.target.value })} required /></div>
        <div className="form-group"><label>Lote / Código</label><input type="text" className="form-control" placeholder="Ej. M03" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
        <div className="form-group"><label>Cantidad</label><input type="number" className="form-control" placeholder="300" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required /></div>
      </div>
      <div className="form-group"><label>Precio Unitario (S/.)</label><input type="number" step="0.01" className="form-control" placeholder="0.5" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} required /></div>
      <div className="modal-footer">
        <button type="button" className="btn btn-danger" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>
  );
}
