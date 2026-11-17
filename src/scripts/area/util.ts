// Utilidades comunes de los paneles del área de cliente (sin librerías).

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
export const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
export const num = (n: number) => nf.format(n);
export const num1 = (n: number) => nf1.format(n);
export const eur = (n: number) => nf.format(Math.round(n)) + ' €';

export const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** "hace 5 min", "hace 3 h", "hace 2 días"… */
export function hace(iso: string, ahora = Date.now()): string {
  const s = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'ahora mismo';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  const mes = Math.round(d / 30);
  return mes < 12 ? `hace ${mes} ${mes === 1 ? 'mes' : 'meses'}` : fecha(iso);
}

export const urlSegura = (u: string) => (/^https?:\/\//i.test(u) ? u : '#');
export const clase = (s: string) => String(s).replace(/\s+/g, '-');
export const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const inicial = (s: string) => (s.trim().charAt(0) || '?').toUpperCase();

/** Clave 'YYYY-MM' de una fecha o ISO */
export const mesDe = (f: string | Date) => (typeof f === 'string' ? f : f.toISOString()).slice(0, 7);
export const NOMBRE_MES = (clave: string) =>
  mayus(new Date(`${clave}-01T12:00:00Z`).toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).replace('.', ''));
/** Últimos n meses (más antiguo primero) como 'YYYY-MM' */
export function ultimosMeses(n: number, hoy = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(mesDe(new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1))));
  return out;
}

/** Teléfono → número para wa.me (asume España si no lleva prefijo) */
export function telWhatsapp(t: string | null | undefined): string {
  const d = String(t ?? '').replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('00')) return d.slice(2);
  return d.length === 9 ? '34' + d : d;
}

export function descargarCsv(nombre: string, filas: (string | number | null | undefined)[][]) {
  const celda = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+\-@]/.test(s)) s = "'" + s; // evita que Excel lo interprete como fórmula
    return `"${s.replace(/"/g, '""')}"`;
  };
  const blob = new Blob(['﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ── Iconos (trazo, 24×24) ──
const P: Record<string, string> = {
  inicio: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
  rayo: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  grafica: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  archivo: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  bandeja: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.5 3.5 6"/>',
  contactos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  ayuda: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17h.01"/>',
  salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  cambiar: '<path d="M7 7h13l-3-3"/><path d="M17 17H4l3 3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  refrescar: '<path d="M20 11a8 8 0 0 0-14-4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14 4l2-2"/><path d="M20 20v-5h-5"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  atras: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  euro: '<path d="M18 6.5A7 7 0 1 0 18 17.5"/><path d="M4 10h9M4 14h9"/>',
  escudo: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2.2 2.2L15 10"/>',
  descargar: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  enlace: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/>',
  papelera: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  telefono: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
};
export const icono = (n: string, tam = 20) =>
  `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] ?? ''}</svg>`;

// ── Avisos (toast) ──
let toastTimer = 0;
export function aviso(texto: string, tipo: 'ok' | 'err' | 'info' = 'ok') {
  let t = document.getElementById('ap-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'ap-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.className = `ap-toast ${tipo} show`;
  t.textContent = texto;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove('show'), tipo === 'err' ? 6000 : 3500);
}

// ── Diálogo de confirmación ──
export function confirmar(titulo: string, detalle: string, boton = 'Confirmar', peligro = false): Promise<boolean> {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'ap-dialog';
    d.innerHTML = `<form method="dialog"><h2>${esc(titulo)}</h2><p>${esc(detalle)}</p><div class="ap-dialog-acc"><button class="btn btn-sm ap-btn-sec" value="no" type="submit">Cancelar</button><button class="btn btn-sm ${peligro ? 'ap-btn-peligro' : 'btn-primary'}" value="si" type="submit">${esc(boton)}</button></div></form>`;
    document.body.appendChild(d);
    d.addEventListener('close', () => { const ok = d.returnValue === 'si'; d.remove(); resolve(ok); });
    d.showModal();
    d.querySelector<HTMLButtonElement>('button[value="no"]')?.focus();
  });
}
