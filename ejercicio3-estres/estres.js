/**
 * EJERCICIO 3 — ESTRÉS DE MEMORIA Y MEMORIA VIRTUAL (PAGINACIÓN) — Linux
 * Concepto: Memoria virtual, paginación y swap.
 *
 * Llenamos un array con millones de strings (= MB de datos) para ejercer
 * presión sobre la RAM. Cuando la RAM física escasea, el gestor de memoria
 * del kernel (kswapd en Linux / Memory Manager "System" en Windows) mueve
 * páginas al área de swap / archivo de paginación (paginación).
 *
 * MIENTRAS CORRE, en otra terminal observar la memoria virtual subir:
 *     watch -n1 free -m          (columnas used / swap)
 *     vmstat 1                   (columnas si/so = swap in/out)
 *
 * SEGURIDAD (obligatoria para no tumbar la máquina):
 *  - Límite duro en MB reservados por el script (MAX_MB).
 *  - Se detiene si la RAM disponible del sistema baja del 8%.
 *  - Ctrl+C libera todo y sale limpio (y el SO recupera las páginas).
 *
 * Uso:  node estres.js [MAX_MB]
 */

const fs = require('node:fs');

const MAX_MB = Number(process.argv[2]) || 1500;   // límite por defecto: 1.5 GB
const LIBRE_MIN_PCT = 8;

const bloques = [];
let mb = 0;

function memDisponible() {
  const info = fs.readFileSync('/proc/meminfo', 'utf8');
  const total = Number(info.match(/MemTotal:\s+(\d+)/)[1]);
  const avail = Number(info.match(/MemAvailable:\s+(\d+)/)[1]);
  const swapT = Number(info.match(/SwapTotal:\s+(\d+)/)[1]);
  const swapF = Number(info.match(/SwapFree:\s+(\d+)/)[1]);
  return { total, avail, pct: (avail / total) * 100, swapUsada: swapT - swapF };
}

function liberar() {
  bloques.length = 0;                              // el GC devuelve las páginas al SO
  global.gc && global.gc();
  console.log('\nMemoria liberada correctamente (el kernel recupera las páginas).');
}

process.on('SIGINT', () => { liberar(); process.exit(0); });

const mem = memDisponible();
console.log('=== ESTRÉS DE MEMORIA (con límite de seguridad) ===');
console.log(`RAM total: ${(mem.total / 1024 ** 2).toFixed(2)} GiB | Límite del script: ${MAX_MB} MB`);
console.log('>> Abre otra terminal y corre:  watch -n1 free -m');
console.log('>> Ctrl+C detiene y libera todo.\n');

const timer = setInterval(() => {
  const m = memDisponible();

  if (mb >= MAX_MB || m.pct < LIBRE_MIN_PCT) {
    clearInterval(timer);
    console.log(mb >= MAX_MB
      ? `\nLímite de seguridad alcanzado (${MAX_MB} MB).`
      : `\nRAM disponible < ${LIBRE_MIN_PCT}%: el kernel está paginando. Alto por seguridad.`);
    console.log(`Swap en uso ahora: ${(m.swapUsada / 1024).toFixed(1)} MiB`);
    console.log('>>> La memoria se mantiene 60 s para que observes el swap en free -m <<<');
    setTimeout(() => { liberar(); console.log('Limpieza terminada. Fin.'); process.exit(0); }, 60000);
    return;
  }

  try {
    // Buffer.alloc materializa la página de verdad (los strings concatenados
    // de V8 serían "ropes" perezosos y no ocuparían RAM real).
    for (let i = 0; i < 40; i++) bloques.push(Buffer.alloc(1024 * 1024, mb++ % 256));
  } catch (e) {
    clearInterval(timer);
    console.log('\nHeap agotado (el OOM killer del kernel estaría al acecho). Saliendo seguro...');
    liberar();
    process.exit(0);
  }

  console.log(
    `Asignados: ${String(mb).padStart(5)} MB | RAM disp: ${(m.avail / 1024 ** 2).toFixed(2)} GiB (${m.pct.toFixed(1)}%) | Swap usado: ${(m.swapUsada / 1024).toFixed(1)} MiB`
  );
}, 250);
