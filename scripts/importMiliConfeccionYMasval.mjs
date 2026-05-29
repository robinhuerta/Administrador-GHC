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
  console.error('Uso: node scripts/importMiliConfeccionYMasval.mjs <email> <password>');
  process.exit(1);
}

console.log('Autenticando...');
const token = await signIn(email, password);
console.log('Autenticado OK\n');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('_PLANILLA GHC.xlsx');

const ws = wb.getWorksheet('MILI CONFECCION');
if (!ws) { console.error('Hoja MILI CONFECCION no encontrada'); process.exit(1); }

// Columnas: v[3]=fecha, v[4]=codigo, v[6]=taller, v[7]=cantidad, v[8]=precio,
//           v[9]=total, v[11]=acuenta(pagado), v[13]=fechaPago
const lotes = [];
const pagos = [];

ws.eachRow((row, rowNum) => {
  if (rowNum < 5) return;
  const v = row.values;

  const code   = typeof v[4] === 'string' ? v[4].trim() : '';
  const taller = typeof v[6] === 'string' ? v[6].trim() : '';
  const qty    = getNum(v[7]);
  const price  = getNum(v[8]);
  const total  = getNum(v[9]);
  const acuenta = getNum(v[11]);
  const fecha  = formatDate(v[3]);
  const fechaPago = formatDate(v[13]);

  if (!code || total <= 0) return;
  // Saltar separadores numéricos (años)
  if (/^\d{4}$/.test(code)) return;

  lotes.push({
    type: 'Costura',
    code,
    provider: taller || 'MILI',
    style: '',
    date: fecha,
    quantity: qty,
    unitPrice: price,
    totalCost: total,
    paidAmount: 0,
    paymentDate: '',
  });

  if (acuenta > 0) {
    pagos.push({
      date: fechaPago || fecha || '',
      amount: acuenta,
      beneficiary: taller || 'MILI',
      tallerType: 'Costura',
      concept: `Confección ${code}`,
      paymentType: 'EFECTIVO',
      bank: '',
    });
  }
});

console.log(`=== MILI CONFECCION ===`);
console.log(`Lotes: ${lotes.length} | Pagos: ${pagos.length}\n`);

console.log('Subiendo lotes → ghc_lotes_talleres...');
await uploadBatch(token, 'ghc_lotes_talleres', lotes);
console.log(`✓ ${lotes.length} lotes importados\n`);

console.log('Subiendo pagos → ghc_pagos...');
await uploadBatch(token, 'ghc_pagos', pagos);
console.log(`✓ ${pagos.length} pagos importados\n`);

// === PAGO FALTANTE MASVAL S/577.70 ===
console.log('=== Pago faltante MASVAL (FA04-3068 segunda cuota) ===');
await addDoc(token, 'ghc_pagos', {
  date: '2025-10-03',
  amount: 577.7,
  beneficiary: 'MASVAL',
  tallerType: 'Insumos',
  concept: 'FA04-3068 segunda cuota',
  paymentType: 'EFECTIVO',
  bank: '',
});
console.log('✓ Pago de S/577.70 agregado a ghc_pagos\n');

console.log('✓ Todo completado.');
