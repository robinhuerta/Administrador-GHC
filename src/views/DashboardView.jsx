export default function DashboardView({
  totalIngresos, totalEgresos, totalPagadoPlanilla, totalPagadoSunat, totalPagadoTalleres,
  saldoPorCobrarClientes, deudaTalleres, deudaPlanilla, deudaSunat, deudaInsumos, formatCurrency
}) {
  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <h1>Caja General</h1>
          <p className="text-muted">Resumen global de liquidez (Conectado a Firebase 🔥).</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #34d399' }}>
          <span className="text-muted">Total Cobrado (Ingresos)</span>
          <span className="stat-value" style={{ color: '#34d399' }}>{formatCurrency(totalIngresos)}</span>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span className="text-muted">Egresos Totales</span>
          <span className="stat-value" style={{ color: '#ef4444' }}>{formatCurrency(totalEgresos)}</span>
        </div>
        <div className="glass-panel stat-card" style={{ borderLeft: '4px solid var(--accent)' }}>
          <span className="text-muted">Saldo Neto en Caja</span>
          <span className="stat-value">{formatCurrency(totalIngresos - totalEgresos)}</span>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: '20px' }}>
        <div className="glass-panel stat-card">
          <span className="text-muted">Egresos: Personal</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoPlanilla)}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="text-muted">Egresos: SUNAT/Contador</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoSunat)}</span>
        </div>
        <div className="glass-panel stat-card">
          <span className="text-muted">Egresos: Producción (Talleres)</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{formatCurrency(totalPagadoTalleres)}</span>
        </div>
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
  );
}
