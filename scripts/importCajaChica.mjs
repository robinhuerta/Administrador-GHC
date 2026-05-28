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
  console.error('Uso: node scripts/importCajaChica.mjs <email> <password>');
  process.exit(1);
}

console.log('Autenticando...');
const token = await signIn(email, password);
console.log('Autenticado OK\n');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('_PLANILLA GHC.xlsx');

const ws = wb.getWorksheet('CAJA CHICA');
if (!ws) { console.error('Hoja CAJA CHICA no encontrada'); process.exit(1); }

// Columnas: v[2]=descripción, v[3]=fechaEntrada, v[4]=entrada, v[5]=fechaSalida, v[6]=salida, v[7]=nota
const records = [];

ws.eachRow((row, rowNum) => {
  if (rowNum < 5) return;
  const v = row.values;
  const desc = typeof v[2] === 'string' ? v[2].trim() : '';
  const nota = typeof v[7] === 'string' ? v[7].trim() : '';

  const fechaEntrada = formatDate(v[3]);
  const entrada = typeof v[4] === 'number' ? v[4] : 0;

  const fechaSalida = formatDate(v[5]);
  const salida = typeof v[6] === 'number' ? v[6] : 0;

  if (!desc) return;

  if (entrada > 0) {
    records.push({
      date: fechaEntrada || fechaSalida || '',
      description: desc + (nota ? ` — ${nota}` : ''),
      type: 'Ingreso',
      amount: entrada,
    });
  }

  if (salida > 0) {
    records.push({
      date: fechaSalida || fechaEntrada || '',
      description: desc + (nota ? ` — ${nota}` : ''),
      type: 'Egreso',
      amount: salida,
    });
  }
});

console.log(`Total registros encontrados: ${records.length}`);
console.log(`  Ingresos: ${records.filter(r => r.type === 'Ingreso').length}`);
console.log(`  Egresos:  ${records.filter(r => r.type === 'Egreso').length}\n`);

console.log('=== Subiendo → ghc_cajachica ===');
await uploadBatch(token, 'ghc_cajachica', records);
console.log(`✓ ${records.length} registros importados\n`);

console.log('✓ Importación Caja Chica completada.');
