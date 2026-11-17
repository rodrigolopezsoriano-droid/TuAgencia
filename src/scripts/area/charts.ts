// Gráficos sencillos en SVG (sin librerías) para los paneles.
import { esc, num1 } from './util';

export type Punto = { etiqueta: string; valor: number };

/** Barras verticales (p. ej. horas ahorradas por mes). */
export function barras(datos: Punto[], opts: { unidad?: string; alto?: number; titulo: string }): string {
  const alto = opts.alto ?? 160;
  const W = 100 / Math.max(datos.length, 1);
  const max = Math.max(...datos.map((d) => d.valor), 1);
  const cols = datos
    .map((d, i) => {
      const h = Math.round((d.valor / max) * (alto - 52));
      const x = i * W + W * 0.18;
      const ancho = W * 0.64;
      return `<g><title>${esc(d.etiqueta)}: ${esc(num1(d.valor))}${esc(opts.unidad ?? '')}</title>
        <rect x="${x}%" y="${alto - 22 - h}" width="${ancho}%" height="${Math.max(h, d.valor > 0 ? 3 : 0)}" rx="5" class="${d.valor > 0 ? 'ap-bar' : 'ap-bar vacio'}"/>
        <text x="${x + ancho / 2}%" y="${alto - 6}" text-anchor="middle" class="ap-tick">${esc(d.etiqueta)}</text>
        ${d.valor > 0 ? `<text x="${x + ancho / 2}%" y="${alto - 28 - h}" text-anchor="middle" class="ap-val">${esc(num1(d.valor))}</text>` : ''}</g>`;
    })
    .join('');
  return `<svg class="ap-chart" viewBox="0 0 400 ${alto}" role="img" aria-label="${esc(opts.titulo)}">${cols}</svg>`;
}

/** Barras horizontales con etiqueta y valor (p. ej. contactos por origen). */
export function barrasH(datos: Punto[], opts: { vacio?: string } = {}): string {
  const total = datos.reduce((a, d) => a + d.valor, 0);
  if (!datos.length || !total) return `<p class="ap-vacio">${esc(opts.vacio ?? 'Sin datos todavía')}</p>`;
  const max = Math.max(...datos.map((d) => d.valor), 1);
  return `<ul class="ap-hbars">${datos
    .map((d) => `<li><span class="ap-hbar-l">${esc(d.etiqueta)}</span><span class="ap-hbar-t"><i style="width:${Math.max(4, Math.round((d.valor / max) * 100))}%"></i></span><b>${esc(num1(d.valor))}</b></li>`)
    .join('')}</ul>`;
}

/** Embudo / segmentos en una sola barra con leyenda. */
export function segmentos(datos: (Punto & { color: string })[]): string {
  const total = datos.reduce((a, d) => a + d.valor, 0);
  if (!total) return '<p class="ap-vacio">Sin datos todavía</p>';
  return `<div class="ap-seg" role="img" aria-label="${esc(datos.map((d) => `${d.etiqueta}: ${d.valor}`).join(', '))}">${datos
    .filter((d) => d.valor > 0)
    .map((d) => `<i style="flex:${d.valor};background:${d.color}" title="${esc(d.etiqueta)}: ${d.valor}"></i>`)
    .join('')}</div><ul class="ap-leyenda">${datos
    .map((d) => `<li><i style="background:${d.color}"></i>${esc(d.etiqueta)} <b>${d.valor}</b></li>`)
    .join('')}</ul>`;
}
