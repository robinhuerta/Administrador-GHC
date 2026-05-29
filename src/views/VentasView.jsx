import { useState } from 'react';
import Modal from '../components/Modal';
import PaymentModal from '../components/PaymentModal';

const FORM_EMPTY = { date: '', code: '', client: '', model: '', responsible: '', quantity: '', price: '', paymentType: 'EFECTIVO', bank: '', paymentDate: '' };

function printDeliveryNote(venta) {
  const fmt = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n || 0);
  const num = Date.now().toString().slice(-6);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Nota de Entrega GHC #${num}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;padding:28px;max-width:380px;margin:0 auto;font-size:13px;color:#000}
  .center{text-align:center}.bold{font-weight:700}
  .dash{border-top:1px dashed #000;margin:10px 0}
  .row{display:flex;justify-content:space-between;padding:3px 0}
  .big{font-size:16px;font-weight:700;padding:6px 0}
</style></head>
<body>
  <div class="center">
    <div class="bold" style="font-size:22px;letter-spacing:2px">GHC GORRAS</div>
    <div class="bold" style="font-size:14px;margin:4px 0">NOTA DE ENTREGA</div>
    <div style="color:#555">N° ${num}</div>
  </div>
  <div class="dash"></div>
  <div class="row"><span>Fecha:</span><span>${venta.date}</span></div>
  <div class="row"><span>Cliente:</span><span class="bold">${venta.client}</span></div>
  ${venta.responsible ? `<div class="row"><span>Responsable:</span><span>${venta.responsible}</span></div>` : ''}
  <div class="dash"></div>
  <div class="row"><span>Código:</span><span class="bold">${venta.code}</span></div>
  <div class="row"><span>Modelo:</span><span>${venta.model}</span></div>
  <div class="row"><span>Cantidad:</span><span>${venta.quantity} unidades</span></div>
  <div class="row"><span>Precio unit.:</span><span>${fmt(venta.price)}</span></div>
  <div class="dash"></div>
  <div class="row big"><span>TOTAL:</span><span>${fmt(venta.totalValue)}</span></div>
  <div class="dash"></div>
  <div style="display:flex;justify-content:space-between;margin-top:48px">
    <div style="text-align:center">
      <div style="border-top:1px solid #000;width:140px;margin-bottom:6px"></div>
      <div>Firma del cliente</div>
    </div>
    <div style="text-align:center">
      <div style="border-top:1px solid #000;width:140px;margin-bottom:6px"></div>
      <div>Entregado por</div>
    </div>
  </div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;
  const win = window.open('', '_blank', 'width=440,height=640');
  win.document.write(html);
  win.document.close();
}

export default function VentasView({ ventas, addVenta, deleteVenta, updateVenta, pagos = [], addPago, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [deliveryPhase, setDeliveryPhase] = useState(false);
  const [lastVenta, setLastVenta] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);
  const [sortOrder, setSortOrder] = useState('asc');

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

  const sortedVentas = [...clientVentas].sort((a, b) =>
    sortOrder === 'asc' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')
  );
  const sortedCobros = [...clientPagos].sort((a, b) =>
    sortOrder === 'asc' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || '')
  );

  const totalEntregas = clientVentas.reduce((a, v) => a + (parseFloat(v.totalValue) || 0), 0);
  const totalPagado = clientPagos.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0);
  const saldo = totalEntregas - totalPagado;

  const emptyForm = { ...FORM_EMPTY, client: selectedClient || '' };
  const openNew = () => { setEditingId(null); setForm(emptyForm); setIsModalOpen(true); };
  const openEdit = (item) => { setEditingId(item.id); setForm({ ...item }); setIsModalOpen(true); };
  const handleClose = () => { setIsModalOpen(false); setEditingId(null); setDeliveryPhase(false); setLastVenta(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.price) || 0;
    const data = { date: form.date, code: form.code, client: form.client || selectedClient, model: form.model, responsible: form.responsible, quantity: qty, price, totalValue: qty * price, paidAmount: 0, paymentType: form.paymentType, bank: form.bank || '-', paymentDate: form.paymentDate };
    if (editingId) {
      updateVenta(editingId, data);
      handleClose();
    } else {
      addVenta(data);
      setLastVenta(data);
      setDeliveryPhase(true);
    }
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

        <Modal isOpen={isModalOpen} onClose={handleClose}
          title={deliveryPhase ? '📄 Nota de Entrega' : 'Registrar Entrega'}>
          {!deliveryPhase
            ? <VentaForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showClient />
            : <DeliveryNote venta={lastVenta} onClose={handleClose} onPrint={() => printDeliveryNote(lastVenta)} formatCurrency={formatCurrency} />
          }
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
                <tr>
                  <th>Código / Modelo</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>Fecha {sortOrder === 'asc' ? '↑' : '↓'}</th>
                  <th>Cant.</th><th>Total</th><th style={{ textAlign: 'center' }}>Acc.</th>
                </tr>
              </thead>
              <tbody>
                {sortedVentas.length === 0
                  ? <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin entregas aún</td></tr>
                  : sortedVentas.map(v => (
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
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')}>Fecha {sortOrder === 'asc' ? '↑' : '↓'}</th>
                  <th>Monto</th><th>Concepto</th>
                </tr>
              </thead>
              <tbody>
                {sortedCobros.length === 0
                  ? <tr><td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Sin cobros aún</td></tr>
                  : sortedCobros.map(p => (
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

      <Modal isOpen={isModalOpen} onClose={handleClose}
        title={deliveryPhase ? '📄 Nota de Entrega' : (editingId ? 'Editar Entrega' : `Nueva Entrega — ${selectedClient}`)}>
        {!deliveryPhase
          ? <VentaForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} showClient={!!editingId} />
          : <DeliveryNote venta={lastVenta} onClose={handleClose} onPrint={() => printDeliveryNote(lastVenta)} formatCurrency={formatCurrency} />
        }
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

function DeliveryNote({ venta, onClose, onPrint, formatCurrency }) {
  if (!venta) return null;
  const Row = ({ label, value, bold }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      {bold ? <strong>{value}</strong> : <span>{value}</span>}
    </div>
  );
  return (
    <div>
      <div style={{ fontFamily: "'Courier New', monospace", border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '24px', fontSize: '0.82rem', lineHeight: 1.9 }}>
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '2px' }}>GHC GORRAS</div>
          <div style={{ fontWeight: 600 }}>NOTA DE ENTREGA</div>
        </div>
        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />
        <Row label="Fecha:" value={venta.date} />
        <Row label="Cliente:" value={venta.client} bold />
        {venta.responsible && <Row label="Responsable:" value={venta.responsible} />}
        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />
        <Row label="Código:" value={venta.code} bold />
        <Row label="Modelo:" value={venta.model} />
        <Row label="Cantidad:" value={`${venta.quantity} unidades`} />
        <Row label="Precio unit.:" value={formatCurrency(venta.price)} />
        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}>
          <span>TOTAL:</span><span>{formatCurrency(venta.totalValue)}</span>
        </div>
        <div style={{ borderTop: '1px dashed var(--border-color)', margin: '16px 0 10px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid var(--border-color)', width: '130px', marginBottom: '6px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Firma del cliente</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid var(--border-color)', width: '130px', marginBottom: '6px' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entregado por</div>
          </div>
        </div>
      </div>
      <div className="modal-footer" style={{ marginTop: '16px' }}>
        <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={onClose}>Cerrar</button>
        <button className="btn btn-primary" onClick={onPrint}>🖨️ Imprimir Nota</button>
      </div>
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
