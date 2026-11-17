// Estado ligero de la sesión para pintar el menú de cuenta en la cabecera de TODA la web
// sin cargar la librería de Supabase en cada página. Es solo una pista visual: lo que cada persona
// puede ver y hacer lo decide siempre la base de datos (RLS) al abrir su panel.

export type Rol = 'cliente' | 'equipo' | 'admin';
export type SesionLigera = { nombre: string; rol: Rol; email: string };

const KEY = 'ta_sesion';

/** Clave donde supabase-js guarda la sesión (sb-<proyecto>-auth-token). */
export function claveSupabase(): string | null {
  try {
    return `sb-${new URL(import.meta.env.PUBLIC_SUPABASE_URL as string).hostname.split('.')[0]}-auth-token`;
  } catch { return null; }
}

function tokenGuardado(): { email?: string } | null {
  const k = claveSupabase();
  if (!k) return null;
  try {
    const v = localStorage.getItem(k);
    if (!v) return null;
    const j = JSON.parse(v);
    return j && (j.access_token || j.refresh_token) ? { email: j.user?.email } : null;
  } catch { return null; }
}

/** ¿Hay una sesión iniciada en este navegador? (no la valida: solo mira que exista) */
export const haySesion = () => tokenGuardado() !== null;

export function leerSesion(): SesionLigera | null {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return j && j.email && ['cliente', 'equipo', 'admin'].includes(j.rol) ? (j as SesionLigera) : null;
  } catch { return null; }
}
export function guardarSesion(s: SesionLigera) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin almacenamiento */ }
  if (typeof document !== 'undefined') document.documentElement.classList.add('ta-logueado');
}
export function borrarSesion() {
  try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
  if (typeof document !== 'undefined') document.documentElement.classList.remove('ta-logueado');
}
export const emailDeLaSesion = () => tokenGuardado()?.email ?? '';

export type Entrada = { href: string; texto: string; icono: string; grupo?: string; peligro?: boolean };

/** Enlaces del menú de cuenta según el rol (llevan al panel en la sección elegida). */
export function menuPorRol(rol: Rol): Entrada[] {
  const p = (r: string) => `/area-cliente#/${r}`;
  if (rol === 'cliente') {
    return [
      { href: p('resumen'), texto: 'Mi panel', icono: 'inicio' },
      { href: p('automatizaciones'), texto: 'Automatizaciones', icono: 'rayo' },
      { href: p('resultados'), texto: 'Resultados', icono: 'grafica' },
      { href: p('informes'), texto: 'Informes', icono: 'archivo' },
      { href: p('solicitudes'), texto: 'Solicitudes', icono: 'bandeja' },
      { href: p('ayuda'), texto: 'Ayuda', icono: 'ayuda' },
    ];
  }
  const base: Entrada[] = [
    { href: p('resumen'), texto: 'Panel de gestión', icono: 'inicio' },
    { href: p('contactos'), texto: 'Contactos', icono: 'contactos' },
    { href: p('solicitudes'), texto: 'Solicitudes', icono: 'bandeja' },
    { href: p('clientes'), texto: 'Clientes', icono: 'usuarios' },
    { href: p('metricas'), texto: 'Métricas', icono: 'grafica' },
  ];
  if (rol === 'admin') base.push({ href: p('ingresos'), texto: 'Ingresos', icono: 'euro' });
  return base;
}
