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

function getNum(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null && typeof v.result === 'number') return v.result;
  return 0;
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
  console.error('Uso: node scripts/importEstherCorte.mjs <email> <password>');
  process.exit(1);
}

console.log('Autenticando...');
const token = await signIn(email, password);
console.log('Autenticado OK\n');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('_PLANILLA GHC.xlsx');

const ws = wb.getWorksheet('ESTHER CORTE');
if (!ws) { console.error('Hoja ESTHER CORTE no encontrada'); process.exit(1); }

const lotes = [];
const pagos = [];

// Columnas (1-indexed): v[4]=CODIGO, v[5]=TALLER, v[6]=CANTIDAD, v[7]=PRECIO, v[8]=TOTAL, v[10]=PAGOS, v[12]=FECHA_PAGO
ws.eachRow((row, rowNum) => {
  if (rowNum < 6) return;
  const v = row.values;

  const code    = typeof v[4] === 'string' ? v[4].trim() : '';
  const taller  = typeof v[5] === 'string' ? v[5].trim() : '';
  const qty     = getNum(v[6]);
  const price   = getNum(v[7]);
  const total   = getNum(v[8]);
  const pago    = getNum(v[10]);
  const fechaPago = formatDate(v[12]);

  // Saltar filas de separador de año (código numérico como 2023, 2024, 2025, 2026)
  if (!code || !taller || /^\d{4}$/.test(code)) return;

  // Lote
  if (qty > 0 || total > 0) {
    lotes.push({
      type: 'Corte',
      code,
      provider: taller,
      style: '',
      date: '',
      quantity: qty,
      unitPrice: price,
      totalCost: total || qty * price,
      paidAmount: 0,
      paymentDate: '',
    });
  }

  // Pago
  if (pago > 0) {
    pagos.push({
      date: fechaPago || '',
      amount: pago,
      beneficiary: taller,
      tallerType: 'Corte',
      concept: `Pago corte ${code}`,
      paymentType: 'EFECTIVO',
      bank: '',
    });
  }
});

console.log(`Lotes encontrados: ${lotes.length}`);
console.log(`Pagos encontrados: ${pagos.length}\n`);

console.log('=== Subiendo lotes → ghc_lotes_talleres ===');
await uploadBatch(token, 'ghc_lotes_talleres', lotes);
console.log(`✓ ${lotes.length} lotes importados\n`);

console.log('=== Subiendo pagos → ghc_pagos ===');
await uploadBatch(token, 'ghc_pagos', pagos);
console.log(`✓ ${pagos.length} pagos importados\n`);

console.log('✓ Importación ESTHER CORTE completada.');
