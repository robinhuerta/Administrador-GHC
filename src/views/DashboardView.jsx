export default function DashboardView({
  totalIngresos, totalEgresos, totalPagadoPlanilla, totalPagadoSunat,
  totalPagadoTalleres, totalPagadoInsumos, egresosCajaChica, totalGastosFijos = 0,
  saldoPorCobrarClientes, deudaTalleres, deudaPlanilla, deudaSunat, deudaInsumos,
  formatCurrency
}) {
  const saldoNeto = totalIngresos - totalEgresos;
  const totalDeudas = deudaTalleres + deudaPlanilla + deudaSunat + deudaInsumos;
  const pctEgresos = totalIngresos > 0 ? Math.min((totalEgresos / totalIngresos) * 100, 100) : 0;

  const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fade-in">

      {/* ENCABEZADO */}
      <div style={{ marginBottom: '32px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px', textTransform: 'capitalize' }}>{today}</p>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Caja General</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Resumen financiero en tiempo real · Firebase 🔥</p>
      </div>

      {/* SALDO NETO — tarjeta héroe */}
      <div className="glass-panel" style={{ marginBottom: '24px', padding: '28px 32px', background: saldoNeto >= 0 ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))' : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))', borderLeft: `4px solid ${saldoNeto >= 0 ? 'var(--accent)' : 'var(--danger)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Saldo Neto en Caja</div>
          <div style={{ fontSize: '2.8rem', fontWeight: 800, color: saldoNeto >= 0 ? 'var(--accent)' : 'var(--danger)', lineHeight: 1 }}>
            {formatCurrency(saldoNeto)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cobertura de gastos</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {totalIngresos > 0 ? `${((totalIngresos / (totalEgresos || 1)) * 100).toFixed(0)}%` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ingresos vs egresos</div>
        </div>
      </div>

      {/* INGRESOS vs EGRESOS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Cobrado</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#34d399', marginTop: '4px' }}>{formatCurrency(totalIngresos)}</div>
            </div>
            <span style={{ fontSize: '1.8rem' }}>💰</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #34d399, #10b981)', borderRadius: '4px' }} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Egresos</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>{formatCurrency(totalEgresos)}</div>
            </div>
            <span style={{ fontSize: '1.8rem' }}>📤</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${pctEgresos}%`, height: '100%', background: 'linear-gradient(90deg, #f87171, #ef4444)', borderRadius: '4px', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>{pctEgresos.toFixed(1)}% de los ingresos</div>
        </div>
      </div>

      {/* DESGLOSE DE EGRESOS */}
      <div className="glass-panel" style={{ marginBottom: '24px', padding: '20px 24px' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Desglose de Egresos</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { label: 'Personal (Planilla)', amount: totalPagadoPlanilla, color: '#818cf8' },
            { label: 'Producción (Talleres)', amount: totalPagadoTalleres, color: '#fb923c' },
            { label: 'Insumos / Compras', amount: totalPagadoInsumos, color: '#60a5fa' },
            { label: 'SUNAT / Contador', amount: totalPagadoSunat, color: '#f472b6' },
            { label: 'Caja Chica', amount: egresosCajaChica, color: '#a78bfa' },
            { label: 'Gastos Fijos', amount: totalGastosFijos, color: '#fb923c' },
          ].map(item => {
            const pct = totalEgresos > 0 ? (item.amount / totalEgresos) * 100 : 0;
            return (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: item.color }}>{formatCurrency(item.amount)}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.6s ease', opacity: 0.85 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ESTADO DE CUENTAS */}
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
        Estado de Cuentas
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>

        {/* Por cobrar — destaca en azul */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.04))', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por Cobrar</span>
            <span>📦</span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{formatCurrency(saldoPorCobrarClientes)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Clientes pendientes</div>
        </div>

        {/* Deudas por pagar */}
        {[
          { label: 'Talleres', amount: deudaTalleres, icon: '🧵' },
          { label: 'Personal', amount: deudaPlanilla, icon: '👤' },
          { label: 'Insumos', amount: deudaInsumos,  icon: '🛍️' },
          { label: 'SUNAT',   amount: deudaSunat,    icon: '📋' },
        ].map(item => (
          <div key={item.label} className="glass-panel" style={{ padding: '18px 20px', borderLeft: `4px solid ${item.amount > 0 ? '#f59e0b' : '#34d399'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deuda {item.label}</span>
              <span>{item.icon}</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: item.amount > 0 ? '#f59e0b' : '#34d399' }}>
              {item.amount > 0 ? formatCurrency(item.amount) : 'Al día ✓'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {item.amount > 0 ? 'Pendiente de pago' : 'Sin deuda pendiente'}
            </div>
          </div>
        ))}

        {/* Total deudas por pagar */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: totalDeudas > 0 ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))' : 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(52,211,153,0.03))', borderLeft: `4px solid ${totalDeudas > 0 ? '#f59e0b' : '#34d399'}` }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total por Pagar</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: totalDeudas > 0 ? '#f59e0b' : '#34d399' }}>
            {totalDeudas > 0 ? formatCurrency(totalDeudas) : 'Todo al día ✓'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Talleres + Personal + Insumos + SUNAT</div>
        </div>
      </div>

    </div>
  );
}
