// Censura o descensura el caso de la barbería (/casos/barberia-alcala).
//   npm run descensurar   → muestra el nombre y las fotos originales (cuando el cliente dé permiso)
//   npm run censurar      → vuelve al modo anónimo con fotos difuminadas
//
// Usa la carpeta local casos-privados/barberia/ (ignorada por Git):
//   originales/foto-N.webp   fotos sin censurar
//   censuradas/foto-N.webp   las mismas, difuminadas
//   datos.json               { "nombre": "…" }
// Después de ejecutarlo: npm run build, revisar la página y hacer commit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const privado = path.join(raiz, 'casos-privados', 'barberia');
const publico = path.join(raiz, 'public', 'casos', 'barberia');
const datos = path.join(raiz, 'src', 'data', 'casos.ts');

const modo = process.argv[2];
if (modo !== 'descensurar' && modo !== 'censurar') {
  console.error('Uso: node scripts/caso-barberia.mjs descensurar | censurar');
  process.exit(1);
}

const origen = path.join(privado, modo === 'descensurar' ? 'originales' : 'censuradas');
if (!fs.existsSync(origen)) {
  console.error(`No existe ${origen}. Este material solo está en el PC donde se preparó.`);
  process.exit(1);
}
const fotos = fs.readdirSync(origen).filter((f) => f.endsWith('.webp')).sort();
if (!fotos.length) { console.error('No hay fotos en ' + origen); process.exit(1); }

let nombre = '';
if (modo === 'descensurar') {
  try { nombre = String(JSON.parse(fs.readFileSync(path.join(privado, 'datos.json'), 'utf8')).nombre ?? '').trim(); } catch {}
  if (!nombre) { console.error('Falta "nombre" en casos-privados/barberia/datos.json'); process.exit(1); }
  if (/['\\\r\n]/.test(nombre)) { console.error('El nombre no puede llevar comillas simples, barras ni saltos de línea.'); process.exit(1); }
}

fs.mkdirSync(publico, { recursive: true });
for (const f of fotos) fs.copyFileSync(path.join(origen, f), path.join(publico, f));

let src = fs.readFileSync(datos, 'utf8');
src = src
  .replace(/export const CASO_CENSURADO = (true|false);/, `export const CASO_CENSURADO = ${modo === 'censurar'};`)
  .replace(/export const CASO_NOMBRE = '[^\n]*';/, `export const CASO_NOMBRE = '${nombre}';`);
fs.writeFileSync(datos, src);

console.log(`✔ ${modo === 'descensurar' ? 'DESCENSURADO' : 'CENSURADO'}: ${fotos.length} fotos copiadas a public/casos/barberia/ y src/data/casos.ts actualizado.`);
console.log('Siguiente: npm run build · revisar /casos/barberia-alcala · commit.');
if (modo === 'descensurar') console.log('⚠ Las fotos originales pasarán a ser públicas al hacer push.');
