// /llms.txt: resumen de la web para buscadores con IA (ChatGPT, Gemini, Perplexity…)
import { SITE } from '../data/site';
import { SOLUCIONES } from '../data/soluciones';
import { SECTORES } from '../data/sectores';
import { PLANES } from '../data/precios';

export function GET() {
  const t = [
    `# TuAgencia (${SITE.dominio})`,
    '',
    `> ${SITE.descripcion}`,
    '',
    `Agencia de automatización con inteligencia artificial para pymes y negocios locales. Zona: ${SITE.zona.join(', ')} (España) y en remoto. Contacto: ${SITE.email}.`,
    '',
    '## Soluciones',
    ...SOLUCIONES.map((s) => `- [${s.nombre}](${SITE.url}/soluciones/${s.slug}): ${s.resumen}`),
    '',
    '## Sectores',
    ...SECTORES.map((s) => `- [${s.nombre}](${SITE.url}/sectores/${s.slug}): ${s.problema}`),
    '',
    '## Precios (orientativos, sin IVA)',
    ...PLANES.map((p) => `- ${p.nombre}: puesta en marcha ${p.setup} €, desde ${p.mensualIntro ?? p.mensual} €/mes. ${p.para}`),
    '',
    `## Contacto\n- [Auditoría gratuita](${SITE.url}/contacto)`,
  ].join('\n');
  return new Response(t, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
