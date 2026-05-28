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

function getCategory(desc) {
  const d = desc.toUpperCase();
  if (d.includes('HONORAR')) return 'Honorarios';
  if (d.includes('FRACCION') || d.includes('FRACCI')) return 'Fraccionamiento';
  if (d.includes('RENTA') || d.includes('IGV') || d.includes('DECLARACION') || d.includes('ANUAL')) return 'Renta';
  return null; // null = saltar (MASVAL, etc.)
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
  console.error('Uso: node scripts/importContador.mjs <email> <password>');
  process.exit(1);
}

console.log('Autenticando...');
const token = await signIn(email, password);
console.log('Autenticado OK\n');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('_PLANILLA GHC.xlsx');

const ws = wb.getWorksheet('CONTADOR');
if (!ws) { console.error('Hoja CONTADOR no encontrada'); process.exit(1); }

// v[2]=desc, v[3]=fecha, v[4]=total, v[5]=adelanto, v[6]=pagado, v[7]=saldo, v[8]=fechaPago, v[9]=nota
const sunatRecords = [];
const pagosRecords = [];
const saltados = [];

ws.eachRow((row, rowNum) => {
  if (rowNum < 4) return;
  const v = row.values;

  const desc  = typeof v[2] === 'string' ? v[2].trim() : '';
  const fecha = formatDate(v[3]);
  const total = typeof v[4] === 'number' ? v[4] : 0;
  const pagado = typeof v[6] === 'number' ? v[6] : 0;
  const fechaPago = formatDate(v[8]);

  if (!desc || total <= 0) return;

  const category = getCategory(desc);
  if (!category) { saltados.push(desc); return; }

  sunatRecords.push({ date: fecha, description: desc, total, category });

  if (pagado > 0) {
    pagosRecords.push({
      date: fechaPago || fecha || '',
      amount: pagado,
      beneficiary: category,
      tallerType: 'Sunat',
      concept: desc,
      paymentType: 'EFECTIVO',
      bank: '',
    });
  }
});

console.log(`Registros SUNAT/Contador: ${sunatRecords.length}`);
console.log(`  Honorarios:     ${sunatRecords.filter(r => r.category === 'Honorarios').length}`);
console.log(`  Renta:          ${sunatRecords.filter(r => r.category === 'Renta').length}`);
console.log(`  Fraccionamiento:${sunatRecords.filter(r => r.category === 'Fraccionamiento').length}`);
console.log(`Pagos: ${pagosRecords.length}`);
if (saltados.length) console.log(`Saltados (no Sunat): ${[...new Set(saltados)].join(', ')}\n`);

console.log('\n=== Subiendo registros → ghc_sunat ===');
await uploadBatch(token, 'ghc_sunat', sunatRecords);
console.log(`✓ ${sunatRecords.length} registros importados\n`);

console.log('=== Subiendo pagos → ghc_pagos ===');
await uploadBatch(token, 'ghc_pagos', pagosRecords);
console.log(`✓ ${pagosRecords.length} pagos importados\n`);

console.log('✓ Importación Contador completada.');
