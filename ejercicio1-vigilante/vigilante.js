/**
 * EJERCICIO 1 — VIGILANTE DE RECURSOS (RAM y CPU) — Linux
 * Concepto: Gestor de memoria y E/S del Sistema Operativo.
 *
 * En Linux el kernel expone el estado de la memoria y la CPU a través
 * del sistema de archivos virtual /proc (interfaz del gestor de memoria):
 *   - /proc/meminfo → MemTotal, MemAvailable, SwapTotal, SwapFree
 *   - /proc/stat    → tiempos de CPU por estado (user, nice, system, idle...)
 *
 * El script los lee cada segundo como un panel de control del SO:
 *  - Muestra % de RAM, Swap (memoria virtual) y CPU en tiempo real.
 *  - Si la RAM supera el UMBRAL (80%), escribe una alerta en alertas.txt,
 *    igual que el gestor de memoria dispara eventos de presión (OOM, vmstat).
 *
 * Uso:  node vigilante.js [segundos]
 */

const fs = require('node:fs');
const path = require('node:path');

const UMBRAL_RAM = 80;                        // %
const INTERVALO_MS = 1000;
const DURACION_S = Number(process.argv[2]) || 30;
const LOG = path.join(__dirname, 'alertas.txt');

// ---------- Lectura de /proc/meminfo (gestor de memoria del kernel) ----------
function leerMemoria() {
  const info = {};
  for (const linea of fs.readFileSync('/proc/meminfo', 'utf8').split('\n')) {
    const m = linea.match(/^(\w+):\s+(\d+) kB/);
    if (m) info[m[1]] = Number(m[2]) * 1024;  // bytes
  }
  const total = info.MemTotal;
  const disponible = info.MemAvailable;       // lo que el SO considera usable YA
  const usada = total - disponible;
  return {
    total, usada, disponible,
    pct: (usada / total) * 100,
    swapTotal: info.SwapTotal,
    swapUsada: info.SwapTotal - info.SwapFree, // paginación en uso
  };
}

// ---------- % de CPU desde /proc/stat (diferencia entre dos lecturas) ----------
function leerCpu() {
  const m = fs.readFileSync('/proc/stat', 'utf8')
    .split('\n')[0].match(/^cpu\s+(.*)/)[1].trim().split(/\s+/).map(Number);
  // user nice system idle iowait irq softirq steal
  const idle = m[3] + m[4];
  const total = m.reduce((a, b) => a + b, 0);
  return { idle, total };
}
function usoCpu(a, d) {
  const dTotal = d.total - a.total, dIdle = d.idle - a.idle;
  return dTotal === 0 ? 0 : (1 - dIdle / dTotal) * 100;
}

function barra(pct, ancho = 25) {
  const llenos = Math.round((pct / 100) * ancho);
  return '[' + '#'.repeat(llenos) + '-'.repeat(ancho - llenos) + ']';
}

function registrarAlerta(mem, cpu) {
  fs.appendFileSync(LOG,
    `[${new Date().toISOString()}] ALERTA: RAM ${mem.pct.toFixed(1)}% ` +
    `(${(mem.usada / 1024 ** 3).toFixed(2)} GiB de ${(mem.total / 1024 ** 3).toFixed(2)} GiB) ` +
    `| Swap en uso: ${(mem.swapUsada / 1024 ** 2).toFixed(0)} MiB | CPU ${cpu.toFixed(1)}%\n`);
}

console.log('=== VIGILANTE DE RECURSOS (Linux /proc) ===');
console.log(`Umbral RAM: ${UMBRAL_RAM}% | Muestreo: ${INTERVALO_MS} ms | Duración: ${DURACION_S} s`);
console.log(`Log de alertas: ${LOG}\n`);

let anterior = leerCpu();
let ticks = 0;

const timer = setInterval(() => {
  const actual = leerCpu();
  const cpu = usoCpu(anterior, actual);
  anterior = actual;

  const mem = leerMemoria();
  const alarma = mem.pct >= UMBRAL_RAM;
  const swapPct = mem.swapTotal ? (mem.swapUsada / mem.swapTotal) * 100 : 0;

  console.log(
    `RAM ${barra(mem.pct)} ${mem.pct.toFixed(1).padStart(5)}%  ` +
    `CPU ${barra(cpu)} ${cpu.toFixed(1).padStart(5)}%  ` +
    `SWAP ${(mem.swapUsada / 1024 ** 2).toFixed(0).padStart(5)} MiB (${swapPct.toFixed(1)}%)  ` +
    `${alarma ? '*** ALERTA: RAM > ' + UMBRAL_RAM + '% ***' : ''}`
  );

  if (alarma) registrarAlerta(mem, cpu);

  if (++ticks >= DURACION_S) {
    clearInterval(timer);
    console.log('\nMonitoreo finalizado.');
    console.log(fs.existsSync(LOG)
      ? `Se registraron alertas en ${path.basename(LOG)}`
      : 'La RAM nunca superó el umbral: no hubo alertas.');
  }
}, INTERVALO_MS);
