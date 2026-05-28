import ExcelJS from 'exceljs';

const API_KEY = 'AIzaSyA-qQJhy6-MxX7daYZn58GDOnUr07r83Pw';
const PROJECT_ID = 'administrador-ghc';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string' && val.includes('T')) return val.slice(0, 10);
  return String(val);
}

// Convertir objeto JS a formato Firestore REST
function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    }
  }
  return { fields };
}

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Auth failed');
  return data.idToken;
}

async function addDocument(token, collectionName, data) {
  const res = await fetch(`${FIRESTORE_BASE}/${collectionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
}

// Subir en lotes para no saturar
async function uploadBatch(token, collectionName, records) {
  const BATCH = 20;
  let done = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const chunk = records.slice(i, i + BATCH);
    await Promise.all(chunk.map(r => addDocument(token, collectionName, r)));
    done += chunk.length;
    process.stdout.write(`\r  ${done}/${records.length}`);
  }
  console.log('');
}

// --- MAIN ---
const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Uso: node scripts/importLibroGeneral.mjs <email> <password>');
  process.exit(1);
}

console.log('Autenticando...');
const token = await signIn(email, password);
console.log('Autenticado OK\n');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('Libro General Diana 2024 ,2025 Y 2026.xlsx');

// === IMPORTAR ENTREGAS → ghc_ventas ===
console.log('=== Importando ENTREGAS → ghc_ventas ===');
const wsEntregas = wb.getWorksheet('ENTREGAS');
const entregas = [];

wsEntregas.eachRow((row, rowNum) => {
  if (rowNum < 5) return;
  const v = row.values;
  const date = formatDate(v[2]);
  const code = v[3];
  const model = v[4];
  const responsible = v[5];
  const quantity = typeof v[6] === 'number' ? v[6] : 0;
  const price = typeof v[7] === 'number' ? v[7] : 0;
  const totalRaw = v[8];
  const totalValue = typeof totalRaw === 'object' && totalRaw?.result != null
    ? totalRaw.result
    : (typeof totalRaw === 'number' ? totalRaw : quantity * price);

  if (!date || !code || !responsible) return;

  entregas.push({
    date,
    code: String(code),
    client: 'DIANA',
    model: String(model || ''),
    responsible: String(responsible),
    quantity,
    price,
    totalValue,
    paidAmount: 0,
    paymentType: 'EFECTIVO',
    bank: '-',
    paymentDate: '',
  });
});

console.log(`  Total registros: ${entregas.length}`);
await uploadBatch(token, 'ghc_ventas', entregas);
console.log(`✓ Entregas importadas: ${entregas.length}\n`);

// === IMPORTAR ACUENTAS → ghc_pagos ===
console.log('=== Importando ACUENTAS → ghc_pagos ===');
const wsAcuentas = wb.getWorksheet('ACUENTAS');
const cobros = [];

wsAcuentas.eachRow((row, rowNum) => {
  if (rowNum < 5) return;
  const v = row.values;
  const date = formatDate(v[2]);
  const amount = typeof v[3] === 'number' ? v[3] : 0;
  const paymentType = v[4] ? String(v[4]) : '';
  const bank = v[5] ? String(v[5]) : '';
  const concept = v[6] ? String(v[6]) : '';

  if (!date || !amount) return;

  cobros.push({
    date,
    amount,
    beneficiary: 'DIANA',
    tallerType: 'Ventas',
    paymentType,
    bank,
    concept,
  });
});

console.log(`  Total registros: ${cobros.length}`);
await uploadBatch(token, 'ghc_pagos', cobros);
console.log(`✓ Cobros importados: ${cobros.length}\n`);

console.log('✓ Importación completada exitosamente.');
