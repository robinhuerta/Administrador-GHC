import { useState, useEffect } from 'react';
import { useFirestoreCollection } from './hooks/useFirestoreCollection';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import DashboardView from './views/DashboardView';
import VentasView from './views/VentasView';
import PlanillaView from './views/PlanillaView';
import SunatView from './views/SunatView';
import InsumosView from './views/InsumosView';
import TalleresView from './views/TalleresView';
import CajaChicaView from './views/CajaChicaView';
import CleanupView from './views/CleanupView';
import './index.css';

function App() {
  const [activeView, setActiveView] = useState('dashboard');

  // --- AUTH ---
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      if (currentUser && currentUser.email !== 'admin@ghc.com') {
        setActiveView('ventas');
      } else {
        setActiveView('dashboard');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch {
      setLoginError('Credenciales incorrectas. Intenta de nuevo.');
    }
  };

  const isAdmin = user && user.email === 'admin@ghc.com';

  // --- COLECCIONES FIRESTORE ---
  const [ventas, addVenta, deleteVenta, updateVenta] = useFirestoreCollection('ghc_ventas');
  const [planilla, addPlanilla, deletePlanilla, updatePlanilla] = useFirestoreCollection('ghc_planilla');
  const [sunat, addSunat, deleteSunat, updateSunat] = useFirestoreCollection('ghc_sunat');
  const [lotesTalleres, addTaller, deleteTaller, updateTaller] = useFirestoreCollection('ghc_lotes_talleres');
  const [insumos, addInsumo, deleteInsumo, updateInsumo] = useFirestoreCollection('ghc_insumos');
  const [cajaChica, addCajaChica, deleteCajaChica, updateCajaChica] = useFirestoreCollection('ghc_cajachica');
  const [pagos, addPago] = useFirestoreCollection('ghc_pagos');

  // --- FILTROS GLOBALES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // --- CÁLCULOS PARA DASHBOARD ---
  const totalIngresos = ventas.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0);
  const totalPagadoTalleres = lotesTalleres.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0);
  const totalPagadoPlanilla = planilla.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0);
  const totalPagadoSunat = sunat.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0);
  const totalPagadoInsumos = insumos.reduce((a, c) => a + (parseFloat(c.paidAmount) || 0), 0);
  const egresosCajaChica = cajaChica.filter(c => c.type === 'Egreso').reduce((a, c) => a + (parseFloat(c.amount) || 0), 0);
  const totalEgresos = totalPagadoPlanilla + totalPagadoSunat + totalPagadoTalleres + totalPagadoInsumos + egresosCajaChica;

  const saldoPorCobrarClientes = ventas.reduce((a, c) => a + ((parseFloat(c.totalValue) || 0) - (parseFloat(c.paidAmount) || 0)), 0);
  const deudaTalleres = lotesTalleres.reduce((a, c) => a + ((parseFloat(c.totalCost) || 0) - (parseFloat(c.paidAmount) || 0)), 0);
  const deudaPlanilla = planilla.reduce((a, c) => a + ((parseFloat(c.total) || 0) - (parseFloat(c.paidAmount) || 0)), 0);
  const deudaSunat = sunat.reduce((a, c) => a + ((parseFloat(c.total) || 0) - (parseFloat(c.paidAmount) || 0)), 0);
  const deudaInsumos = insumos.reduce((a, c) => a + ((parseFloat(c.totalCost) || 0) - (parseFloat(c.paidAmount) || 0)), 0);

  // --- UTILIDADES ---
  const formatCurrency = (amount) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return alert('No hay datos para exportar.');
    const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'createdAt');
    const csvContent = [
      keys.join(','),
      ...data.map(row => keys.map(k => `"${row[k] !== undefined ? row[k] : ''}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename + '.csv';
    link.click();
  };

  // Lotes por tipo de taller
  const lotesCorte = lotesTalleres.filter(t => t.type === 'Corte');
  const lotesCostura = lotesTalleres.filter(t => t.type === 'Costura');
  const lotesBordado = lotesTalleres.filter(t => t.type === 'Bordado');
  const lotesServicio = lotesTalleres.filter(t => t.type === 'Servicio');

  // Props comunes para todas las vistas
  const shared = { isAdmin, formatCurrency, exportToCSV, searchQuery, dateFilter };

  // --- PANTALLAS DE CARGA Y LOGIN ---
  if (isAuthChecking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        Cargando sistema...
      </div>
    );
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
          {loginError && (
            <div style={{ backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>
              {loginError}
            </div>
          )}
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

  // --- LAYOUT PRINCIPAL ---
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          GHC <span>Gorras</span>
        </div>

        {isAdmin && (
          <>
            <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Principal</div>
            <nav className="nav-menu" style={{ marginBottom: '24px' }}>
              <a className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>Caja General</a>
              <a className={`nav-item ${activeView === 'ventas' ? 'active' : ''}`} onClick={() => setActiveView('ventas')}>Cobros a Clientes</a>
            </nav>
          </>
        )}

        {!isAdmin && (
          <nav className="nav-menu" style={{ marginBottom: '24px' }}>
            <a className={`nav-item ${activeView === 'ventas' ? 'active' : ''}`} onClick={() => setActiveView('ventas')}>Entregas y Cobros</a>
          </nav>
        )}

        <div style={{ padding: '0 16px', marginBottom: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Egresos y Pagos</div>
        <nav className="nav-menu">
          {isAdmin && <a className={`nav-item ${activeView === 'planilla' ? 'active' : ''}`} onClick={() => setActiveView('planilla')}>Planilla de Personal</a>}
          {isAdmin && <a className={`nav-item ${activeView === 'sunat' ? 'active' : ''}`} onClick={() => setActiveView('sunat')}>Contador y SUNAT</a>}
          <a className={`nav-item ${activeView === 'insumos' ? 'active' : ''}`} onClick={() => setActiveView('insumos')}>Compras / Créditos</a>
          <a className={`nav-item ${activeView === 'corte' ? 'active' : ''}`} onClick={() => setActiveView('corte')}>Producción: Corte</a>
          <a className={`nav-item ${activeView === 'costura' ? 'active' : ''}`} onClick={() => setActiveView('costura')}>Producción: Costura</a>
          <a className={`nav-item ${activeView === 'bordado' ? 'active' : ''}`} onClick={() => setActiveView('bordado')}>Producción: Bordados</a>
          <a className={`nav-item ${activeView === 'servicio' ? 'active' : ''}`} onClick={() => setActiveView('servicio')}>Otros Servicios</a>
          <a className={`nav-item ${activeView === 'cajachica' ? 'active' : ''}`} onClick={() => setActiveView('cajachica')}>Caja Chica</a>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
          <div style={{ padding: '0 16px', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>👤 {user.email}</div>
          {isAdmin && <a className={`nav-item ${activeView === 'cleanup' ? 'active' : ''}`} style={{ color: 'var(--danger)', fontSize: '0.8rem' }} onClick={() => setActiveView('cleanup')}>🗑️ Limpiar BD</a>}
          <button className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--danger)', display: 'flex', justifyContent: 'flex-start', cursor: 'pointer' }} onClick={() => signOut(auth)}>
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="main-content">
        {activeView !== 'dashboard' && (
          <div className="glass-panel fade-in" style={{ display: 'flex', gap: '16px', marginBottom: '24px', padding: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>🔍 Filtros:</span>
            <input type="text" className="form-control" style={{ flex: 1, minWidth: '200px' }} placeholder="Buscar por persona, taller, código o lote..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            <input type="date" className="form-control" style={{ width: 'auto' }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            {(searchQuery || dateFilter) && (
              <button className="btn btn-danger" style={{ padding: '10px 16px' }} onClick={() => { setSearchQuery(''); setDateFilter(''); }}>Limpiar</button>
            )}
          </div>
        )}

        {activeView === 'dashboard' && (
          <DashboardView
            totalIngresos={totalIngresos} totalEgresos={totalEgresos}
            totalPagadoPlanilla={totalPagadoPlanilla} totalPagadoSunat={totalPagadoSunat} totalPagadoTalleres={totalPagadoTalleres}
            saldoPorCobrarClientes={saldoPorCobrarClientes} deudaTalleres={deudaTalleres}
            deudaPlanilla={deudaPlanilla} deudaSunat={deudaSunat} deudaInsumos={deudaInsumos}
            formatCurrency={formatCurrency}
          />
        )}
        {activeView === 'ventas' && <VentasView ventas={ventas} addVenta={addVenta} deleteVenta={deleteVenta} updateVenta={updateVenta} {...shared} />}
        {activeView === 'planilla' && <PlanillaView planilla={planilla} addPlanilla={addPlanilla} deletePlanilla={deletePlanilla} updatePlanilla={updatePlanilla} pagos={pagos} addPago={addPago} {...shared} />}
        {activeView === 'sunat' && <SunatView sunat={sunat} addSunat={addSunat} deleteSunat={deleteSunat} updateSunat={updateSunat} {...shared} />}
        {activeView === 'insumos' && <InsumosView insumos={insumos} addInsumo={addInsumo} deleteInsumo={deleteInsumo} updateInsumo={updateInsumo} {...shared} />}
        {activeView === 'corte' && <TalleresView key="corte" type="Corte" lotes={lotesCorte} addTaller={addTaller} deleteTaller={deleteTaller} updateTaller={updateTaller} pagos={pagos} addPago={addPago} {...shared} />}
        {activeView === 'costura' && <TalleresView key="costura" type="Costura" lotes={lotesCostura} addTaller={addTaller} deleteTaller={deleteTaller} updateTaller={updateTaller} pagos={pagos} addPago={addPago} {...shared} />}
        {activeView === 'bordado' && <TalleresView key="bordado" type="Bordado" lotes={lotesBordado} addTaller={addTaller} deleteTaller={deleteTaller} updateTaller={updateTaller} pagos={pagos} addPago={addPago} {...shared} />}
        {activeView === 'servicio' && <TalleresView key="servicio" type="Servicio" lotes={lotesServicio} addTaller={addTaller} deleteTaller={deleteTaller} updateTaller={updateTaller} pagos={pagos} addPago={addPago} {...shared} />}
        {activeView === 'cajachica' && <CajaChicaView cajaChica={cajaChica} addCajaChica={addCajaChica} deleteCajaChica={deleteCajaChica} updateCajaChica={updateCajaChica} {...shared} />}
        {activeView === 'cleanup' && isAdmin && <CleanupView />}
      </main>
    </div>
  );
}

export default App;
