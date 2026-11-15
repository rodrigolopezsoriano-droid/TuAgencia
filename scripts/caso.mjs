// Censura o descensura un caso de éxito.
//   npm run descensurar -- barberia   → muestra el nombre y las fotos originales (cuando el cliente dé permiso)
//   npm run censurar    -- barberia   → vuelve al modo anónimo con imágenes censuradas
//   (casos disponibles: barberia, moda)
//
// Usa la carpeta local casos-privados/<caso>/ (ignorada por Git):
//   originales/foto-N.webp   imágenes sin censurar
//   censuradas/foto-N.webp   las mismas, censuradas
//   datos.json               { "nombre": "…" }
// Después de ejecutarlo: npm run build, revisar la página y hacer commit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CASOS = ['barberia', 'moda'];
const [modo, caso] = process.argv.slice(2);
if (!['descensurar', 'censurar'].includes(modo) || !CASOS.includes(caso)) {
  console.error(`Uso: npm run descensurar -- <caso>   |   npm run censurar -- <caso>\nCasos: ${CASOS.join(', ')}`);
  process.exit(1);
}

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const privado = path.join(raiz, 'casos-privados', caso);
const publico = path.join(raiz, 'public', 'casos', caso);
const datos = path.join(raiz, 'src', 'data', 'casos.ts');
const PREFIJO = `CASO_${caso.toUpperCase()}`;

const origen = path.join(privado, modo === 'descensurar' ? 'originales' : 'censuradas');
if (!fs.existsSync(origen)) {
  console.error(`No existe ${origen}. Este material solo está en el PC donde se preparó.`);
  process.exit(1);
}
const fotos = fs.readdirSync(origen).filter((f) => f.endsWith('.webp')).sort();
if (!fotos.length) { console.error('No hay imágenes en ' + origen); process.exit(1); }

let nombre = '';
if (modo === 'descensurar') {
  try { nombre = String(JSON.parse(fs.readFileSync(path.join(privado, 'datos.json'), 'utf8')).nombre ?? '').trim(); } catch {}
  if (!nombre) { console.error(`Falta "nombre" en casos-privados/${caso}/datos.json`); process.exit(1); }
  const prohibidos = [39, 92, 13, 10].map((n) => String.fromCharCode(n)); // comilla simple, barra, saltos de línea
  if ([...nombre].some((c) => prohibidos.includes(c))) { console.error('El nombre no puede llevar comillas simples, barras ni saltos de línea.'); process.exit(1); }
}

fs.mkdirSync(publico, { recursive: true });
for (const f of fotos) fs.copyFileSync(path.join(origen, f), path.join(publico, f));

let src = fs.readFileSync(datos, 'utf8');
const antes = src;
src = src
  .replace(new RegExp(`export const ${PREFIJO}_CENSURADO = (true|false);`), `export const ${PREFIJO}_CENSURADO = ${modo === 'censurar'};`)
  .replace(new RegExp(`export const ${PREFIJO}_NOMBRE = '[^\n]*';`), `export const ${PREFIJO}_NOMBRE = '${nombre}';`);
if (src === antes && modo === 'descensurar') { console.error('No se pudo actualizar src/data/casos.ts'); process.exit(1); }
fs.writeFileSync(datos, src);

console.log(`✔ ${modo === 'descensurar' ? 'DESCENSURADO' : 'CENSURADO'} «${caso}»: ${fotos.length} imágenes copiadas a public/casos/${caso}/ y src/data/casos.ts actualizado.`);
console.log('Siguiente: npm run build · revisar la página del caso · commit.');
if (modo === 'descensurar') console.log('⚠ Las imágenes originales y el nombre pasarán a ser públicos al hacer push.');
