import { useState } from 'react';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const COLECCIONES = [
  'ghc_ventas',
  'ghc_planilla',
  'ghc_sunat',
  'ghc_lotes_talleres',
  'ghc_insumos',
  'ghc_cajachica',
  'ghc_pagos',
];

async function borrarColeccion(nombre) {
  const snap = await getDocs(collection(db, nombre));
  if (snap.empty) return 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.docs.length;
}

export default function CleanupView() {
  const [confirmText, setConfirmText] = useState('');
  const [estado, setEstado] = useState(null); // null | 'running' | 'done'
  const [log, setLog] = useState([]);

  const addLog = (msg) => setLog(prev => [...prev, msg]);

  const handleBorrar = async () => {
    setEstado('running');
    setLog([]);
    let total = 0;
    for (const col of COLECCIONES) {
      addLog(`Borrando ${col}...`);
      const n = await borrarColeccion(col);
      addLog(`✅ ${col}: ${n} documentos`);
      total += n;
    }
    addLog(`\n🎉 Listo. ${total} documentos eliminados.`);
    setEstado('done');
  };

  return (
    <div className="fade-in">
      <header className="header">
        <div>
          <h1>🗑️ Limpiar Base de Datos</h1>
          <p className="text-muted">Herramienta de administrador — acción irreversible.</p>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '32px', maxWidth: '540px' }}>
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '8px' }}>⚠️ ADVERTENCIA</div>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
            Esta acción borrará <strong>TODOS los datos</strong> de todas las colecciones de forma permanente.
            Asegúrate de tener el respaldo en Excel antes de continuar.
          </p>
        </div>

        {estado === null && (
          <>
            <p style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Escribe <strong>BORRAR TODO</strong> para confirmar:</p>
            <input
              type="text"
              className="form-control"
              placeholder="BORRAR TODO"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            <button
              className="btn btn-danger"
              style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
              disabled={confirmText !== 'BORRAR TODO'}
              onClick={handleBorrar}
            >
              🗑️ Borrar todos los datos
            </button>
          </>
        )}

        {(estado === 'running' || estado === 'done') && (
          <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 2 }}>
            {log.map((line, i) => <div key={i}>{line}</div>)}
            {estado === 'running' && <div style={{ color: 'var(--text-muted)' }}>Trabajando...</div>}
            {estado === 'done' && (
              <div style={{ marginTop: '16px', color: '#34d399', fontWeight: 700, fontSize: '1rem' }}>
                ✅ Base de datos limpia. Puedes cerrar esta pantalla y empezar a ingresar datos.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
