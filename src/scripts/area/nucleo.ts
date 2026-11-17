// Piezas comunes de los paneles: tipos, registro de acciones y componentes HTML pequeños.
import { esc, icono } from './util';

export type Vista = { titulo: string; html: string; montar?: (raiz: HTMLElement) => void };
export type Ruta = { id: string; etiqueta: string; icono: string; seccion?: string; badge?: number };

/** Acciones por clic / cambio / envío: se enlazan con data-act="..." y data-form="..." en el HTML. */
export const ACT: Record<string, (el: HTMLElement, ev: Event) => void | Promise<void>> = {};
export const FORM: Record<string, (f: HTMLFormElement, ev: SubmitEvent) => void | Promise<void>> = {};

/** Los rellena app.ts: así las vistas pueden pedir "repintar" o "ir a" sin importar el router. */
export const puente = {
  repintar: () => {},
  ir: (hash: string) => { location.hash = hash; },
  recargar: async () => {},
};

export const kpi = (etiqueta: string, valor: string, nota = '', ic = '') =>
  `<div class="ap-kpi">${ic ? `<span class="ap-kpi-ic">${icono(ic, 18)}</span>` : ''}<span class="ap-kpi-l">${esc(etiqueta)}</span><strong>${esc(valor)}</strong>${nota ? `<span class="ap-kpi-n">${nota}</span>` : ''}</div>`;

export const chip = (texto: string, cls = '') => `<span class="ap-chip ${esc(cls)}">${esc(texto)}</span>`;

export const chipEstado = (estado: string) => chip(estado, estado.replace(/\s+/g, '-'));

export const vacio = (ic: string, titulo: string, texto: string, accion = '') =>
  `<div class="ap-empty"><span>${icono(ic, 28)}</span><h3>${esc(titulo)}</h3><p>${esc(texto)}</p>${accion}</div>`;

export const tarjeta = (titulo: string, cuerpo: string, extra = '', cls = '') =>
  `<section class="ap-card ${cls}"><header class="ap-card-h"><h2>${esc(titulo)}</h2>${extra}</header>${cuerpo}</section>`;

export const volver = (hash: string, texto: string) =>
  `<a class="ap-back" href="${esc(hash)}">${icono('atras', 16)}<span>${esc(texto)}</span></a>`;

export const boton = (texto: string, attrs: string, cls = 'ap-btn-sec', ic = '') =>
  `<button type="button" class="btn btn-sm ${cls}" ${attrs}>${ic ? icono(ic, 16) : ''}<span>${esc(texto)}</span></button>`;

export const opciones = (lista: { v: string; t: string }[], actual: string) =>
  lista.map((o) => `<option value="${esc(o.v)}" ${o.v === actual ? 'selected' : ''}>${esc(o.t)}</option>`).join('');

export const ESTADOS_TICKET = ['abierto', 'en curso', 'cerrado'];
export const ESTADOS_LEAD = ['nuevo', 'contactado', 'demo', 'cliente', 'descartado'];
export const TIPOS_TICKET: Record<string, string> = {
  'nueva automatización': 'Nueva automatización',
  cambio: 'Cambio',
  incidencia: 'Incidencia',
  otro: 'Otro',
};
export const ORIGEN_LEAD = (o: string | null) =>
  ({ web: 'Formulario web', calculadora: 'Calculadora', 'informe-resenas': 'Informe de reseñas' } as Record<string, string>)[o ?? 'web'] ?? (o || 'Web');
