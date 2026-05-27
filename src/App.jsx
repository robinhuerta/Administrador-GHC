import { useState, useEffect } from 'react';
import { useFirestoreCollection } from './hooks/useFirestoreCollection';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import Modal from './components/Modal';
import './index.css';

function App() {
  const [activeView, setActiveView] = useState('dashboard'); 
  const [editingId, setEditingId] = useState(null);

  // --- AUTH STATES ---
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (error) {
      setLoginError("Credenciales incorrectas. Intenta de nuevo.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };
  
  // --- STATES (Firebase Firestore) ---
  const [ventas, addVenta, deleteVenta, updateVenta] = useFirestoreCollection('ghc_ventas');
  const [planilla, addPlanilla, deletePlanilla, updatePlanilla] = useFirestoreCollection('ghc_planilla');
  const [sunat, addSunat, deleteSunat, updateSunat] = useFirestoreCollection('ghc_sunat');
  const [lotesTalleres, addTaller, deleteTaller, updateTaller] = useFirestoreCollection('ghc_lotes_talleres');
  const [insumos, addInsumo, deleteInsumo, updateInsumo] = useFirestoreCollection('ghc_insumos');
  const [cajaChica, addCajaChica, deleteCajaChica, updateCajaChica] = useFirestoreCollection('ghc_cajachica');

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

  // --- FILTERS ---
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // --- CALCULATIONS ---
  const totalIngresos = ventas.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const totalPagadoTalleres = lotesTalleres.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const totalPagadoPlanilla = planilla.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const totalPagadoSunat = sunat.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const totalPagadoInsumos = insumos.reduce((acc, curr) => acc + (parseFloat(curr.paidAmount) || 0), 0);
  const egresosCajaChica = cajaChica.filter(c => c.type === 'Egreso').reduce((acc, curr) => acc + curr.amount, 0);

  const totalEgresos = totalPagadoPlanilla + totalPagadoSunat + totalPagadoTalleres + totalPagadoInsumos + egresosCajaChica;

  const saldoPorCobrarClientes = ventas.reduce((acc, curr) => acc + ((parseFloat(curr.totalValue) || 0) - (parseFloat(curr.paidAmount) || 0)), 0);
  const deudaTalleres = lotesTalleres.reduce((acc, curr) => acc + ((parseFloat(curr.totalCost) || 0) - (parseFloat(curr.paidAmount) || 0)), 0);
  const deudaPlanilla = planilla.reduce((acc, curr) => acc + ((parseFloat(curr.total) || 0) - (parseFloat(curr.paidAmount) || 0)), 0);
  const deudaSunat = sunat.reduce((acc, curr) => acc + ((parseFloat(curr.total) || 0) - (parseFloat(curr.paidAmount) || 0)), 0);
  const deudaInsumos = insumos.reduce((acc, curr) => acc + ((parseFloat(curr.totalCost) || 0) - (parseFloat(curr.paidAmount) || 0)), 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return alert('No hay datos para exportar.');
    const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'createdAt');
    const csvContent = [
      keys.join(','),
      ...data.map(row => keys.map(k => `"${row[k] !== undefined ? row[k] : ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename + ".csv";
    link.click();
  };

  // --- FILTERS LOGIC ---
  const applyFilters = (item) => {
    const query = searchQuery.toLowerCase();
    const matchSearch = !query || 
      (item.provider && item.provider.toLowerCase().includes(query)) ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.client && item.client.toLowerCase().includes(query)) ||
      (item.code && item.code.toLowerCase().includes(query)) ||
      (item.style && item.style.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query));
      
    const matchDate = !dateFilter || item.date === dateFilter || item.paymentDate === dateFilter || item.periodFrom === dateFilter;

    return matchSearch && matchDate;
  };

  const filteredVentas = ventas.filter(applyFilters);
  const filteredPlanilla = planilla.filter(applyFilters);
  const filteredSunat = sunat.filter(applyFilters);
  const filteredInsumos = insumos.filter(applyFilters);
  const filteredCajaChica = cajaChica.filter(applyFilters);

  const lotesCorte = lotesTalleres.filter(t => t.type === 'Corte').filter(applyFilters);
  const lotesCostura = lotesTalleres.filter(t => t.type === 'Costura').filter(applyFilters);
  const lotesBordado = lotesTalleres.filter(t => t.type === 'Bordado').filter(applyFilters);
  const lotesServicio = lotesTalleres.filter(t => t.type === 'Servicio').filter(applyFilters);

  // --- HANDLERS (Add/Edit) ---
  const handleEdit = (item, setForm, setModal) => {
    setEditingId(item.id);
    setForm(item);
    setModal(true);
  };

  const handleAddVenta = (e) => { 
    e.preventDefault(); 
    const qty = parseFloat(formVenta.quantity) || 0; 
    const price = parseFloat(formVenta.price) || 0; 
    const data = { date: formVenta.date, code: formVenta.code, client: formVenta.client, model: formVenta.model, responsible: formVenta.responsible, quantity: qty, price: price, totalValue: qty * price, paidAmount: parseFloat(formVenta.paidAmount) || 0, paymentType: formVenta.paymentType, bank: formVenta.bank || '-', paymentDate: formVenta.paymentDate };
    if (editingId) updateVenta(editingId, data); else addVenta(data);
    setIsModalVentasOpen(false); setEditingId(null);
    setFormVenta({ date: '', code: '', client: '', model: '', responsible: '', quantity: '', price: '', paidAmount: '', paymentType: 'EFECTIVO', bank: '', paymentDate: '' }); 
  };
  const handleDeleteVenta = (id) => deleteVenta(id);

  const handleAddPlanilla = (e) => { 
    e.preventDefault(); 
    const data = { name: formPlanilla.name, periodFrom: formPlanilla.periodFrom, periodTo: formPlanilla.periodTo, hours: parseFloat(formPlanilla.hours) || 0, total: parseFloat(formPlanilla.total) || 0, paidAmount: parseFloat(formPlanilla.paidAmount) || 0, paymentDate: formPlanilla.paymentDate };
    if (editingId) updatePlanilla(editingId, data); else addPlanilla(data);
    setIsModalPlanillaOpen(false); setEditingId(null);
    setFormPlanilla({ name: '', periodFrom: '', periodTo: '', hours: '', total: '', paidAmount: '', paymentDate: '' }); 
  };
  const handleDeletePlanilla = (id) => deletePlanilla(id);

  const handleAddSunat = (e) => { 
    e.preventDefault(); 
    const data = { date: formSunat.date, description: formSunat.description, total: parseFloat(formSunat.total) || 0, paidAmount: parseFloat(formSunat.paidAmount) || 0, paymentDate: formSunat.paymentDate };
    if (editingId) updateSunat(editingId, data); else addSunat(data);
    setIsModalSunatOpen(false); setEditingId(null);
    setFormSunat({ date: '', description: '', total: '', paidAmount: '', paymentDate: '' }); 
  };
  const handleDeleteSunat = (id) => deleteSunat(id);

  const handleAddInsumo = (e) => { 
    e.preventDefault(); 
    const data = { date: formInsumo.date, provider: formInsumo.provider, invoice: formInsumo.invoice, totalCost: parseFloat(formInsumo.totalCost) || 0, paidAmount: parseFloat(formInsumo.paidAmount) || 0, paymentDate: formInsumo.paymentDate };
    if (editingId) updateInsumo(editingId, data); else addInsumo(data);
    setIsModalInsumosOpen(false); setEditingId(null);
    setFormInsumo({ date: '', provider: '', invoice: '', totalCost: '', paidAmount: '', paymentDate: '' }); 
  };
  const handleDeleteInsumo = (id) => deleteInsumo(id);

  const openTallerModal = (type) => { setEditingId(null); setFormTallerType(type); setIsModalTallerOpen(true); };
  const handleAddTaller = (e) => { 
    e.preventDefault(); 
    const qty = parseFloat(formTaller.quantity) || 0; 
    const price = parseFloat(formTaller.unitPrice) || 0; 
    const data = { type: formTallerType, date: formTaller.date, code: formTaller.code, style: formTaller.style, quantity: qty, provider: formTaller.provider, unitPrice: price, totalCost: qty * price, paidAmount: parseFloat(formTaller.paidAmount) || 0, paymentDate: formTaller.paymentDate };
    if (editingId) updateTaller(editingId, data); else addTaller(data);
    setIsModalTallerOpen(false); setEditingId(null);
    setFormTaller({ style: '', date: '', code: '', quantity: '', provider: '', unitPrice: '', paidAmount: '', paymentDate: '' }); 
  };
  const handleDeleteTaller = (id) => deleteTaller(id);

  const handleAddCajaChica = (e) => { 
    e.preventDefault(); 
    const data = { date: formCajaChica.date, description: formCajaChica.description, type: formCajaChica.type, amount: parseFloat(formCajaChica.amount) };
    if (editingId) updateCajaChica(editingId, data); else addCajaChica(data);
    setIsModalCajaChicaOpen(false); setEditingId(null);
    setFormCajaChica({ date: '', description: '', type: 'Egreso', amount: '' }); 
  };
  const handleDeleteCajaChica = (id) => deleteCajaChica(id);

  // --- RENDER HELPERS ---
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
                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} onClick={() => handleEdit(t, setFormTaller, setIsModalTallerOpen)}>✎</button>
                    <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteTaller(t.id)}>🗑</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  if (isAuthChecking) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>Cargando sistema...</div>;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', background: 'var(--bg-dark)' }}>
        <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '40px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>GHC Gorras ERP</h1>
            <p className="text-muted">Acceso restringido al personal autorizado</p>
          </div>
          {loginError && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Correo Electrónico</label>
              <input type="email" className="form-control" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label>Contraseña</label>
              <input type="password" className="form-control" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem' }}>Iniciar Sesión</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>GHC <span>Gorras</span></div>
        <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Principal</div>
        <nav className="nav-menu" style={{ marginBottom: '24px' }}>
          <a className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>Caja General</a>
          <a className={`nav-item ${activeView === 'ventas' ? 'active' : ''}`} onClick={() => setActiveView('ventas')}>Cobros a Clientes</a>
        </nav>
        <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Egresos y Pagos</div>
        <nav className="nav-menu">
          <a className={`nav-item ${activeView === 'planilla' ? 'active' : ''}`} onClick={() => setActiveView('planilla')}>Planilla de Personal</a>
          <a className={`nav-item ${activeView === 'sunat' ? 'active' : ''}`} onClick={() => setActiveView('sunat')}>Contador y SUNAT</a>
          <a className={`nav-item ${activeView === 'insumos' ? 'active' : ''}`} onClick={() => setActiveView('insumos')}>Compras / Créditos</a>
          <a className={`nav-item ${activeView === 'corte' ? 'active' : ''}`} onClick={() => setActiveView('corte')}>Producción: Corte</a>
          <a className={`nav-item ${activeView === 'costura' ? 'active' : ''}`} onClick={() => setActiveView('costura')}>Producción: Costura</a>
          <a className={`nav-item ${activeView === 'bordado' ? 'active' : ''}`} onClick={() => setActiveView('bordado')}>Producción: Bordados</a>
          <a className={`nav-item ${activeView === 'servicio' ? 'active' : ''}`} onClick={() => setActiveView('servicio')}>Otros Servicios</a>
          <a className={`nav-item ${activeView === 'cajachica' ? 'active' : ''}`} onClick={() => setActiveView('cajachica')}>Caja Chica</a>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
          <button className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--danger)', display: 'flex', justifyContent: 'flex-start', cursor: 'pointer' }} onClick={handleLogout}>🚪 Cerrar Sesión</button>
        </div>
      </aside>

      <main className="main-content">
        {activeView !== 'dashboard' && (
          <div className="glass-panel fade-in" style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>🔍 Filtros:</span>
            <input type="text" className="form-control" style={{ flex: 1, minWidth: '200px' }} placeholder="Buscar por persona, taller, código o lote..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <input type="date" className="form-control" style={{ width: 'auto' }} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
            {(searchQuery || dateFilter) && (
              <button className="btn btn-danger" style={{ padding: '10px 16px' }} onClick={() => { setSearchQuery(''); setDateFilter(''); }}>Limpiar</button>
            )}
          </div>
        )}

        {/* CAJA GENERAL */}
        {activeView === 'dashboard' && (
          <div className="fade-in">
            <header className="header"><div><h1>Caja General</h1><p className="text-muted">Resumen global de liquidez (Conectado a Firebase 🔥).</p></div></header>
            <div className="stats-grid">
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #34d399' }}><span className="text-muted">Total Cobrado (Ingresos)</span><span className="stat-value" style={{ color: '#34d399' }}>{formatCurrency(totalIngresos)}</span></div>
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #ef4444' }}><span className="text-muted">Egresos Totales</span><span className="stat-value" style={{ color: '#ef4444' }}>{formatCurrency(totalEgresos)}</span></div>
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid var(--accent)' }}><span className="text-muted">Saldo Neto en Caja</span><span className="stat-value">{formatCurrency(totalIngresos - totalEgresos)}</span></div>
            </div>
            <div className="stats-grid" style={{ marginTop: '20px' }}>
               <div className="glass-panel stat-card"><span className="text-muted">Egresos: Personal</span><span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoPlanilla)}</span></div>
               <div className="glass-panel stat-card"><span className="text-muted">Egresos: SUNAT/Contador</span><span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoSunat)}</span></div>
               <div className="glass-panel stat-card"><span className="text-muted">Egresos: Producción (Talleres)</span><span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoTalleres)}</span></div>
            </div>

            <h2 style={{ marginTop: '40px', marginBottom: '20px', fontSize: '1.25rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              Estado de Deudas (Cuentas por Cobrar y Pagar)
            </h2>
            <div className="stats-grid">
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)' }}>
                <span className="text-muted">Por Cobrar a Clientes</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(saldoPorCobrarClientes)}</span>
              </div>
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
                <span className="text-muted">Deuda a Talleres</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(deudaTalleres)}</span>
              </div>
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
                <span className="text-muted">Deuda a Personal (Planilla)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(deudaPlanilla)}</span>
              </div>
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
                <span className="text-muted">Deuda por Insumos</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(deudaInsumos)}</span>
              </div>
              <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' }}>
                <span className="text-muted">Deuda a SUNAT/Contador</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 600, color: '#f59e0b' }}>{formatCurrency(deudaSunat)}</span>
              </div>
            </div>
          </div>
        )}

        {/* VENTAS */}
        {activeView === 'ventas' && (
          <div className="fade-in">
             <header className="header">
              <div><h1>Entregas y Cobros a Clientes</h1><p className="text-muted">Control de mercadería entregada a clientes y sus pagos a cuenta.</p></div>
              <div style={{display:'flex', gap:'8px'}}>
                <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filteredVentas, 'Cobros')}>📊 Exportar Excel</button>
                <button className="btn btn-primary" onClick={() => {setEditingId(null); setFormVenta({ date: '', code: '', client: '', model: '', responsible: '', quantity: '', price: '', paidAmount: '', paymentType: 'EFECTIVO', bank: '', paymentDate: '' }); setIsModalVentasOpen(true)}}>Registrar Entrega / Cobro</button>
              </div>
            </header>
            <div className="glass-panel table-container">
              {filteredVentas.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p> : (
                <table style={{ fontSize: '0.85rem' }}>
                  <thead><tr><th>Fecha Entrega</th><th>Cód. / Modelo</th><th>Resp.</th><th>Cant.</th><th>Precio</th><th>Valor Total</th><th>A Cuenta</th><th>Tipo Pago</th><th>Cliente</th><th>Saldo</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {filteredVentas.map((v) => {
                      const saldo = v.totalValue - v.paidAmount;
                      return (
                        <tr key={v.id}>
                          <td style={{ color: 'var(--text-muted)' }}>{v.date}</td>
                          <td style={{ fontWeight: 600 }}>{v.code} <br/><span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>{v.model}</span></td>
                          <td>{v.responsible}</td><td>{v.quantity}</td><td>{formatCurrency(v.price)}</td><td style={{ fontWeight: 600 }}>{formatCurrency(v.totalValue)}</td><td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(v.paidAmount)}</td><td><span className="badge badge-blue">{v.paymentType}</span><br/><span style={{ fontSize: '0.7rem' }}>{v.bank}</span></td><td style={{ fontWeight: 500 }}>{v.client}</td><td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}</span></td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} onClick={() => handleEdit(v, setFormVenta, setIsModalVentasOpen)}>✎</button>
                            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteVenta(v.id)}>🗑</button>
                          </td>
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
              <div style={{display:'flex', gap:'8px'}}>
                <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filteredPlanilla, 'Planilla')}>📊 Exportar Excel</button>
                <button className="btn btn-primary" onClick={() => {setEditingId(null); setFormPlanilla({ name: '', periodFrom: '', periodTo: '', hours: '', total: '', paidAmount: '', paymentDate: '' }); setIsModalPlanillaOpen(true)}}>Registrar Planilla</button>
              </div>
            </header>
            <div className="glass-panel table-container">
              {filteredPlanilla.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p> : (
                <table style={{ fontSize: '0.85rem' }}>
                  <thead><tr><th>Nombre</th><th>Desde</th><th>Hasta</th><th>Horas</th><th>Total Ganado</th><th>Pagado / Adelanto</th><th>Saldo</th><th>Fecha Pago</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {filteredPlanilla.map((p) => {
                      const saldo = p.total - p.paidAmount;
                      return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{p.periodFrom || '-'}</td><td style={{ color: 'var(--text-muted)' }}>{p.periodTo || '-'}</td><td style={{ fontWeight: 500 }}>{p.hours ? p.hours : '-'}</td><td style={{ fontWeight: 600 }}>{formatCurrency(p.total)}</td><td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(p.paidAmount)}</td><td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}</span></td><td style={{ color: 'var(--text-muted)' }}>{p.paymentDate || '-'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} onClick={() => handleEdit(p, setFormPlanilla, setIsModalPlanillaOpen)}>✎</button>
                            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeletePlanilla(p.id)}>🗑</button>
                        </td>
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
              <div style={{display:'flex', gap:'8px'}}>
                <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filteredSunat, 'Sunat')}>📊 Exportar Excel</button>
                <button className="btn btn-primary" onClick={() => {setEditingId(null); setFormSunat({ date: '', description: '', total: '', paidAmount: '', paymentDate: '' }); setIsModalSunatOpen(true)}}>Registrar Impuesto / Honorario</button>
              </div>
            </header>
            <div className="glass-panel table-container">
              {filteredSunat.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p> : (
                <table style={{ fontSize: '0.85rem' }}>
                  <thead><tr><th>Fecha</th><th>Descripción / Concepto</th><th>Deuda Total</th><th>Pagado / Adelanto</th><th>Saldo</th><th>Fecha de Pago</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {filteredSunat.map((s) => {
                      const saldo = s.total - s.paidAmount;
                      return (
                      <tr key={s.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{s.date || '-'}</td>
                        <td style={{ fontWeight: 600 }}>{s.description}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(s.total)}</td>
                        <td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(s.paidAmount)}</td>
                        <td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{s.paymentDate || '-'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} onClick={() => handleEdit(s, setFormSunat, setIsModalSunatOpen)}>✎</button>
                            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteSunat(s.id)}>🗑</button>
                        </td>
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
              <div style={{display:'flex', gap:'8px'}}>
                <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filteredInsumos, 'Insumos')}>📊 Exportar Excel</button>
                <button className="btn btn-primary" onClick={() => {setEditingId(null); setFormInsumo({ date: '', provider: '', invoice: '', totalCost: '', paidAmount: '', paymentDate: '' }); setIsModalInsumosOpen(true)}}>Registrar Compra / Pago</button>
              </div>
            </header>
            <div className="glass-panel table-container">
              {filteredInsumos.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p> : (
                <table>
                  <thead><tr><th>Fecha Compra</th><th>Proveedor / Nombre</th><th>Descripción / Factura</th><th>Total Deuda</th><th>Adelanto / Pagado</th><th>Saldo</th><th>Fecha de Pago</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {filteredInsumos.map((i) => {
                      const saldo = i.totalCost - i.paidAmount;
                      return (
                      <tr key={i.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{i.date}</td><td style={{ fontWeight: 600 }}>{i.provider}</td><td style={{ fontWeight: 500 }}>{i.invoice}</td><td style={{ fontWeight: 600 }}>{formatCurrency(i.totalCost)}</td><td style={{ fontWeight: 600, color: '#34d399' }}>{formatCurrency(i.paidAmount)}</td><td><span style={{ backgroundColor: saldo === 0 ? 'transparent' : 'rgba(239, 68, 68, 0.2)', color: saldo === 0 ? 'var(--text-muted)' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{saldo === 0 ? 'S/. 0.00' : formatCurrency(saldo)}</span></td><td style={{ color: 'var(--text-muted)' }}>{i.paymentDate || '-'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} onClick={() => handleEdit(i, setFormInsumo, setIsModalInsumosOpen)}>✎</button>
                            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteInsumo(i.id)}>🗑</button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TALLERES & SERVICIOS */}
        {activeView === 'corte' && (<div className="fade-in"><header className="header"><div><h1>Producción: Corte</h1><p className="text-muted">Control de lotes y saldo del cortador.</p></div><div style={{display:'flex', gap:'8px'}}><button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(lotesCorte, 'Corte')}>📊 Exportar Excel</button><button className="btn btn-primary" onClick={() => openTallerModal('Corte')}>Registrar Lote de Corte</button></div></header>{renderTalleresTable(lotesCorte)}</div>)}
        {activeView === 'costura' && (<div className="fade-in"><header className="header"><div><h1>Producción: Costura (Confección)</h1><p className="text-muted">Control de lotes entregados a talleres externos.</p></div><div style={{display:'flex', gap:'8px'}}><button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(lotesCostura, 'Costura')}>📊 Exportar Excel</button><button className="btn btn-primary" onClick={() => openTallerModal('Costura')}>Registrar Lote de Costura</button></div></header>{renderTalleresTable(lotesCostura)}</div>)}
        {activeView === 'bordado' && (<div className="fade-in"><header className="header"><div><h1>Producción: Bordados</h1><p className="text-muted">Control de lotes entregados a bordadores.</p></div><div style={{display:'flex', gap:'8px'}}><button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(lotesBordado, 'Bordado')}>📊 Exportar Excel</button><button className="btn btn-primary" onClick={() => openTallerModal('Bordado')}>Registrar Lote de Bordado</button></div></header>{renderTalleresTable(lotesBordado)}</div>)}
        {activeView === 'servicio' && (<div className="fade-in"><header className="header"><div><h1>Otros Servicios</h1><p className="text-muted">Lavado, planchado u otros servicios externos.</p></div><div style={{display:'flex', gap:'8px'}}><button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(lotesServicio, 'Servicios')}>📊 Exportar Excel</button><button className="btn btn-primary" onClick={() => openTallerModal('Servicio')}>Registrar Servicio</button></div></header>{renderTalleresTable(lotesServicio)}</div>)}

        {/* CAJA CHICA */}
        {activeView === 'cajachica' && (
           <div className="fade-in">
           <header className="header">
             <div><h1>Caja Chica</h1><p className="text-muted">Registro de ingresos y gastos diarios menores.</p></div>
             <div style={{display:'flex', gap:'8px'}}>
                <button className="btn" style={{ background: '#3b82f6', color: 'white' }} onClick={() => exportToCSV(filteredCajaChica, 'CajaChica')}>📊 Exportar Excel</button>
                <button className="btn btn-primary" onClick={() => {setEditingId(null); setFormCajaChica({ date: '', description: '', type: 'Egreso', amount: '' }); setIsModalCajaChicaOpen(true)}}>Registrar Movimiento</button>
             </div>
           </header>
           <div className="glass-panel table-container">
              {filteredCajaChica.length === 0 ? <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>No hay registros que coincidan.</p> : (
                <table>
                  <thead><tr><th>Fecha</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Ingreso (S/.)</th><th style={{ textAlign: 'right' }}>Egreso (S/.)</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                  <tbody>
                    {filteredCajaChica.map((c) => (
                      <tr key={c.id}>
                        <td style={{ color: 'var(--text-muted)' }}>{c.date}</td>
                        <td style={{ fontWeight: 500 }}>{c.description}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#34d399' }}>{c.type === 'Ingreso' ? `+ ${formatCurrency(c.amount)}` : '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>{c.type === 'Egreso' ? `- ${formatCurrency(c.amount)}` : '-'}</td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="btn-icon" style={{ color: '#60a5fa', marginRight: '4px' }} onClick={() => handleEdit(c, setFormCajaChica, setIsModalCajaChicaOpen)}>✎</button>
                            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteCajaChica(c.id)}>🗑</button>
                        </td>
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
      <Modal isOpen={isModalVentasOpen} onClose={() => setIsModalVentasOpen(false)} title={editingId ? "Editar Entrega / Cobro" : "Registrar Entrega / Cobro"}>
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
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalVentasOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? "Actualizar" : "Guardar"}</button></div>
        </form>
      </Modal>

      {/* 2. Modal Planilla Personal */}
      <Modal isOpen={isModalPlanillaOpen} onClose={() => setIsModalPlanillaOpen(false)} title={editingId ? "Editar Planilla" : "Registrar Planilla"}>
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
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalPlanillaOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? "Actualizar" : "Guardar"}</button></div>
        </form>
      </Modal>

      {/* 2B. Modal SUNAT/Contador */}
      <Modal isOpen={isModalSunatOpen} onClose={() => setIsModalSunatOpen(false)} title={editingId ? "Editar SUNAT" : "Registrar SUNAT"}>
        <form onSubmit={handleAddSunat}>
          <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={formSunat.date} onChange={e => setFormSunat({...formSunat, date: e.target.value})} /></div>
          <div className="form-group"><label>Descripción / Concepto</label><input type="text" className="form-control" placeholder="Ej. HONORARIO ENERO" value={formSunat.description} onChange={e => setFormSunat({...formSunat, description: e.target.value})} required/></div>
          <div className="form-group"><label>Deuda Total (S/.)</label><input type="number" step="0.10" className="form-control" value={formSunat.total} onChange={e => setFormSunat({...formSunat, total: e.target.value})} required/></div>
          <hr style={{ borderColor: 'var(--border-color)', margin: '16px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group"><label>Monto Pagado (S/.)</label><input type="number" step="0.10" className="form-control" value={formSunat.paidAmount} onChange={e => setFormSunat({...formSunat, paidAmount: e.target.value})} /></div>
            <div className="form-group"><label>Fecha de Pago</label><input type="date" className="form-control" value={formSunat.paymentDate} onChange={e => setFormSunat({...formSunat, paymentDate: e.target.value})} /></div>
          </div>
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalSunatOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? "Actualizar" : "Guardar"}</button></div>
        </form>
      </Modal>

      {/* 3. Modal Insumos */}
      <Modal isOpen={isModalInsumosOpen} onClose={() => setIsModalInsumosOpen(false)} title={editingId ? "Editar Insumo" : "Registrar Insumo"}>
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
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalInsumosOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? "Actualizar" : "Guardar"}</button></div>
        </form>
      </Modal>

      {/* 4. Modal Talleres (Corte, Costura, Bordado, Servicio) */}
      <Modal isOpen={isModalTallerOpen} onClose={() => setIsModalTallerOpen(false)} title={editingId ? `Editar - ${formTallerType}` : `Registrar - ${formTallerType}`}>
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
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalTallerOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? "Actualizar" : "Guardar"}</button></div>
        </form>
      </Modal>

      {/* 5. Modal Caja Chica */}
      <Modal isOpen={isModalCajaChicaOpen} onClose={() => setIsModalCajaChicaOpen(false)} title={editingId ? "Editar Movimiento" : "Nuevo Movimiento"}>
        <form onSubmit={handleAddCajaChica}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div className="form-group"><label>Fecha</label><input type="date" className="form-control" value={formCajaChica.date} onChange={e => setFormCajaChica({...formCajaChica, date: e.target.value})} required/></div>
             <div className="form-group"><label>Tipo de Movimiento</label><select className="form-control" value={formCajaChica.type} onChange={e => setFormCajaChica({...formCajaChica, type: e.target.value})}><option value="Egreso">Egreso (Gasto)</option><option value="Ingreso">Ingreso (Fondo)</option></select></div>
          </div>
          <div className="form-group"><label>Descripción / Motivo</label><input type="text" className="form-control" placeholder="Ej. Pasajes Gamarra" value={formCajaChica.description} onChange={e => setFormCajaChica({...formCajaChica, description: e.target.value})} required/></div>
          <div className="form-group"><label>Monto (S/.)</label><input type="number" step="0.10" className="form-control" value={formCajaChica.amount} onChange={e => setFormCajaChica({...formCajaChica, amount: e.target.value})} required/></div>
          <div className="modal-footer"><button type="button" className="btn btn-danger" onClick={() => setIsModalCajaChicaOpen(false)}>Cancelar</button><button type="submit" className="btn btn-primary">{editingId ? "Actualizar" : "Guardar"}</button></div>
        </form>
      </Modal>

    </div>
  );
}

export default App;
