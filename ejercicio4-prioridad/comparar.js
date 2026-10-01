/**
 * EJERCICIO 4 — COMPARADOR DE PRIORIDADES
 * Lanza DOS instancias de calculo.js al mismo tiempo:
 *   - una con prioridad BAJA
 *   - una con prioridad ALTA (y, con permisos de admin, TIEMPO REAL)
 * y muestra cuál termina primero, demostrando que el scheduler del SO
 * da más tiempo de CPU al proceso más prioritario.
 *
 * Uso: node comparar.js
 */

const { spawn } = require('node:child_process');
const path = require('node:path');

const script = path.join(__dirname, 'calculo.js');
const resultados = [];

function lanzar(nivel) {
  return new Promise((resolve) => {
    const hijo = spawn(process.execPath, [script, nivel]);
    hijo.stdout.on('data', (d) => {
      const txt = d.toString().trim();
      console.log(txt);
      const m = txt.match(/TERMINÓ en ([\d.]+) s/);
      if (m) resultados.push({ nivel, segundos: parseFloat(m[1]) });
    });
    hijo.on('close', resolve);
  });
}

(async () => {
  console.log('=== COMPARACIÓN DE PRIORIDADES (scheduler del kernel) ===');
  console.log('Lanzando simultáneamente: prioridad BAJA vs ALTA...\n');

  // Se lanzan en paralelo para que compitan por la CPU
  await Promise.all([lanzar('baja'), lanzar('alta')]);

  console.log('\n--- RESULTADOS ---');
  resultados.sort((a, b) => a.segundos - b.segundos);
  resultados.forEach((r, i) =>
    console.log(`${i + 1}. ${r.nivel.toUpperCase().padEnd(8)} ${r.segundos.toFixed(2)} s ${i === 0 ? '<- terminó primero' : ''}`)
  );
  if (resultados.length === 2 && resultados[0].segundos < resultados[1].segundos) {
    const dif = ((resultados[1].segundos / resultados[0].segundos - 1) * 100).toFixed(1);
    console.log(`\nEl proceso de mayor prioridad fue ${dif}% más rápido:`);
    console.log('el scheduler le asignó más quantum de CPU. Eso es planificación de procesos.');
  }
})();
