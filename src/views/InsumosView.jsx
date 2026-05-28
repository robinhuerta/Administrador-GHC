import { useState } from 'react';
import Modal from '../components/Modal';
import PaymentModal from '../components/PaymentModal';

const FORM_EMPTY = { date: '', provider: '', invoice: '', totalCost: '' };

export default function InsumosView({ insumos, addInsumo, deleteInsumo, updateInsumo, pagos = [], addPago, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [sortOrder, setSortOrder] = useState('asc');

  // Agrupar compras por proveedor
  const providerMap = insumos.reduce((acc, i) => {
    const name = i.provider || 'Sin proveedor';
    if (!acc[name]) acc[name] = { name, totalCost: 0, count: 0 };
    acc[name].totalCost += parseFloat(i.totalCost) || 0;
    acc[name].count += 1;
    return acc;
  }, {});

  // Pagos por proveedor (ghc_pagos)
  const pagadoMap = pagos.reduce((acc, p) => {
    if (p.tallerType !== 'Insumos') return acc;
    if (!acc[p.beneficiary]) acc[p.beneficiary] = 0;
    acc[p.beneficiary] += parseFloat(p.amount) || 0;
    return acc;
  }, {});

  const providerList = Object.values(providerMap).map(p => ({
    ...p,
    totalPagado: pagadoMap[p.name] || 0,
  }));

  const filteredProviders = providerList.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compras del proveedor seleccionado
  const providerInsumos = selectedProvider
    ? insumos.filter(i => {
        if (i.provider !== selectedProvider) return false;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || (i.invoice && i.invoice.toLowerCase().includes(q));
        const matchDate = !dateFilter || i.date === dateFilter;
        return matchSearch && matchDate;
      })
    : [];

  // Pagos del proveedor seleccionado (ghc_pagos)
  const providerPagos = selectedProvider
    ? pagos.filter(p => p.beneficiary === selectedProvider && p.tallerType === 'Insumos')
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const sortedInsumos = [...providerInsumos].sort((a, b) =>
    sortOrder === 'asc' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')
  );
  const sortedPagos = [...providerPagos].sort((a, b) =>
    sortOrder === 'asc' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')
  );

  const totalCompras = providerInsumos.reduce((a, i) => a + (parseFloat(i.totalCost) || 0), 0);
  const totalPagado  = providerPagos.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0);
  const saldo = totalCompras - totalPagado;

  const emptyForm = { ...FORM_EMPTY, provider: selectedProvider || '' };
  const openNew  = () => { setEditingId(null); setForm(emptyForm); setIsModalOpen(true); };
  const openEdit = (i) => { setEditingId(i.id); setForm({ date: i.date, provider: i.provider, invoice: i.invoice, totalCost: i.totalCost }); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { date: form.date, provider: form.provider || selectedProvider, invoice: form.invoice, totalCost: parseFloat(form.totalCost) || 0, paidAmount: 0, paymentDate: '' };
    if (editingId) updateInsumo(editingId, data); else addInsumo(data);
    handleClose();
    setForm(emptyForm);
  };

  // ---- VISTA MAESTRA: tarjetas por proveedor ----
  if (!selectedProvider) {
    return (
      <div className="fade-in">
        <header className="header">
          <div><h1>Compras a Crédito (Insumos)</h1><p className="text-muted">Selecciona un proveedor para ver su cuaderno.</p></div>
          <button className="btn btn-primary" onClick={openNew}>+ Nueva Compra</button>
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
                      <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>🛍️ {p.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '2px 10px', borderRadius: '12px' }}>
                        {p.count} compra{p.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div><div style={{ color: 'var(--text-muted)' }}>Total compras</div><div style={{ fontWeight: 600 }}>{formatCurrency(p.totalCost)}</div></div>
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

        <Modal isOpen={isModalOpen} onClose={handleClose} title="Nueva Compra">
          <InsumoForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showProvider />
        </Modal>
      </div>
    );
  }

  // ---- VISTA CUADERNO: compras (debe) + pagos (haber) ----
  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <button onClick={() => setSelectedProvider(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '6px', padding: 0 }}>
            ← Volver a Proveedores
          </button>
          <h1>🛍️ {selectedProvider}</h1>
          <p className="text-muted">Cuaderno de compras y pagos.</p>
        </div>
        <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(providerInsumos, `Insumos_${selectedProvider}`)}>📊 Exportar</button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* COMPRAS REALIZADAS */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>🛍️ COMPRAS REALIZADAS</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={openNew}>+ Compra</button>
          </div>
          <table style={{ fontSize: '0.82rem', width: '100%' }}>
            <thead><tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
                Fecha {sortOrder === 'asc' ? '↑' : '↓'}
              </th>
              <th>Factura / Desc.</th><th>Total</th><th style={{ textAlign: 'center' }}>Acc.</th>
            </tr></thead>
            <tbody>
              {sortedInsumos.length === 0
                ? <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin compras aún</td></tr>
                : sortedInsumos.map(i => (
                  <tr key={i.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i.date}</td>
                    <td style={{ fontWeight: 500 }}>{i.invoice}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(i.totalCost)}</td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button className="btn-icon" style={{ color: '#60a5fa' }} onClick={() => openEdit(i)}>✎</button>
                      {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => deleteInsumo(i.id)}>🗑</button>}
                    </td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(0,0,0,0.25)', fontWeight: 'bold' }}>
                <td colSpan="2" style={{ textAlign: 'right', padding: '10px 12px' }}>TOTAL COMPRAS:</td>
                <td style={{ color: 'var(--text-main)', padding: '10px 12px' }}>{formatCurrency(totalCompras)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* PAGOS REALIZADOS */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#34d399' }}>💰 PAGOS REALIZADOS</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => setIsPaymentOpen(true)}>+ Pago</button>
          </div>
          <table style={{ fontSize: '0.82rem', width: '100%' }}>
            <thead><tr>
              <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>
                Fecha {sortOrder === 'asc' ? '↑' : '↓'}
              </th>
              <th>Monto</th><th>Concepto</th>
            </tr></thead>
            <tbody>
              {sortedPagos.length === 0
                ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin pagos aún</td></tr>
                : sortedPagos.map(p => (
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
          {saldo > 0 ? formatCurrency(saldo) : 'Cancelado ✓'}
        </span>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar Compra' : `Nueva Compra — ${selectedProvider}`}>
        <InsumoForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showProvider={!!editingId} />
      </Modal>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        beneficiary={selectedProvider}
        tallerType="Insumos"
        totalTrabajo={totalCompras}
        totalPagado={totalPagado}
        addPago={addPago}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function InsumoForm({ form, setForm, onSubmit, onCancel, editingId, showProvider }) {
  return (
    <form onSubmit={onSubmit}>
      {showProvider && (
        <div className="form-group"><label>Proveedor / Nombre</label><input type="text" className="form-control" placeholder="Ej. MASVAL" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} required /></div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Fecha de Compra</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
        <div className="form-group"><label>Factura / Descripción</label><input type="text" className="form-control" placeholder="Ej. FA04-5189" value={form.invoice} onChange={e => setForm({ ...form, invoice: e.target.value })} required /></div>
      </div>
      <div className="form-group"><label>Total Deuda (S/.)</label><input type="number" step="0.10" className="form-control" value={form.totalCost} onChange={e => setForm({ ...form, totalCost: e.target.value })} required /></div>
      <div className="modal-footer">
        <button type="button" className="btn btn-danger" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>
  );
}
