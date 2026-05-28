import ExcelJS from 'exceljs';

const API_KEY = 'AIzaSyA-qQJhy6-MxX7daYZn58GDOnUr07r83Pw';
const PROJECT_ID = 'administrador-ghc';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) return val;
  return '';
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (typeof v === 'number') fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    else if (typeof v === 'string') fields[k] = { stringValue: v };
  }
  return { fields };
}

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }) }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Auth failed');
  return data.idToken;
}

async function addDoc(token, col, data) {
  const res = await fetch(`${FIRESTORE_BASE}/${col}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
}

async function uploadBatch(token, colName, records) {
  const BATCH = 20;
  let done = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    await Promise.all(chunk.map(r => addDoc(token, colName, r)));
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${records.length}`);
  }
  console.log('');
}

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Uso: node scripts/importComprasCredito.mjs <email> <password>');
  process.exit(1);
}

console.log('Autenticando...');
const token = await signIn(email, password);
console.log('Autenticado OK\n');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('_PLANILLA GHC.xlsx');

const ws = wb.getWorksheet('COMPRA A CREDITO');
if (!ws) { console.error('Hoja COMPRA A CREDITO no encontrada'); process.exit(1); }

// v[2]=proveedor, v[3]=factura/desc, v[4]=fechaCompra, v[5]=total, v[6]=adelanto, v[7]=pagado, v[9]=fechaPago
const insumos = [];
const pagos = [];

ws.eachRow((row, rowNum) => {
  if (rowNum < 4) return;
  const v = row.values;

  const provider = typeof v[2] === 'string' ? v[2].trim() : '';
  const invoice  = typeof v[3] === 'string' ? v[3].trim() : '';
  const date     = formatDate(v[4]);
  const total    = typeof v[5] === 'number' ? v[5] : 0;
  const pagado   = typeof v[7] === 'number' ? v[7] : 0;
  const fechaPago = formatDate(v[9]);

  // Saltar filas sin proveedor ni total (separadores de año, pagos parciales extra)
  if (!provider || total <= 0) return;

  insumos.push({ date, provider, invoice, totalCost: total });

  if (pagado > 0) {
    pagos.push({
      date: fechaPago || date || '',
      amount: pagado,
      beneficiary: provider,
      tallerType: 'Insumos',
      concept: invoice || provider,
      paymentType: 'EFECTIVO',
      bank: '',
    });
  }
});

console.log(`Compras encontradas: ${insumos.length}`);
console.log(`Pagos encontrados:   ${pagos.length}\n`);

console.log('=== Subiendo compras → ghc_insumos ===');
await uploadBatch(token, 'ghc_insumos', insumos);
console.log(`✓ ${insumos.length} compras importadas\n`);

console.log('=== Subiendo pagos → ghc_pagos ===');
await uploadBatch(token, 'ghc_pagos', pagos);
console.log(`✓ ${pagos.length} pagos importados\n`);

console.log('✓ Importación Compras a Crédito completada.');
