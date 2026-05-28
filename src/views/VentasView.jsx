import { useState } from 'react';
import Modal from '../components/Modal';
import PaymentModal from '../components/PaymentModal';

const FORM_EMPTY = { date: '', code: '', client: '', model: '', responsible: '', quantity: '', price: '', paymentType: 'EFECTIVO', bank: '', paymentDate: '' };

export default function VentasView({ ventas, addVenta, deleteVenta, updateVenta, pagos = [], addPago, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  // Agrupar entregas por cliente
  const clientMap = ventas.reduce((acc, v) => {
    const name = v.client || 'Sin cliente';
    if (!acc[name]) acc[name] = { name, totalValue: 0, count: 0 };
    acc[name].totalValue += parseFloat(v.totalValue) || 0;
    acc[name].count += 1;
    return acc;
  }, {});

  // Pagos por cliente (de ghc_pagos con tallerType = 'Ventas')
  const pagosPorCliente = pagos.reduce((acc, p) => {
    if (p.tallerType !== 'Ventas') return acc;
    if (!acc[p.beneficiary]) acc[p.beneficiary] = 0;
    acc[p.beneficiary] += parseFloat(p.amount) || 0;
    return acc;
  }, {});

  const clientList = Object.values(clientMap).map(c => ({
    ...c,
    totalPagado: pagosPorCliente[c.name] || 0,
  }));

  const filteredClients = clientList.filter(c =>
    !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Entregas del cliente seleccionado
  const clientVentas = selectedClient
    ? ventas.filter(v => {
        if (v.client !== selectedClient) return false;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q || (v.code && v.code.toLowerCase().includes(q)) || (v.model && v.model.toLowerCase().includes(q));
        const matchDate = !dateFilter || v.date === dateFilter;
        return matchSearch && matchDate;
      })
    : [];

  // Pagos del cliente seleccionado
  const clientPagos = selectedClient
    ? pagos.filter(p => p.beneficiary === selectedClient && p.tallerType === 'Ventas')
        .sort((a, b) => b.createdAt - a.createdAt)
    : [];

  const totalEntregas = clientVentas.reduce((a, v) => a + (parseFloat(v.totalValue) || 0), 0);
  const totalPagado = clientPagos.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0);
  const saldo = totalEntregas - totalPagado;

  const emptyForm = { ...FORM_EMPTY, client: selectedClient || '' };
  const openNew = () => { setEditingId(null); setForm(emptyForm); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm({ ...item }); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.price) || 0;
    const data = { date: form.date, code: form.code, client: form.client, model: form.model, responsible: form.responsible, quantity: qty, price, totalValue: qty * price, paidAmount: 0, paymentType: form.paymentType, bank: form.bank || '-', paymentDate: form.paymentDate };
    if (editingId) updateVenta(editingId, data); else addVenta(data);
    handleClose();
    setForm(emptyForm);
  };

  // ---- VISTA MAESTRA: tarjetas por cliente ----
  if (!selectedClient) {
    return (
      <div className="fade-in">
        <header className="header">
          <div>
            <h1>Entregas y Cobros a Clientes</h1>
            <p className="text-muted">Selecciona un cliente para ver su cuaderno.</p>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Nueva Entrega</button>
        </header>

        {filteredClients.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>No hay registros aún.</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredClients.map(c => {
                const saldoCard = c.totalValue - c.totalPagado;
                const alDia = saldoCard <= 0;
                return (
                  <div key={c.name} className="glass-panel"
                    style={{ padding: '20px', cursor: 'pointer', borderLeft: `4px solid ${alDia ? '#34d399' : '#3b82f6'}`, transition: 'transform 0.15s' }}
                    onClick={() => setSelectedClient(c.name)}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>👤 {c.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '2px 10px', borderRadius: '12px' }}>
                        {c.count} entrega{c.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div><div style={{ color: 'var(--text-muted)' }}>Total entregas</div><div style={{ fontWeight: 600 }}>{formatCurrency(c.totalValue)}</div></div>
                      <div><div style={{ color: 'var(--text-muted)' }}>Cobrado</div><div style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(c.totalPagado)}</div></div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ color: 'var(--text-muted)' }}>Saldo por cobrar</div>
                        <div style={{ fontWeight: 700, color: alDia ? '#34d399' : '#3b82f6' }}>{alDia ? 'Cobrado ✓' : formatCurrency(saldoCard)}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '14px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--accent)' }}>Ver cuaderno →</div>
                  </div>
                );
              })}
            </div>
          )
        }

        <Modal isOpen={isModalOpen} onClose={handleClose} title="Registrar Entrega / Cobro">
          <VentaForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showClient />
        </Modal>
      </div>
    );
  }

  // ---- VISTA CUADERNO: entregas (debe) + cobros (haber) ----
  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <button onClick={() => setSelectedClient(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '6px', padding: 0 }}>
            ← Volver a Clientes
          </button>
          <h1>👤 Cliente: {selectedClient}</h1>
          <p className="text-muted">Cuaderno de entregas y cobros.</p>
        </div>
        <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(clientVentas, `Ventas_${selectedClient}`)}>📊 Exportar</button>
      </header>

      {/* Cuaderno: 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>

        {/* DEBE — Entregas realizadas */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>📦 ENTREGAS REALIZADAS</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={openNew}>+ Entrega</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: '0.82rem', width: '100%' }}>
              <thead>
                <tr><th>Código / Modelo</th><th>Fecha</th><th>Cant.</th><th>Total</th><th style={{ textAlign: 'center' }}>Acc.</th></tr>
              </thead>
              <tbody>
                {clientVentas.length === 0
                  ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin entregas aún</td></tr>
                  : clientVentas.map(v => (
                    <tr key={v.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.code}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{v.model}</div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{v.date}</td>
                      <td>{v.quantity}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(v.totalValue)}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button className="btn-icon" style={{ color: '#60a5fa' }} title="Editar" onClick={() => openEdit(v)}>✎</button>
                        {isAdmin && <button className="btn-icon" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => deleteVenta(v.id)}>🗑</button>}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(0,0,0,0.25)', fontWeight: 'bold' }}>
                  <td colSpan="3" style={{ textAlign: 'right', padding: '10px 12px' }}>TOTAL:</td>
                  <td style={{ color: 'var(--text-main)', padding: '10px 12px' }}>{formatCurrency(totalEntregas)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* HABER — Cobros recibidos */}
        <div className="glass-panel" style={{ padding: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#34d399' }}>💰 COBROS RECIBIDOS</span>
            <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => setIsPaymentOpen(true)}>+ Cobro</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: '0.82rem', width: '100%' }}>
              <thead>
                <tr><th>Fecha</th><th>Monto</th><th>Concepto</th></tr>
              </thead>
              <tbody>
                {clientPagos.length === 0
                  ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin cobros aún</td></tr>
                  : clientPagos.map(p => (
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
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>TOTAL:</td>
                  <td style={{ color: '#34d399', padding: '10px 12px' }}>{formatCurrency(totalPagado)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Saldo banner */}
      <div className="glass-panel" style={{ marginTop: '16px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `4px solid ${saldo > 0 ? '#3b82f6' : '#34d399'}` }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>SALDO POR COBRAR</span>
        <span style={{ fontWeight: 700, fontSize: '1.6rem', color: saldo > 0 ? '#3b82f6' : '#34d399' }}>
          {saldo > 0 ? formatCurrency(saldo) : 'Cobrado ✓'}
        </span>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? 'Editar Entrega' : `Nueva Entrega — ${selectedClient}`}>
        <VentaForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showClient={!!editingId} />
      </Modal>

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        beneficiary={selectedClient}
        tallerType="Ventas"
        totalTrabajo={totalEntregas}
        totalPagado={totalPagado}
        addPago={addPago}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function VentaForm({ form, setForm, onSubmit, onCancel, editingId, showClient }) {
  return (
    <form onSubmit={onSubmit}>
      {showClient && (
        <div className="form-group"><label>Cliente</label><input type="text" className="form-control" placeholder="Ej. JHONY" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} required /></div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Fecha de Entrega</label><input type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
        <div className="form-group"><label>Código de Pedido</label><input type="text" className="form-control" placeholder="Ej. M09" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Modelo / Gorra</label><input type="text" className="form-control" placeholder="Ej. CURVO" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required /></div>
        <div className="form-group"><label>Responsable</label><input type="text" className="form-control" placeholder="Ej. MILY" value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Cantidad</label><input type="number" className="form-control" placeholder="300" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required /></div>
        <div className="form-group"><label>Precio Venta (S/.)</label><input type="number" step="0.10" className="form-control" placeholder="20.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required /></div>
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
        <button type="button" className="btn btn-danger" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>
  );
}
