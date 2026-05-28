import { useState } from 'react';

const todayStr = () => new Date().toISOString().split('T')[0];

function printReceipt({ beneficiary, tallerType, concept, totalTrabajo, totalPagadoPrev, amount, date, newBalance }) {
  const fmt = (n) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n || 0);
  const num = Date.now().toString().slice(-6);
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Recibo GHC #${num}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;padding:28px;max-width:360px;margin:0 auto;font-size:13px;color:#000}
  .center{text-align:center}.bold{font-weight:700}
  .dash{border-top:1px dashed #000;margin:10px 0}
  .row{display:flex;justify-content:space-between;padding:3px 0}
  .big{font-size:15px;font-weight:700;padding:6px 0}
  .sig{margin-top:48px;text-align:center}
  .sig-line{border-top:1px solid #000;width:200px;margin:0 auto 6px}
</style></head>
<body>
  <div class="center">
    <div class="bold" style="font-size:22px;letter-spacing:2px">GHC GORRAS</div>
    <div class="bold" style="font-size:14px;margin:4px 0">RECIBO DE PAGO</div>
    <div style="color:#555">N° ${num}</div>
  </div>
  <div class="dash"></div>
  <div class="row"><span>Fecha:</span><span>${date}</span></div>
  <div class="row"><span>Beneficiario:</span><span class="bold">${beneficiary}</span></div>
  <div class="row"><span>Tipo:</span><span>${tallerType}</span></div>
  ${concept ? `<div class="row"><span>Concepto:</span><span>${concept}</span></div>` : ''}
  <div class="dash"></div>
  <div class="row"><span>Total trabajo:</span><span>${fmt(totalTrabajo)}</span></div>
  <div class="row"><span>Pagado anterior:</span><span>${fmt(totalPagadoPrev)}</span></div>
  <div class="dash"></div>
  <div class="row big"><span>PAGO ACTUAL:</span><span>${fmt(amount)}</span></div>
  <div class="dash"></div>
  <div class="row big"><span>SALDO RESTANTE:</span><span>${fmt(newBalance)}</span></div>
  <div class="dash"></div>
  <div class="sig"><div class="sig-line"></div><div>Firma / Conformidad</div></div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;
  const win = window.open('', '_blank', 'width=440,height=640');
  win.document.write(html);
  win.document.close();
}

const CloseBtn = ({ onClose }) => (
  <button className="btn-icon" onClick={onClose} style={{ color: 'var(--text-muted)' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
);

export default function PaymentModal({ isOpen, onClose, beneficiary, tallerType, totalTrabajo, totalPagado, addPago, formatCurrency }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [concept, setConcept] = useState('');
  const [phase, setPhase] = useState('form');
  const [last, setLast] = useState(null);

  if (!isOpen) return null;

  const saldo = (totalTrabajo || 0) - (totalPagado || 0);
  const pagoActual = parseFloat(amount) || 0;
  const nuevoSaldo = saldo - pagoActual;
  const fmt = formatCurrency;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pagoActual <= 0) return;
    const newPaid = (totalPagado || 0) + pagoActual;
    const remaining = (totalTrabajo || 0) - newPaid;
    await addPago({ date, amount: pagoActual, beneficiary, tallerType, concept });
    setLast({ amount: pagoActual, newPaid, newBalance: remaining, date });
    setPhase('receipt');
  };

  const handleClose = () => {
    setPhase('form');
    setAmount('');
    setDate(todayStr());
    setConcept('');
    setLast(null);
    onClose();
  };

  if (phase === 'form') {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass-panel fade-in">
          <div className="modal-header">
            <h2>💰 Registrar Pago</h2>
            <CloseBtn onClose={handleClose} />
          </div>
          <div className="modal-body">
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Beneficiario</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '10px' }}>{beneficiary} — {tallerType}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div><div style={{ color: 'var(--text-muted)' }}>Total trabajo</div><div style={{ fontWeight: 600 }}>{fmt(totalTrabajo)}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>Ya pagado</div><div style={{ fontWeight: 600, color: '#34d399' }}>{fmt(totalPagado)}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>Saldo</div><div style={{ fontWeight: 700, color: saldo > 0 ? '#f59e0b' : '#34d399' }}>{fmt(saldo)}</div></div>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Monto (S/.)</label>
                  <input type="number" step="0.10" className="form-control" placeholder="0.00"
                    value={amount} onChange={e => setAmount(e.target.value)} autoFocus required />
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label>Concepto / Notas (opcional)</label>
                <input type="text" className="form-control" placeholder="Ej. Adelanto, Pago quincenal..."
                  value={concept} onChange={e => setConcept(e.target.value)} />
              </div>
              {amount && (
                <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '8px', padding: '12px', fontSize: '0.9rem' }}>
                  Saldo tras este pago: <strong style={{ color: nuevoSaldo <= 0 ? '#34d399' : '#f59e0b' }}>{fmt(nuevoSaldo)}</strong>
                  {nuevoSaldo <= 0 && <span style={{ marginLeft: '8px' }}>— ¡Cancelado! ✓</span>}
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-danger" onClick={handleClose}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar y Ver Recibo</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Fase recibo
  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel fade-in">
        <div className="modal-header">
          <h2>✅ Pago Registrado</h2>
          <CloseBtn onClose={handleClose} />
        </div>
        <div className="modal-body">
          <div style={{ fontFamily: "'Courier New', monospace", border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '24px', fontSize: '0.82rem', lineHeight: 1.9 }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', letterSpacing: '2px' }}>GHC GORRAS</div>
              <div style={{ fontWeight: 600 }}>RECIBO DE PAGO</div>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fecha:</span><span>{last?.date}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Beneficiario:</span><strong>{beneficiary}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tipo:</span><span>{tallerType}</span></div>
            {concept && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Concepto:</span><span>{concept}</span></div>}
            <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total trabajo:</span><span>{fmt(totalTrabajo)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pagado anterior:</span><span>{fmt(totalPagado)}</span></div>
            <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}>
              <span>PAGO ACTUAL:</span><span style={{ color: '#34d399' }}>{fmt(last?.amount)}</span>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}>
              <span>SALDO RESTANTE:</span>
              <span style={{ color: (last?.newBalance || 0) > 0 ? '#f59e0b' : '#34d399' }}>{fmt(last?.newBalance)}</span>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', margin: '16px 0 10px' }} />
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div style={{ borderTop: '1px solid var(--border-color)', width: '180px', margin: '0 auto 6px' }} />
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Firma / Conformidad</div>
            </div>
          </div>
          <div className="modal-footer" style={{ marginTop: '16px' }}>
            <button className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={handleClose}>Cerrar</button>
            <button className="btn btn-primary" onClick={() => printReceipt({ beneficiary, tallerType, concept, totalTrabajo, totalPagadoPrev: totalPagado, amount: last.amount, date: last.date, newBalance: last.newBalance })}>🖨️ Imprimir Recibo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
