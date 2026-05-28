// Script de limpieza — borra TODOS los datos de Firestore
// Uso: node scripts/deleteAll.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { createInterface } from 'readline';

const firebaseConfig = {
  apiKey: "AIzaSyA-qQJhy6-MxX7daYZn58GDOnUr07r83Pw",
  authDomain: "administrador-ghc.firebaseapp.com",
  projectId: "administrador-ghc",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

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
  if (snap.empty) { console.log(`  ⬜ ${nombre}: ya está vacío`); return 0; }

  // Eliminar en lotes de 400 (límite Firestore: 500)
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`  ✅ ${nombre}: ${docs.length} documentos eliminados`);
  return docs.length;
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n⚠️  ADVERTENCIA: Esta operación borrará TODOS los datos de Firestore.');
  console.log('   Asegúrate de tener el respaldo en Excel antes de continuar.\n');

  const password = await new Promise(r => rl.question('Contraseña de admin@ghc.com: ', r));
  rl.close();

  console.log('\nConectando a Firebase...');
  try {
    await signInWithEmailAndPassword(auth, 'admin@ghc.com', password);
    console.log('✅ Autenticado\n');
  } catch (e) {
    console.error('❌ Contraseña incorrecta. Abortando.');
    process.exit(1);
  }

  console.log('Borrando colecciones...\n');
  let total = 0;
  for (const col of COLECCIONES) {
    total += await borrarColeccion(col);
  }

  console.log(`\n🎉 Listo. ${total} documentos eliminados en total.`);
  console.log('   Puedes ingresar los datos nuevos desde la app.\n');
  process.exit(0);
}

main().catch(e => {
  console.error('Error inesperado:', e.message);
  process.exit(1);
});
