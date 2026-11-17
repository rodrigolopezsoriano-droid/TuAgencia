// Revisa el SEO básico de TODAS las páginas compiladas (dist/). Uso: npm run build && npm run seo
//  - canonical a https://tuagencia.tech/... con la ruta de la propia página
//  - un único <h1>
//  - description presente y no repetida en otra página
// Termina con error (código 1) si algo falla, para poder usarlo antes de publicar.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = 'dist';
const ORIGEN = 'https://tuagencia.tech';
if (!existsSync(DIST)) {
  console.error('No existe dist/. Ejecuta antes: npm run build');
  process.exit(1);
}

// Páginas que no son "de contenido" y se excluyen de la comprobación (demos privadas, informes, etc.)
const IGNORAR = [/^spaceverona\//, /^demo/, /^informe_/, /^casos\/(barberia|moda)\/foto/];

const html = [];
(function recorrer(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) recorrer(p);
    else if (f.endsWith('.html')) html.push(p);
  }
})(DIST);

const meta = (src, patron) => (src.match(patron) ?? [])[1];
const problemas = [];
const descripciones = new Map();
let revisadas = 0;

for (const archivo of html.sort()) {
  const rel = relative(DIST, archivo).split(sep).join('/');
  if (IGNORAR.some((r) => r.test(rel))) continue;
  const src = readFileSync(archivo, 'utf8');
  if (!src.includes('rel="canonical"')) continue; // no es una página de la web (p. ej. un HTML suelto de public/)
  revisadas++;

  // Ruta esperada: index.html → /, carpeta/index.html → /carpeta
  let ruta = '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
  if (ruta === '/') ruta = '/';
  const esperada = ORIGEN + (ruta === '/' ? '/' : ruta);

  const canonical = meta(src, /<link rel="canonical" href="([^"]*)"/);
  if (!canonical) problemas.push(`${ruta}: falta canonical`);
  else if (!canonical.startsWith(ORIGEN + '/')) problemas.push(`${ruta}: canonical fuera de ${ORIGEN} → ${canonical}`);
  else if (canonical.replace(/\/$/, '') !== esperada.replace(/\/$/, '')) problemas.push(`${ruta}: canonical distinto de la ruta → ${canonical}`);

  const h1 = (src.match(/<h1[\s>]/g) ?? []).length;
  if (h1 !== 1) problemas.push(`${ruta}: tiene ${h1} <h1> (debe haber exactamente 1)`);

  const desc = meta(src, /<meta name="description" content="([^"]*)"/);
  if (!desc) problemas.push(`${ruta}: falta meta description`);
  else {
    if (!descripciones.has(desc)) descripciones.set(desc, []);
    descripciones.get(desc).push(ruta);
  }
}

for (const [desc, rutas] of descripciones) {
  if (rutas.length > 1) problemas.push(`description repetida en ${rutas.join(', ')} → «${desc.slice(0, 70)}…»`);
}

console.log(`Páginas revisadas: ${revisadas}`);
if (problemas.length) {
  console.log(`\n✖ ${problemas.length} problema(s):`);
  problemas.forEach((p) => console.log('  - ' + p));
  process.exit(1);
}
console.log('✔ Todas las páginas tienen canonical correcto, un único H1 y description única.');
