import ExcelJS from 'exceljs';

const API_KEY = 'AIzaSyA-qQJhy6-MxX7daYZn58GDOnUr07r83Pw';
const PROJECT_ID = 'administrador-ghc';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Configuración de cada hoja: columnas para desde/hasta/horas/total/pagado/fechaPago
const WORKERS = [
  { sheet: 'ELVIRA',         name: 'ELVIRA',   startRow: 5,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: 10 },
  { sheet: 'Copia de EDYTH', name: 'EDYTH',    startRow: 4,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: 10 },
  { sheet: 'ANNGELA',        name: 'ANNGELA',  startRow: 5,  desdCol: 3, hastaCol: 4, horasCol: 8, totalCol: 9, pagadoCol: 11, payDateCol: 13 },
  { sheet: 'YOLANDA',        name: 'YOLANDA',  startRow: 4,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: null },
  { sheet: 'MOISES',         name: 'MOISES',   startRow: 4,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: 10 },
  { sheet: 'KATERIN',        name: 'KATERIN',  startRow: 4,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: 10 },
  { sheet: 'CONSUELO',       name: 'CONSUELO', startRow: 4,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: 10 },
  { sheet: 'RUBEN',          name: 'RUBEN',    startRow: 4,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: 10 },
  { sheet: 'esther',         name: 'ESTHER',   startRow: 5,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: null },
  { sheet: 'jesus',          name: 'JESUS',    startRow: 3,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 7,  payDateCol: null },
  { sheet: 'jose',           name: 'JOSE',     startRow: 4,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 7,  payDateCol: null },
  { sheet: 'manuel',         name: 'MANUEL',   startRow: 3,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 7,  payDateCol: null },
  { sheet: 'omar',           name: 'OMAR',     startRow: 3,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 7,  payDateCol: null },
  { sheet: 'keyber',         name: 'KEYBER',   startRow: 3,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: null },
  { sheet: 'paola',          name: 'PAOLA',    startRow: 3,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: null },
  { sheet: 'pol',            name: 'POL',      startRow: 3,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: null },
  { sheet: 'KLAYNER',        name: 'KLAYNER',  startRow: 3,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: null },
  { sheet: 'eucaris',        name: 'EUCARIS',  startRow: 5,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: null },
  { sheet: 'Marisol',        name: 'MARISOL',  startRow: 3,  desdCol: 2, hastaCol: 3, horasCol: 5, totalCol: 6, pagadoCol: 8,  payDateCol: null },
];

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === 'string' && val.includes('T')) return val.slice(0, 10);
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

// --- MAIN ---
const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Uso: node scripts/importPlanilla.mjs <email> <password>');
  process.exit(1);
}

console.log('Autenticando...');
const token = await signIn(email, password);
console.log('Autenticado OK\n');

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile('_PLANILLA GHC.xlsx');

const allPeriodos = [];
const allPagos = [];

for (const cfg of WORKERS) {
  const ws = wb.getWorksheet(cfg.sheet);
  if (!ws) {
    console.log(`  ⚠ Hoja no encontrada: ${cfg.sheet}`);
    continue;
  }

  let periodos = 0;
  let pagos = 0;

  ws.eachRow((row, rowNum) => {
    if (rowNum < cfg.startRow) return;
    const v = row.values;

    const periodFrom = formatDate(v[cfg.desdCol]) || formatDate(v[cfg.hastaCol]);
    const periodTo   = formatDate(v[cfg.hastaCol]) || periodFrom;
    const hours      = getNum(v[cfg.horasCol]);
    const total      = getNum(v[cfg.totalCol]);

    // Saltar filas sin datos útiles
    if (!periodFrom && !total) return;
    if (total <= 0 && hours <= 0) return;

    // Registro de período (ghc_planilla)
    allPeriodos.push({
      name: cfg.name,
      periodFrom,
      periodTo,
      hours,
      total,
      paidAmount: 0,
      paymentDate: '',
    });
    periodos++;

    // Pago del período (ghc_pagos) si hay monto pagado
    const pagado = getNum(v[cfg.pagadoCol]);
    if (pagado > 0) {
      const payDate = cfg.payDateCol ? formatDate(v[cfg.payDateCol]) : '';
      allPagos.push({
        date: payDate || periodTo || periodFrom,
        amount: pagado,
        beneficiary: cfg.name,
        tallerType: 'Planilla',
        concept: `Pago período ${periodFrom} - ${periodTo}`,
        paymentType: 'EFECTIVO',
        bank: '',
      });
      pagos++;
    }
  });

  console.log(`  ${cfg.name.padEnd(10)}: ${periodos} períodos, ${pagos} pagos`);
}

console.log(`\nTotal: ${allPeriodos.length} períodos, ${allPagos.length} pagos\n`);

console.log('=== Subiendo períodos → ghc_planilla ===');
await uploadBatch(token, 'ghc_planilla', allPeriodos);
console.log(`✓ ${allPeriodos.length} períodos importados\n`);

console.log('=== Subiendo pagos → ghc_pagos ===');
await uploadBatch(token, 'ghc_pagos', allPagos);
console.log(`✓ ${allPagos.length} pagos importados\n`);

console.log('✓ Importación de planilla completada.');
