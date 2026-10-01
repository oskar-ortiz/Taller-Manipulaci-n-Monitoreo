/**
 * EJERCICIO 2 — SIMULADOR DE MEMORIA CACHÉ (L1/L2 vs RAM vs Disco) — Linux
 * Concepto: Jerarquía de memoria.
 *
 * Jerarquía real:  Registros < Caché L1/L2/L3 < RAM < Disco (page cache del SO).
 * Linux ya cachea archivos en RAM (page cache, visible en /proc/meminfo como
 * "Cached"). En este ejercicio implementamos NUESTRA PROPIA caché de
 * aplicación con un Map:
 *   - 1ª lectura: CACHE MISS  → se lee del disco con fs.readFileSync (y se
 *     guarda una copia en el Map, como la MMU/SO guardan páginas en caché).
 *   - Siguientes: CACHE HIT   → se sirve del objeto en RAM sin tocar disco.
 * Se mide con process.hrtime.bigint() (equivalente a console.time).
 *
 * Uso:  node cache.js
 */

const fs = require('node:fs');
const path = require('node:path');

const cache = new Map();          // nuestra "caché L2" en RAM
const ARCHIVO = path.join(__dirname, 'archivo_grande.txt');

// Archivo grande de prueba (~40 MB)
if (!fs.existsSync(ARCHIVO)) {
  console.log('Generando archivo de prueba (~40 MB) en disco...');
  const bloque = 'El gestor de memoria del SO administra RAM, cache y paginacion.\n'.repeat(10000);
  const fd = fs.openSync(ARCHIVO, 'w');
  for (let i = 0; i < 55; i++) fs.writeSync(fd, bloque);
  fs.closeSync(fd);
}

function leerConCache(ruta) {
  if (cache.has(ruta)) {
    return { datos: cache.get(ruta), origen: 'CACHE (RAM)' };   // HIT
  }
  const datos = fs.readFileSync(ruta, 'utf8');                  // MISS: disco
  cache.set(ruta, datos);
  return { datos, origen: 'DISCO' };
}

console.log('\n=== SIMULADOR DE CACHÉ ===');
const tamMB = (fs.statSync(ARCHIVO).size / 1024 ** 2).toFixed(1);
console.log(`Archivo: ${path.basename(ARCHIVO)} (${tamMB} MB)\n`);

const LECTURAS = 5;
let tMiss = 0, tHit = 0;

for (let i = 1; i <= LECTURAS; i++) {
  const inicio = process.hrtime.bigint();
  const { datos, origen } = leerConCache(ARCHIVO);
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;

  if (origen === 'DISCO') tMiss = ms; else tHit += ms;

  console.log(
    `Lectura ${i}: ${origen.padEnd(12)} -> ${ms.toFixed(3).padStart(9)} ms  (${(datos.length / 1024 ** 2).toFixed(1)} MB)`
  );
}

const promHit = tHit / (LECTURAS - 1);
console.log('\n--- RESULTADOS ---');
console.log(`Primer acceso (DISCO, cache miss): ${tMiss.toFixed(3)} ms`);
console.log(`Accesos desde CACHÉ (promedio):    ${promHit.toFixed(3)} ms`);
console.log(`La caché es ~${(tMiss / promHit).toFixed(0)}x más rápida que leer de disco.`);
console.log('\nAsí funciona la page cache del kernel Linux y las cachés L1/L2 del CPU:');
console.log('evitan pagar el costo del nivel de memoria más lento en cada acceso.');
