import { useState } from 'react';
import { useFirestoreCollection } from './hooks/useFirestoreCollection';
import Modal from './components/Modal';
import './index.css';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); 
  
  // --- STATES (Firebase Firestore) ---
  const [ventas, addVenta, deleteVenta] = useFirestoreCollection('ghc_ventas');
  const [planilla, addPlanilla, deletePlanilla] = useFirestoreCollection('ghc_planilla');
  const [sunat, addSunat, deleteSunat] = useFirestoreCollection('ghc_sunat');
  const [lotesTalleres, addTaller, deleteTaller] = useFirestoreCollection('ghc_lotes_talleres');
  const [insumos, addInsumo, deleteInsumo] = useFirestoreCollection('ghc_insumos');
  const [cajaChica, addCajaChica, deleteCajaChica] = useFirestoreCollection('ghc_cajachica');

  // --- MODAL STATES ---
  const [isModalVentasOpen, setIsModalVentasOpen] = useState(false);
  const [formVenta, setFormVenta] = useState({ date: '', code: '', client: '', model: '', responsible: '', quantity: '', price: '', paidAmount: '', paymentType: 'EFECTIVO', bank: '', paymentDate: '' });

  const [isModalPlanillaOpen, setIsModalPlanillaOpen] = useState(false);
  const [formPlanilla, setFormPlanilla] = useState({ name: '', periodFrom: '', periodTo: '', hours: '', total: '', paidAmount: '', paymentDate: '' });

  const [isModalSunatOpen, setIsModalSunatOpen] = useState(false);
  const [formSunat, setFormSunat] = useState({ date: '', description: '', total: '', paidAmount: '', paymentDate: '' });

  const [isModalInsumosOpen, setIsModalInsumosOpen] = useState(false);
  const [formInsumo, setFormInsumo] = useState({ date: '', provider: '', invoice: '', totalCost: '', paidAmount: '', paymentDate: '' });

  const [isModalTallerOpen, setIsModalTallerOpen] = useState(false);
  const [formTallerType, setFormTallerType] = useState('Corte');
  const [formTaller, setFormTaller] = useState({ style: '', date: '', code: '', quantity: '', provider: '', unitPrice: '', paidAmount: '', paymentDate: '' });

  const [isModalCajaChicaOpen, setIsModalCajaChicaOpen] = useState(false);
  const [formCajaChica, setFormCajaChica] = useState({ date: '', description: '', type: 'Egreso', amount: '' });

  // --- CALCULATIONS ---
  const totalIngresos = ventas.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const totalPagadoTalleres = lotesTalleres.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const totalPagadoPlanilla = planilla.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const totalPagadoSunat = sunat.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const totalPagadoInsumos = insumos.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const egresosCajaChica = cajaChica.filter(c => c.type === 'Egreso').reduce((acc, curr) => acc + curr.amount, 0);

  const totalEgresos = totalPagadoPlanilla + totalPagadoSunat + totalPagadoTalleres + totalPagadoInsumos + egresosCajaChica;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  // --- HANDLERS ---
  const handleAddVenta = (e) => { 
    e.preventDefault(); 
    const qty = parseFloat(formVenta.quantity) || 0; 
    const price = parseFloat(formVenta.price) || 0; 
    addVenta({ date: formVenta.date, code: formVenta.code, client: formVenta.client, model: formVenta.model, responsible: formVenta.responsible, quantity: qty, price: price, totalValue: qty * price, paidAmount: parseFloat(formVenta.paidAmount) || 0, paymentType: formVenta.paymentType, bank: formVenta.bank || '-', paymentDate: formVenta.paymentDate }); 
    setIsModalVentasOpen(false); 
    setFormVenta({ date: '', code: '', client: '', model: '', responsible: '', quantity: '', price: '', paidAmount: '', paymentType: 'EFECTIVO', bank: '', paymentDate: '' }); 
  };
  const handleDeleteVenta = (id) => deleteVenta(id);

  const handleAddPlanilla = (e) => { 
    e.preventDefault(); 
    addPlanilla({ name: formPlanilla.name, periodFrom: formPlanilla.periodFrom, periodTo: formPlanilla.periodTo, hours: parseFloat(formPlanilla.hours) || 0, total: parseFloat(formPlanilla.total) || 0, paidAmount: parseFloat(formPlanilla.paidAmount) || 0, paymentDate: formPlanilla.paymentDate }); 
    setIsModalPlanillaOpen(false); 
    setFormPlanilla({ name: '', periodFrom: '', periodTo: '', hours: '', total: '', paidAmount: '', paymentDate: '' }); 
  };
  const handleDeletePlanilla = (id) => deletePlanilla(id);

  const handleAddSunat = (e) => { 
    e.preventDefault(); 
    addSunat({ date: formSunat.date, description: formSunat.description, total: parseFloat(formSunat.total) || 0, paidAmount: parseFloat(formSunat.paidAmount) || 0, paymentDate: formSunat.paymentDate }); 
    setIsModalSunatOpen(false); 
    setFormSunat({ date: '', description: '', total: '', paidAmount: '', paymentDate: '' }); 
  };
  const handleDeleteSunat = (id) => deleteSunat(id);

  const handleAddInsumo = (e) => { 
    e.preventDefault(); 
    addInsumo({ date: formInsumo.date, provider: formInsumo.provider, invoice: formInsumo.invoice, totalCost: parseFloat(formInsumo.totalCost) || 0, paidAmount: parseFloat(formInsumo.paidAmount) || 0, paymentDate: formInsumo.paymentDate }); 
    setIsModalInsumosOpen(false); 
    setFormInsumo({ date: '', provider: '', invoice: '', totalCost: '', paidAmount: '', paymentDate: '' }); 
  };
  const handleDeleteInsumo = (id) => deleteInsumo(id);

  const openTallerModal = (type) => { setFormTallerType(type); setIsModalTallerOpen(true); };
  const handleAddTaller = (e) => { 
    e.preventDefault(); 
    const qty = parseFloat(formTaller.quantity) || 0; 
    const price = parseFloat(formTaller.unitPrice) || 0; 
    addTaller({ type: formTallerType, date: formTaller.date, code: formTaller.code, style: formTaller.style, quantity: qty, provider: formTaller.provider, unitPrice: price, totalCost: qty * price, paidAmount: parseFloat(formTaller.paidAmount) || 0, paymentDate: formTaller.paymentDate }); 
    setIsModalTallerOpen(false); 
    setFormTaller({ style: '', date: '', code: '', quantity: '', provider: '', unitPrice: '', paidAmount: '', paymentDate: '' }); 
  };
  const handleDeleteTaller = (id) => deleteTaller(id);

  const handleAddCajaChica = (e) => { 
    e.preventDefault(); 
    addCajaChica({ date: formCajaChica.date, description: formCajaChica.description, type: formCajaChica.type, amount: parseFloat(formCajaChica.amount) }); 
    setIsModalCajaChicaOpen(false); 
    setFormCajaChica({ date: '', description: '', type: 'Egreso', amount: '' }); 
  };
  const handleDeleteCajaChica = (id) => deleteCajaChica(id);

  // --- RENDER HELPERS ---
  const lotesCorte = lotesTalleres.filter(t => t.type === 'Corte');
  const lotesCostura = lotesTalleres.filter(t => t.type === 'Costura');
  const lotesBordado = lotesTalleres.filter(t => t.type === 'Bordado');
  const lotesServicio = lotesTalleres.filter(t => t.type === 'Servicio');

  const renderTalleresTable = (dataList) => (
    <div className="glass-panel table-container">
      {dataList.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p> : (
        <table style={{ fontSize: '0.85rem' }}>
          <thead><tr><th>Estilo / Nombre</th><th>Fecha</th><th>Lote / Código</th><th>Cant.</th><th>Responsable / Taller</th><th>P. Unit</th><th>Total (Costo)</th><th>Pago / Adelanto</th><th>Fecha Pago</th><th>Resta (Saldo)</th><th style={{textAlign:'center'}}>Acción</th></tr></thead>
          <tbody>
            {dataList.map((t) => {
              const saldo = t.totalCost - t.paidAmount;
              return (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{t.style}</td><td style={{ color: 'var(--text-muted)' }}>{t.date}</td><td style={{ fontWeight: 600 }}>{t.code}</td><td>{t.quantity}</td><td style={{ fontWeight: 600, color: '#60a5fa' }}>{t.provider}</td><td>{formatCurrency(t.unitPrice)}</td><td style={{ fontWeight: 600 }}>{formatCurrency(t.totalCost)}</td><td style={{ color: '#34d399', fontWeight: 600 }}>{formatCurrency(t.paidAmount)}</td><td style={{ color: 'var(--text-muted)' }}>{t.paymentDate || '-'}</td>
                  <td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : (saldo > 0 ? formatCurrency(saldo) : `-${formatCurrency(Math.abs(saldo))}`)}</span></td>
                  <td style={{ textAlign: 'center' }}><button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteTaller(t.id)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>GHC <span>Gorras</span></div>
        <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Principal</div>
        <nav className="nav-menu" style={{ marginBottom: '24px' }}>
          <a className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> Caja General</a>
          <a className={`nav-item ${activeView === 'ventas' ? 'active' : ''}`} onClick={() => setActiveView('ventas')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> Cobros a Clientes</a>
        </nav>
        <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Egresos y Pagos</div>
        <nav className="nav-menu">
          <a className={`nav-item ${activeView === 'planilla' ? 'active' : ''}`} onClick={() => setActiveView('planilla')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> Planilla de Personal</a>
          <a className={`nav-item ${activeView === 'sunat' ? 'active' : ''}`} onClick={() => setActiveView('sunat')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Contador y SUNAT</a>
          <a className={`nav-item ${activeView === 'insumos' ? 'active' : ''}`} onClick={() => setActiveView('insumos')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> Compras / Créditos</a>
          <a className={`nav-item ${activeView === 'corte' ? 'active' : ''}`} onClick={() => setActiveView('corte')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6zM4 4h6v6H4z"></path></svg> Producción: Corte</a>
          <a className={`nav-item ${activeView === 'costura' ? 'active' : ''}`} onClick={() => setActiveView('costura')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg> Producción: Costura</a>
          <a className={`nav-item ${activeView === 'bordado' ? 'active' : ''}`} onClick={() => setActiveView('bordado')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path><line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="6.5"></line></svg> Producción: Bordados</a>
          <a className={`nav-item ${activeView === 'servicio' ? 'active' : ''}`} onClick={() => setActiveView('servicio')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> Otros Servicios</a>
          <a className={`nav-item ${activeView === 'cajachica' ? 'active' : ''}`} onClick={() => setActiveView('cajachica')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg> Caja Chica</a>
        </nav>
      </aside>

      <main className="main-content">
        {/* CAJA GENERAL */}
        {activeView === 'dashboard' && (
          <div className="fade-in">
            <header className="header"><div><h1>Caja General</h1><p className="text-muted">Resumen global de liquidez (Conectado a Firebase 🔥).</p></div></header>
            <div className="stats-grid">
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #34d399' }}><span className="text-muted">Total Cobrado (Ingresos)</span><span className="stat-value" style={{ color: '#34d399' }}>{formatCurrency(totalIngresos)}</span></div>
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #ef4444' }}><span className="text-muted">Egresos Totales</span><span className="stat-value" style={{ color: '#ef4444' }}>{formatCurrency(totalEgresos)}</span></div>
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid var(--accent)' }}><span className="text-muted">Saldo en Caja</span><span className="stat-value">{formatCurrency(totalIngresos - totalEgresos)}</span></div>
            </div>
            <div className="stats-grid" style={{ marginTop: '20px' }}>
               <div className="glass-panel stat-card"><span className="text-muted">Egresos: Personal</span><span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoPlanilla)}</span></div>
               <div className="glass-panel stat-card"><span className="text-muted">Egresos: SUNAT/Contador</span><span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoSunat)}</span></div>
               <div className="glass-panel stat-card"><span className="text-muted">Egresos: Producción (Talleres)</span><span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoTalleres)}</span></div>
            </div>
          </div>
        )}

        {/* VENTAS */}
        {activeView === 'ventas' && (
          <div className="fade-in">
             <header className="header">
              <div><h1>Entregas y Cobros a Clientes</h1><p className="text-muted">Control de mercadería entregada a clientes y sus pagos a cuenta.</p></div>
              <button className="btn btn-primary" onClick={() => setIsModalVentasOpen(true)}>Registrar Entrega / Cobro</button>
            </header>
            <div className="glass-panel table-container">
              {ventas.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p> : (
                <table style={{ fontSize: '0.85rem' }}>
                  <thead><tr><th>Fecha Entrega</th><th>Cód. / Modelo</th><th>Resp.</th><th>Cant.</th><th>Precio</th><th>Valor Total</th><th>A Cuenta</th><th>Tipo Pago</th><th>Cliente</th><th>Saldo</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {ventas.map((v) => {
                      const saldo = v.totalValue - v.paidAmount;
                      return (
                        <tr key={v.id}>
                          <td style={{ color: 'var(--text-muted)' }}>{v.date}</td>
                          <td style={{ fontWeight: 600 }}>{v.code} <br/><span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>{v.model}</span></td>
                          <td>{v.responsible}</td><td>{v.quantity}</td><td>{formatCurrency(v.price)}</td><td style={{ fontWeight: 600 }}>{formatCurrency(v.totalValue)}</td><td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(v.paidAmount)}</td><td><span className="badge badge-blue">{v.paymentType}</span><br/><span style={{ fontSize: '0.7rem' }}>{v.bank}</span></td><td style={{ fontWeight: 500 }}>{v.client}</td><td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}</span></td><td style={{ textAlign: 'center' }}><button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteVenta(v.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* PLANILLA DE PERSONAL */}
        {activeView === 'planilla' && (
          <div className="fade-in">
             <header className="header">
              <div><h1>Planilla de Personal</h1><p className="text-muted">Control de horas trabajadas y pagos (Ej. Anngela).</p></div>
              <button className="btn btn-primary" onClick={() => setIsModalPlanillaOpen(true)}>Registrar Planilla</button>
            </header>
            <div className="glass-panel table-container">
              {planilla.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p> : (
                <table style={{ fontSize: '0.85rem' }}>
                  <thead><tr><th>Nombre</th><th>Desde</th><th>Hasta</th><th>Horas</th><th>Total Ganado</th><th>Pagado / Adelanto</th><th>Saldo</th><th>Fecha Pago</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {planilla.map((p) => {
                      const saldo = p.total - p.paidAmount;
                      return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.periodFrom || '-'}</td><td style={{ color: 'var(--text-muted)' }}>{p.periodTo || '-'}</td><td style={{ fontWeight: 500 }}>{p.hours ? p.hours : '-'}</td><td style={{ fontWeight: 600 }}>{formatCurrency(p.total)}</td><td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(p.paidAmount)}</td><td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}</span></td><td style={{ color: 'var(--text-muted)' }}>{p.paymentDate || '-'}</td><td style={{ textAlign: 'center' }}><button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeletePlanilla(p.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* CONTADOR Y SUNAT */}
        {activeView === 'sunat' && (
          <div className="fade-in">
             <header className="header">
              <div><h1>Contador y SUNAT</h1><p className="text-muted">Control de honorarios, impuestos y fraccionamientos.</p></div>
              <button className="btn btn-primary" onClick={() => setIsModalSunatOpen(true)}>Registrar Impuesto / Honorario</button>
            </header>
            <div className="glass-panel table-container">
              {sunat.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p> : (
                <table style={{ fontSize: '0.85rem' }}>
                  <thead><tr><th>Fecha</th><th>Descripción / Concepto</th><th>Deuda Total</th><th>Pagado / Adelanto</th><th>Saldo</th><th>Fecha de Pago</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {sunat.map((s) => {
                      const saldo = s.total - s.paidAmount;
                      return (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{s.date || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{s.description}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(s.total)}</td>
                        <td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(s.paidAmount)}</td>
                        <td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{s.paymentDate || '-'}</td>
                        <td style={{ textAlign: 'center' }}><button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteSunat(s.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* INSUMOS */}
        {activeView === 'insumos' && (
          <div className="fade-in">
             <header className="header">
              <div><h1>Compras a Crédito (Insumos)</h1><p className="text-muted">Control de telas, avíos y deudas con proveedores (Ej. MASVAL).</p></div>
              <button className="btn btn-primary" onClick={() => setIsModalInsumosOpen(true)}>Registrar Compra / Pago</button>
            </header>
            <div className="glass-panel table-container">
              {insumos.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p> : (
                <table>
                  <thead><tr><th>Fecha Compra</th><th>Proveedor / Nombre</th><th>Descripción / Factura</th><th>Total Deuda</th><th>Adelanto / Pagado</th><th>Saldo</th><th>Fecha de Pago</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {insumos.map((i) => {
                      const saldo = i.totalCost - i.paidAmount;
                      return (
                      <tr key={i.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i.date}</td><td style={{ fontWeight: 600 }}>{i.provider}</td><td style={{ fontWeight: 500 }}>{i.invoice}</td><td style={{ fontWeight: 600 }}>{formatCurrency(i.totalCost)}</td><td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(i.paidAmount)}</td><td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}</span></td><td style={{ color: 'var(--text-muted)' }}>{i.paymentDate || '-'}</td><td style={{ textAlign: 'center' }}><button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteInsumo(i.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TALLERES & SERVICIOS */}
        {activeView === 'corte' && (<div className="fade-in"><header className="header"><div><h1>Producción: Corte</h1><p className="text-muted">Control de lotes y saldo del cortador.</p></div><button className="btn btn-primary" onClick={() => openTallerModal('Corte')}>Registrar Lote de Corte</button></header>{renderTalleresTable(lotesCorte)}</div>)}
        {activeView === 'costura' && (<div className="fade-in"><header className="header"><div><h1>Producción: Costura (Confección)</h1><p className="text-muted">Control de lotes entregados a talleres externos.</p></div><button className="btn btn-primary" onClick={() => openTallerModal('Costura')}>Registrar Lote de Costura</button></header>{renderTalleresTable(lotesCostura)}</div>)}
        {activeView === 'bordado' && (<div className="fade-in"><header className="header"><div><h1>Producción: Bordados</h1><p className="text-muted">Control de lotes entregados a bordadores.</p></div><button className="btn btn-primary" onClick={() => openTallerModal('Bordado')}>Registrar Lote de Bordado</button></header>{renderTalleresTable(lotesBordado)}</div>)}
        {activeView === 'servicio' && (<div className="fade-in"><header className="header"><div><h1>Otros Servicios</h1><p className="text-muted">Lavado, planchado u otros servicios externos.</p></div><button className="btn btn-primary" onClick={() => openTallerModal('Servicio')}>Registrar Servicio</button></header>{renderTalleresTable(lotesServicio)}</div>)}

        {/* CAJA CHICA */}
        {activeView === 'cajachica' && (
           <div className="fade-in">
           <header className="header">
             <div><h1>Caja Chica</h1><p className="text-muted">Registro de ingresos y gastos diarios menores.</p></div>
             <button className="btn btn-primary" onClick={() => setIsModalCajaChicaOpen(true)}>Registrar Movimiento</button>
           </header>
           <div className="glass-panel table-container">
              {cajaChica.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros.</p> : (
                <table>
                  <thead><tr><th>Fecha</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Ingreso (S/.)</th><th style={{ textAlign: 'right' }}>Egreso (S/.)</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {cajaChica.map((c) => (
                      <tr key={c.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{c.date}</td>
                        <td style={{ fontWeight: 500 }}>{c.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>{c.type === 'Ingreso' ? `+ ${formatCurrency(c.amount)}` : '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{c.type === 'Egreso' ? `- ${formatCurrency(c.amount)}` : '-'}</td>
                        <td style={{ textAlign: 'center' }}><button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteCajaChica(c.id)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
        </div>
        )}
      </main>

      {/* --- MODALS --- */}
      
      {/* 1. Modal Ventas */}
      <Modal isOpen={isModalVentasOpen} onClose={() => setIsModalVentasOpen(false)} title="Registrar Entrega / Cobro">
        <form onSubmit={handleAddVenta}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Fecha de Entrega</label><input type="date" className="form-control" value={formVenta.date} onChange={e => setFormVenta({...formVenta, date: e.target.value})} required/></div>
            <div className="form-group"><label>Código de Pedido</label><input type="text" className="form-control" placeholder="Ej. M09" value={formVenta.code} onChange={e => setFormVenta({...formVenta, code: e.target.value})} required/></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Modelo / Gorra</label><input type="text" className="form-control" placeholder="Ej. CURVO" value={formVenta.model} onChange={e => setFormVenta({...formVenta, model: e.target.value})} required/></div>
            <div className="form-group"><label>Cliente</label><input type="text" className="form-control" placeholder="Ej. JHONY" value={formVenta.client} onChange={e => setFormVenta({...formVenta, client: e.target.value})} required/></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
             <div className="form-group"><label>Responsable</label><input type="text" className="form-control" placeholder="Ej. MILY" value={formVenta.responsible} onChange={e => setFormVenta({...formVenta, responsible: e.target.value})} /></div>
             <div className="form-group"><label>Cantidad</label><input type="number" className="form-control" placeholder="300" value={formVenta.quantity} onChange={e => setFormVenta({...formVenta, quantity: e.target.value})} required/></div>
             <div className="form-group"><label>Precio Venta</label><input type="number" step="0.10" className="form-control" placeholder="20.00" value={formVenta.price} onChange={e => setFormVenta({...formVenta, price: e.target.value})} required/></div>
          </div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado (A Cuenta)</label><input type="number" step="0.10" className="form-control" placeholder="S/." value={formVenta.paidAmount} onChange={e => setFormVenta({...formVenta, paidAmount: e.target.value})} /></div>
            <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={formVenta.paymentDate} onChange={e => setFormVenta({...formVenta, paymentDate: e.target.value})} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Tipo de Pago</label>
              <select className="form-control" value={formVenta.paymentType} onChange={e => setFormVenta({...formVenta, paymentType: e.target.value})}>
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                <option value="WESTER">WESTER UNION</option>
              </select>
            </div>
            <div className="form-group">
              <label>Banco (Opcional)</label>
              <select className="form-control" value={formVenta.bank} onChange={e => setFormVenta({...formVenta, bank: e.target.value})}>
                <option value="">Ninguno</option>
                <option value="BCP">BCP</option>
                <option value="BBVA">BBVA</option>
                <option value="INTERBANK">INTERBANK</option>
              </select>
            </div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalVentasOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar Registro</button></div>
        </form>
      </Modal>

      {/* 2. Modal Planilla Personal */}
      <Modal isOpen={isModalPlanillaOpen} onClose={() => setIsModalPlanillaOpen(false)} title="Registrar Planilla (Personal)">
        <form onSubmit={handleAddPlanilla}>
          <div className="form-group"><label>Nombre del Trabajador</label><input type="text" className="form-control" placeholder="Ej. ANNGELA" value={formPlanilla.name} onChange={e => setFormPlanilla({...formPlanilla, name: e.target.value})} required/></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
             <div className="form-group"><label>Desde</label><input type="date" className="form-control" value={formPlanilla.periodFrom} onChange={e => setFormPlanilla({...formPlanilla, periodFrom: e.target.value})} required/></div>
             <div className="form-group"><label>Hasta</label><input type="date" className="form-control" value={formPlanilla.periodTo} onChange={e => setFormPlanilla({...formPlanilla, periodTo: e.target.value})} required/></div>
             <div className="form-group"><label>Horas</label><input type="number" step="0.01" className="form-control" placeholder="Ej. 51.44" value={formPlanilla.hours} onChange={e => setFormPlanilla({...formPlanilla, hours: e.target.value})} required/></div>
          </div>
          <div className="form-group"><label>Total a Pagar (S/.)</label><input type="number" step="0.10" className="form-control" value={formPlanilla.total} onChange={e => setFormPlanilla({...formPlanilla, total: e.target.value})} required/></div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado / Adelanto (S/.)</label><input type="number" step="0.10" className="form-control" value={formPlanilla.paidAmount} onChange={e => setFormPlanilla({...formPlanilla, paidAmount: e.target.value})} /></div>
            <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={formPlanilla.paymentDate} onChange={e => setFormPlanilla({...formPlanilla, paymentDate: e.target.value})} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalPlanillaOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar Registro</button></div>
        </form>
      </Modal>

      {/* 2B. Modal SUNAT/Contador */}
      <Modal isOpen={isModalSunatOpen} onClose={() => setIsModalSunatOpen(false)} title="Registrar SUNAT / Contador">
        <form onSubmit={handleAddSunat}>
          <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={formSunat.date} onChange={e => setFormSunat({...formSunat, date: e.target.value})} /></div>
          <div className="form-group"><label>Descripción / Concepto</label><input type="text" className="form-control" placeholder="Ej. HONORARIO ENERO" value={formSunat.description} onChange={e => setFormSunat({...formSunat, description: e.target.value})} required/></div>
          <div className="form-group"><label>Deuda Total (S/.)</label><input type="number" step="0.10" className="form-control" value={formSunat.total} onChange={e => setFormSunat({...formSunat, total: e.target.value})} required/></div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado (S/.)</label><input type="number" step="0.10" className="form-control" value={formSunat.paidAmount} onChange={e => setFormSunat({...formSunat, paidAmount: e.target.value})} /></div>
            <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={formSunat.paymentDate} onChange={e => setFormSunat({...formSunat, paymentDate: e.target.value})} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalSunatOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar Registro</button></div>
        </form>
      </Modal>

      {/* 3. Modal Insumos */}
      <Modal isOpen={isModalInsumosOpen} onClose={() => setIsModalInsumosOpen(false)} title="Registrar Compra / Crédito de Insumos">
        <form onSubmit={handleAddInsumo}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div className="form-group"><label>Fecha de Compra</label><input type="date" className="form-control" value={formInsumo.date} onChange={e => setFormInsumo({...formInsumo, date: e.target.value})} required/></div>
             <div className="form-group"><label>Proveedor / Nombre</label><input type="text" className="form-control" placeholder="Ej. MASVAL" value={formInsumo.provider} onChange={e => setFormInsumo({...formInsumo, provider: e.target.value})} required/></div>
          </div>
          <div className="form-group"><label>Descripción / Factura</label><input type="text" className="form-control" placeholder="Ej. FA04-5189" value={formInsumo.invoice} onChange={e => setFormInsumo({...formInsumo, invoice: e.target.value})} required/></div>
          <div className="form-group"><label>Total Deuda (S/.)</label><input type="number" step="0.10" className="form-control" value={formInsumo.totalCost} onChange={e => setFormInsumo({...formInsumo, totalCost: e.target.value})} required/></div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado / Adelanto (S/.)</label><input type="number" step="0.10" className="form-control" value={formInsumo.paidAmount} onChange={e => setFormInsumo({...formInsumo, paidAmount: e.target.value})} /></div>
            <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={formInsumo.paymentDate} onChange={e => setFormInsumo({...formInsumo, paymentDate: e.target.value})} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalInsumosOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar Registro</button></div>
        </form>
      </Modal>

      {/* 4. Modal Talleres (Corte, Costura, Bordado, Servicio) */}
      <Modal isOpen={isModalTallerOpen} onClose={() => setIsModalTallerOpen(false)} title={`Registrar - ${formTallerType}`}>
        <form onSubmit={handleAddTaller}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Estilo / Nombre</label><input type="text" className="form-control" placeholder="Ej. CURVO" value={formTaller.style} onChange={(e) => setFormTaller({...formTaller, style: e.target.value})} required /></div>
            <div className="form-group"><label>Lote / Código</label><input type="text" className="form-control" placeholder="Ej. M03" value={formTaller.code} onChange={(e) => setFormTaller({...formTaller, code: e.target.value})} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={formTaller.date} onChange={(e) => setFormTaller({...formTaller, date: e.target.value})} required /></div>
            <div className="form-group"><label>{formTallerType === 'Corte' ? 'Taller Entregado' : 'Responsable / Taller'}</label><input type="text" className="form-control" placeholder="Ej. MILY" value={formTaller.provider} onChange={(e) => setFormTaller({...formTaller, provider: e.target.value})} required /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Cantidad</label><input type="number" className="form-control" placeholder="300" value={formTaller.quantity} onChange={(e) => setFormTaller({...formTaller, quantity: e.target.value})} required /></div>
            <div className="form-group"><label>Precio Unitario (S/.)</label><input type="number" step="0.01" className="form-control" placeholder="0.5" value={formTaller.unitPrice} onChange={(e) => setFormTaller({...formTaller, unitPrice: e.target.value})} required /></div>
          </div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado / Adelanto</label><input type="number" step="0.10" className="form-control" value={formTaller.paidAmount} onChange={(e) => setFormTaller({...formTaller, paidAmount: e.target.value})} /></div>
            <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={formTaller.paymentDate} onChange={(e) => setFormTaller({...formTaller, paymentDate: e.target.value})} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalTallerOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar Registro</button></div>
        </form>
      </Modal>

      {/* 5. Modal Caja Chica */}
      <Modal isOpen={isModalCajaChicaOpen} onClose={() => setIsModalCajaChicaOpen(false)} title="Nuevo Movimiento - Caja Chica">
        <form onSubmit={handleAddCajaChica}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={formCajaChica.date} onChange={e => setFormCajaChica({...formCajaChica, date: e.target.value})} required/></div>
             <div className="form-group"><label>Tipo de Movimiento</label><select className="form-control" value={formCajaChica.type} onChange={e => setFormCajaChica({...formCajaChica, type: e.target.value})}><option value="Egreso">Egreso (Gasto)</option><option value="Ingreso">Ingreso (Fondo)</option></select></div>
          </div>
          <div className="form-group"><label>Descripción / Motivo</label><input type="text" className="form-control" placeholder="Ej. Pasajes Gamarra" value={formCajaChica.description} onChange={e => setFormCajaChica({...formCajaChica, description: e.target.value})} required/></div>
          <div className="form-group"><label>Monto (S/.)</label><input type="number" step="0.10" className="form-control" value={formCajaChica.amount} onChange={e => setFormCajaChica({...formCajaChica, amount: e.target.value})} required/></div>
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalCajaChicaOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">Guardar</button></div>
        </form>
      </Modal>

    </div>
  );
}

export default App;
