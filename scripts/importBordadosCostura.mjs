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

function isYearOrMonth(v) {
  if (typeof v === 'number' && v >= 2000 && v <= 2100) return true;
  if (typeof v === 'string' && /^(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|\d{4})$/i.test(v.trim())) return true;
  return false;
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

// codeCol, qtyCol, totalCol, pagadoCol, fechaCol (1-indexed ExcelJS row.values)
const BORDADOS_CFG = [
  { sheet: 'VICTOR',         provider: 'VICTOR',         codeCol: 5, qtyCol: 7, totalCol: 10, pagadoCol: 12, fechaCol: 13 },
  { sheet: 'EDHICHA',        provider: 'EDHICHA',        codeCol: 5, qtyCol: 7, totalCol: 10, pagadoCol: 12, fechaCol: 13 },
  { sheet: 'GAMARRA',        provider: 'GAMARRA',        codeCol: 5, qtyCol: 7, totalCol: 10, pagadoCol: 12, fechaCol: 13 },
  { sheet: 'CAPABLE OLIVOS', provider: 'CAPABLE OLIVOS', codeCol: 4, qtyCol: 6, totalCol: 9,  pagadoCol: 11, fechaCol: 12 },
  { sheet: 'EDWIN',          provider: 'EDWIN',          codeCol: 5, qtyCol: 6, totalCol: 8,  pagadoCol: 10, fechaCol: 12 },
  { sheet: 'ARNOL',          provider: 'ARNOL',          codeCol: 5, qtyCol: 6, totalCol: 7,  pagadoCol: 9,  fechaCol: 11 },
  { sheet: 'PILLO',          provider: 'PILLO',          codeCol: 5, qtyCol: 6, totalCol: 7,  pagadoCol: 9,  fechaCol: 11 },
];

const COSTURA_CFG = [
  { sheet: 'OLIVOS',  provider: 'OLIVOS',  codeCol: 5, qtyCol: 6, totalCol: 8, pagadoCol: 10, fechaCol: 12 },
  { sheet: 'MILY',    provider: 'MILY',    codeCol: 5, qtyCol: 6, totalCol: 8, pagadoCol: 11, fechaCol: 13 },
  { sheet: 'PIERO',   provider: 'PIERO',   codeCol: 5, qtyCol: 6, totalCol: 8, pagadoCol: 11, fechaCol: 13 },
  { sheet: 'DANIEL',  provider: 'DANIEL',  codeCol: 5, qtyCol: 6, totalCol: 8, pagadoCol: 11, fechaCol: 13 },
  { sheet: 'RICHAR',  provider: 'RICHAR',  codeCol: 5, qtyCol: 6, totalCol: 8, pagadoCol: 11, fechaCol: 13 },
  { sheet: 'WILIAM',  provider: 'WILIAM',  codeCol: 5, qtyCol: 6, totalCol: 8, pagadoCol: 11, fechaCol: 13 },
  { sheet: 'HERNAN',  provider: 'HERNAN',  codeCol: 5, qtyCol: 6, totalCol: 8, pagadoCol: 11, fechaCol: 13 },
  { sheet: 'EDWIN',   provider: 'EDWIN',   codeCol: 5, qtyCol: 6, totalCol: 8, pagadoCol: 10, fechaCol: 12 },
  { sheet: 'ARNOL',   provider: 'ARNOL',   codeCol: 5, qtyCol: 6, totalCol: 7, pagadoCol: 9,  fechaCol: 11 },
  { sheet: 'PILLO',   provider: 'PILLO',   codeCol: 5, qtyCol: 6, totalCol: 7, pagadoCol: 9,  fechaCol: 11 },
];

function extractFromSheet(ws, cfg, tallerType) {
  const lotes = [];
  const pagos = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum < 4) return;
    const v = row.values;

    // Saltar filas de separador (año o mes)
    if (isYearOrMonth(v[cfg.codeCol]) || isYearOrMonth(v[2])) return;

    const code   = typeof v[cfg.codeCol] === 'string' ? v[cfg.codeCol].trim() : (typeof v[cfg.codeCol] === 'object' && v[cfg.codeCol]?.text ? v[cfg.codeCol].text.trim() : '');
    const qty    = getNum(v[cfg.qtyCol]);
    const total  = getNum(v[cfg.totalCol]);
    const pagado = getNum(v[cfg.pagadoCol]);
    const fecha  = formatDate(v[cfg.fechaCol]);

    if (!code || total <= 0) return;

    lotes.push({
      type: tallerType,
      code,
      provider: cfg.provider,
      style: '',
      date: '',
      quantity: qty,
      unitPrice: qty > 0 ? Math.round((total / qty) * 10000) / 10000 : 0,
      totalCost: total,
      paidAmount: 0,
      paymentDate: '',
    });

    if (pagado > 0) {
      pagos.push({
        date: fecha || '',
        amount: pagado,
        beneficiary: cfg.provider,
        tallerType,
        concept: `Pago ${tallerType.toLowerCase()} ${code}`,
        paymentType: 'EFECTIVO',
        bank: '',
      });
    }
  });

  return { lotes, pagos };
}

const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Uso: node scripts/importBordadosCostura.mjs <email> <password>');
  process.exit(1);
}

console.log('Autenticando...');
const token = await signIn(email, password);
console.log('Autenticado OK\n');

const allLotes = [];
const allPagos = [];

// === BORDADOS ===
console.log('=== Leyendo SERVICIOS BORDADOS.xlsx ===');
const wbBordados = new ExcelJS.Workbook();
await wbBordados.xlsx.readFile('SERVICIOS BORDADOS.xlsx');

for (const cfg of BORDADOS_CFG) {
  const ws = wbBordados.getWorksheet(cfg.sheet);
  if (!ws) { console.log(`  ⚠ Hoja no encontrada: ${cfg.sheet}`); continue; }
  const { lotes, pagos } = extractFromSheet(ws, cfg, 'Bordado');
  console.log(`  ${cfg.provider.padEnd(16)}: ${lotes.length} lotes, ${pagos.length} pagos`);
  allLotes.push(...lotes);
  allPagos.push(...pagos);
}

// === COSTURA ===
console.log('\n=== Leyendo SERVICIOS COSTURA.xlsx ===');
const wbCostura = new ExcelJS.Workbook();
await wbCostura.xlsx.readFile('SERVICIOS COSTURA.xlsx');

for (const cfg of COSTURA_CFG) {
  const ws = wbCostura.getWorksheet(cfg.sheet);
  if (!ws) { console.log(`  ⚠ Hoja no encontrada: ${cfg.sheet}`); continue; }
  const { lotes, pagos } = extractFromSheet(ws, cfg, 'Costura');
  console.log(`  ${cfg.provider.padEnd(16)}: ${lotes.length} lotes, ${pagos.length} pagos`);
  allLotes.push(...lotes);
  allPagos.push(...pagos);
}

console.log(`\nTotal: ${allLotes.length} lotes, ${allPagos.length} pagos\n`);

console.log('=== Subiendo lotes → ghc_lotes_talleres ===');
await uploadBatch(token, 'ghc_lotes_talleres', allLotes);
console.log(`✓ ${allLotes.length} lotes importados\n`);

console.log('=== Subiendo pagos → ghc_pagos ===');
await uploadBatch(token, 'ghc_pagos', allPagos);
console.log(`✓ ${allPagos.length} pagos importados\n`);

console.log('✓ Importación Bordados + Costura completada.');
