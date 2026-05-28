import { useState } from 'react';
import Modal from '../components/Modal';

const FORM_EMPTY = { style: '', date: '', code: '', quantity: '', provider: '', unitPrice: '', paidAmount: '', paymentDate: '' };

const TITLES = {
  Corte:    { title: 'Producción: Corte',               desc: 'Selecciona un taller para ver sus lotes.',    icon: '✂️' },
  Costura:  { title: 'Producción: Costura (Confección)', desc: 'Selecciona un taller para ver sus lotes.',   icon: '🧵' },
  Bordado:  { title: 'Producción: Bordados',             desc: 'Selecciona un bordador para ver sus lotes.', icon: '🪡' },
  Servicio: { title: 'Otros Servicios',                  desc: 'Selecciona un proveedor para ver sus lotes.', icon: '🔧' },
};

export default function TalleresView({ type, lotes, addTaller, deleteTaller, updateTaller, isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter }) {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(FORM_EMPTY);

  const { title, desc, icon } = TITLES[type];

  // Agrupar lotes por proveedor/taller
  const providerMap = lotes.reduce((acc, item) => {
    const name = item.provider || 'Sin asignar';
    if (!acc[name]) acc[name] = { name, totalCost: 0, totalPaid: 0, count: 0 };
    acc[name].totalCost += parseFloat(item.totalCost) || 0;
    acc[name].totalPaid += parseFloat(item.paidAmount) || 0;
    acc[name].count += 1;
    return acc;
  }, {});

  const providerList = Object.values(providerMap);

  // Filtrar tarjetas en vista maestra
  const filteredProviders = providerList.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Registros del proveedor seleccionado con filtros
  const providerRecords = selectedProvider
    ? lotes.filter(t => {
        if (t.provider !== selectedProvider) return false;
        const q = searchQuery.toLowerCase();
        const matchSearch = !q ||
          (t.style && t.style.toLowerCase().includes(q)) ||
          (t.code && t.code.toLowerCase().includes(q));
        const matchDate = !dateFilter || t.date === dateFilter || t.paymentDate === dateFilter;
        return matchSearch && matchDate;
      })
    : [];

  const emptyForm = { ...FORM_EMPTY, provider: selectedProvider || '' };

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

  // ---- VISTA MAESTRA: tarjetas por taller ----
  if (!selectedProvider) {
    return (
      <div className="fade-in">
        <header className="header">
          <div>
            <h1>{title}</h1>
            <p className="text-muted">{desc}</p>
          </div>
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo Lote</button>
        </header>

        {filteredProviders.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>No hay registros aún.</p>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredProviders.map(p => {
                const saldo = p.totalCost - p.totalPaid;
                const alDia = saldo <= 0;
                return (
                  <div
                    key={p.name}
                    className="glass-panel"
                    style={{ padding: '20px', cursor: 'pointer', borderLeft: `4px solid ${alDia ? '#34d399' : '#f59e0b'}`, transition: 'transform 0.15s' }}
                    onClick={() => setSelectedProvider(p.name)}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{icon} {p.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.07)', padding: '2px 10px', borderRadius: '12px' }}>
                        {p.count} lote{p.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Total costo</div>
                        <div style={{ fontWeight: 600 }}>{formatCurrency(p.totalCost)}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Pagado</div>
                        <div style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(p.totalPaid)}</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>Saldo pendiente</div>
                        <div style={{ fontWeight: 700, color: alDia ? '#34d399' : '#f59e0b' }}>
                          {alDia ? 'Al día ✓' : formatCurrency(saldo)}
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '14px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--accent)' }}>
                      Ver lotes →
                    </div>
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

  // ---- VISTA DETALLE: lotes del taller seleccionado ----
  const summary = providerMap[selectedProvider] || { totalCost: 0, totalPaid: 0, count: 0 };
  const saldoTotal = summary.totalCost - summary.totalPaid;

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <button
            onClick={() => setSelectedProvider(null)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', marginBottom: '6px', padding: 0 }}
          >
            ← Volver a {title}
          </button>
          <h1>{type}: {selectedProvider}</h1>
          <p className="text-muted">Historial de lotes y pagos.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(providerRecords, `${type}_${selectedProvider}`)}>📊 Exportar</button>
          <button className="btn btn-primary" onClick={openNew}>+ Registrar Lote</button>
        </div>
      </header>

      {/* Resumen del taller */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="glass-panel stat-card">
          <span className="text-muted">Total Lotes</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary.count}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="text-muted">Total Costo</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(summary.totalCost)}</span>
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

      {/* Tabla de lotes */}
      <div className="glass-panel table-container">
        {providerRecords.length === 0
          ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p>
          : (
            <table style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Estilo / Nombre</th><th>Fecha</th><th>Lote / Código</th><th>Cant.</th>
                  <th>P. Unit</th><th>Total (Costo)</th><th>Pago / Adelanto</th>
                  <th>Fecha Pago</th><th>Resta (Saldo)</th><th style={{ textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {providerRecords.map(t => {
                  const saldo = t.totalCost - t.paidAmount;
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{t.style}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{t.date}</td>
                      <td style={{ fontWeight: 600 }}>{t.code}</td>
                      <td>{t.quantity}</td>
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
                  <td colSpan="5" style={{ textAlign: 'right', paddingRight: '12px' }}>TOTALES:</td>
                  <td style={{ color: 'var(--text-main)' }}>{formatCurrency(providerRecords.reduce((a, c) => a + (parseFloat(c.totalCost) || 0), 0))}</td>
                  <td style={{ color: '#34d399' }}>{formatCurrency(providerRecords.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0))}</td>
                  <td></td>
                  <td style={{ color: '#ef4444' }}>{formatCurrency(providerRecords.reduce((a, c) => a + ((parseFloat(c.totalCost) || 0) - (parseFloat(c.paidAmount) || 0)), 0))}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleClose} title={editingId ? `Editar — ${type}` : `Registrar — ${type}: ${selectedProvider}`}>
        <TallerForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={handleClose} editingId={editingId} type={type} showProvider={!!editingId} />
      </Modal>
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
      <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group"><label>Monto Pagado / Adelanto</label><input type="number" step="0.10" className="form-control" value={form.paidAmount} onChange={e => setForm({ ...form, paidAmount: e.target.value })} /></div>
        <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} /></div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-danger" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary">{editingId ? 'Actualizar' : 'Guardar'}</button>
      </div>
    </form>
  );
}
