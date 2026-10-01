/**
 * EJERCICIO 4 — PRIORIDAD DE PROCESOS (SCHEDULING) — Linux
 * Concepto: Planificación de procesos del kernel.
 *
 * En Linux el scheduler (CFS/EEVDF) reparte la CPU según el valor NICE
 * (-20 = más prioritario ... +19 = menos prioritario). os.setPriority()
 * de Node usa setpriority(2), es decir, cambia el nice del proceso.
 *
 *   node calculo.js baja      → nice +19  (como: nice -n 19 node ...)
 *   node calculo.js alta      → nice -10  (requiere privilegios / sudo)
 *   node calculo.js realtime  → nice -20  (requiere privilegios / sudo)
 *
 * Uso individual:   node calculo.js [baja|normal|alta|realtime]
 * Comparación auto: node comparar.js
 */

const os = require('node:os');
const { performance } = require('node:perf_hooks');

const PRIORIDADES = {
  baja:     os.constants.priority.PRIORITY_LOW,        // nice +19
  normal:   os.constants.priority.PRIORITY_NORMAL,     // nice  0
  alta:     os.constants.priority.PRIORITY_HIGH,       // nice -10
  realtime: os.constants.priority.PRIORITY_REALTIME,   // nice -20
};

const nivel = process.argv[2] || 'normal';
const prioridad = PRIORIDADES[nivel];

if (prioridad === undefined) {
  console.error('Uso: node calculo.js [baja|normal|alta|realtime]');
  process.exit(1);
}

try {
  os.setPriority(prioridad);                            // setpriority(2)
} catch (e) {
  console.error(`No se pudo fijar prioridad "${nivel}" (${e.message}). Continúo con nice 0.`);
}

const niceReal = os.getPriority ? os.getPriority() : prioridad;
console.log(`[PID ${process.pid}] Prioridad = ${nivel.toUpperCase()} (nice=${niceReal}) — cálculo pesado en marcha...`);

// ---- Cálculo CPU-bound: suma de senos/raíces ----
const inicio = performance.now();
let acumulador = 0;
for (let i = 1; i <= 120_000_000; i++) {
  acumulador += Math.sin(i) * Math.sqrt(i % 997);
  if (acumulador > Number.MAX_SAFE_INTEGER / 2) acumulador = 0;
}
const ms = performance.now() - inicio;

console.log(`[PID ${process.pid}] Prioridad ${nivel.toUpperCase()} TERMINÓ en ${(ms / 1000).toFixed(2)} s (checksum: ${acumulador.toFixed(2)})`);
