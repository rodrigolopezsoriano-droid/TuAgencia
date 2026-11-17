// Área de cliente: acceso (iniciar sesión / registrarse) + panel con menú para cliente, equipo y admin.
// La seguridad real la imponen las políticas RLS de Supabase; esta pantalla solo muestra lo que cada rol puede ver.
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { limpiarPerfil } from '../perfil';
import { S, cargarCliente, cargarEquipo, resolverRol, type Rol } from './datos';
import { ACT, FORM, puente, type Ruta, type Vista } from './nucleo';
import { RUTAS_CLIENTE, vistaCliente } from './vistas-cliente';
import { rutasEquipo, vistaEquipo } from './vistas-equipo';
import { $, $$, aviso, esc, hace, icono, inicial, mayus } from './util';

const MIN_PASS = 10;
const memoria = {
  get: (k: string) => { try { return localStorage.getItem(k) ?? ''; } catch { return ''; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};

const show = (v: 'auth' | 'recovery' | 'app') => {
  $$('[data-view]').forEach((el) => (el.hidden = el.dataset.view !== v));
  document.documentElement.classList.toggle('app-on', v === 'app');
};
const decir = (id: string, texto: string, tipo: '' | 'ok' | 'err' = '') => {
  const e = $(`[data-msg="${id}"]`);
  e.textContent = texto;
  e.className = `msg ${tipo}`.trim();
};

// ──────────────────────────── ACCESO ────────────────────────────
function pestana(t: string) {
  $$('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  $$('[data-form="login"],[data-form="registro"]').forEach((f) => (f.hidden = f.dataset.form !== t));
}

function iniciarAcceso() {
  $$('[data-tab]').forEach((b) => b.addEventListener('click', () => pestana(b.dataset.tab!)));
  if (location.hash === '#registro' || new URLSearchParams(location.search).has('registro')) pestana('registro');
  $<HTMLInputElement>('#l-email').value = memoria.get('ta_email');

  $<HTMLFormElement>('[data-form="login"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('[data-reenviar]').hidden = true;
    const f = e.currentTarget as HTMLFormElement;
    const email = (f.elements.namedItem('email') as HTMLInputElement).value.trim();
    const password = (f.elements.namedItem('password') as HTMLInputElement).value;
    if (!supabase) return decir('login', 'El acceso no está disponible ahora mismo. Inténtalo más tarde o escríbenos.', 'err');
    if (!/^\S+@\S+\.\S+$/.test(email) || !password) return decir('login', 'Escribe tu email y tu contraseña.', 'err');
    decir('login', 'Entrando…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (/confirm/i.test(error.message)) { $('[data-reenviar]').hidden = false; return decir('login', 'Primero tienes que confirmar tu correo: revisa tu bandeja de entrada.', 'err'); }
      return decir('login', 'Email o contraseña incorrectos.', 'err');
    }
    memoria.set('ta_email', email);
    decir('login', '');
    f.reset(); // la sesión nueva dispara la carga del panel
  });

  $('[data-reenviar]').addEventListener('click', async () => {
    const email = $<HTMLInputElement>('#l-email').value.trim();
    if (!supabase || !email) return;
    await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: location.origin + '/area-cliente' } });
    decir('login', 'Te hemos reenviado el correo de confirmación.', 'ok');
  });

  $('[data-olvido]').addEventListener('click', async () => {
    const email = $<HTMLInputElement>('#l-email').value.trim();
    if (!supabase) return decir('login', 'El acceso no está disponible ahora mismo.', 'err');
    if (!/^\S+@\S+\.\S+$/.test(email)) return decir('login', 'Escribe primero tu email y vuelve a pulsar.', 'err');
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/area-cliente' });
    decir('login', 'Si ese email tiene cuenta, te hemos enviado un enlace para elegir una contraseña nueva.', 'ok');
  });

  $<HTMLFormElement>('[data-form="registro"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.currentTarget as HTMLFormElement;
    const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
    const nombre = v('nombre'), negocio = v('negocio'), email = v('email'), telefono = v('telefono');
    const password = (f.elements.namedItem('password') as HTMLInputElement).value;
    if (!supabase) return decir('registro', 'El registro no está disponible ahora mismo. Inténtalo más tarde o escríbenos.', 'err');
    if (nombre.length < 2) return decir('registro', 'Escribe tu nombre.', 'err');
    if (!/^\S+@\S+\.\S+$/.test(email)) return decir('registro', 'Escribe un email válido.', 'err');
    if (password.length < MIN_PASS) return decir('registro', `La contraseña debe tener al menos ${MIN_PASS} caracteres.`, 'err');
    if (!(f.elements.namedItem('acepta') as HTMLInputElement).checked) return decir('registro', 'Necesitamos que aceptes la política de privacidad.', 'err');
    decir('registro', 'Creando tu cuenta…');
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre, negocio, telefono }, emailRedirectTo: location.origin + '/area-cliente' },
    });
    if (error) {
      return decir('registro', /password|weak|short/i.test(error.message) ? 'Esa contraseña es demasiado débil. Prueba con otra más larga.' : 'No hemos podido crear la cuenta. Inténtalo de nuevo en unos minutos.', 'err');
    }
    memoria.set('ta_email', email);
    f.reset();
    if (data.session) return; // sin confirmación por correo: ya has entrado
    // Mismo mensaje exista o no la cuenta (así no se puede averiguar qué emails están registrados)
    decir('registro', 'Casi está: te hemos enviado un correo para confirmar tu cuenta. Si ya tenías una, inicia sesión.', 'ok');
  });

  $<HTMLFormElement>('[data-form="recovery"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = $<HTMLInputElement>('#n-pass').value;
    if (!supabase) return;
    if (pass.length < MIN_PASS) return decir('recovery', `La contraseña debe tener al menos ${MIN_PASS} caracteres.`, 'err');
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) return decir('recovery', 'No se ha podido cambiar la contraseña. Pide un enlace nuevo.', 'err');
    decir('recovery', 'Contraseña cambiada.', 'ok');
    history.replaceState(null, '', location.pathname);
    recuperando = false;
    setTimeout(entrar, 600);
  });
}

// ──────────────────────────── PANEL ────────────────────────────
const ROL_TXT: Record<Rol, string> = { cliente: 'Cliente', equipo: 'Equipo', admin: 'Administrador' };

function rutasActuales(): Ruta[] {
  if (!S.ctx) return [];
  if (S.ctx.rol === 'cliente') {
    const abiertas = S.cli?.tickets.filter((t) => t.estado !== 'cerrado' && t.respuesta).length ?? 0; // con respuesta pendiente de leer
    return RUTAS_CLIENTE.map((r) => (r.id === 'solicitudes' && abiertas ? { ...r, badge: abiertas } : r));
  }
  return rutasEquipo(S.ctx.rol === 'admin');
}

function montarShell() {
  const ctx = S.ctx!;
  const rutas = rutasActuales();
  const secciones = [...new Set(rutas.map((r) => r.seccion))];
  $('#ap-nav').innerHTML = secciones
    .map((s) => `<div class="ap-nav-g"><p>${esc(s ?? '')}</p>${rutas.filter((r) => r.seccion === s).map((r) => `<a href="#/${r.id}" data-ruta="${r.id}">${icono(r.icono, 18)}<span>${esc(r.etiqueta)}</span>${r.badge ? `<i class="ap-badge">${r.badge > 99 ? '99+' : r.badge}</i>` : ''}</a>`).join('')}</div>`)
    .join('');
  const nombre = (ctx.rol === 'cliente' ? S.cli?.perfil?.nombre : ctx.nombre || S.eq?.perfiles.get(ctx.user.id)?.nombre) || ctx.email.split('@')[0];
  ctx.nombre = nombre;
  $('#ap-user').innerHTML = `<span class="ap-avatar">${esc(inicial(nombre))}</span><div><b>${esc(nombre)}</b><small>${esc(ROL_TXT[ctx.rol])}</small></div>`;
  $('#ap-menu-btn').innerHTML = `<span class="ap-avatar sm">${esc(inicial(nombre))}</span><span class="ap-menu-n">${esc(nombre.split(' ')[0])}</span>`;
  $('#ap-menu-rol').textContent = `${ROL_TXT[ctx.rol]} · ${ctx.email}`;
  $('#ap-rol-badge').textContent = ctx.rol === 'cliente' ? '' : ROL_TXT[ctx.rol];
  $('#ap-rol-badge').hidden = ctx.rol === 'cliente';
  $('#ap-buscador').hidden = ctx.rol === 'cliente';
}

function parseRuta(): { id: string; args: string[] } {
  const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { id: partes[0] || 'resumen', args: partes.slice(1) };
}

function enrutar(conservarScroll = false) {
  if (!S.ctx) return;
  let { id, args } = parseRuta();
  const rutas = rutasActuales();
  if (!rutas.some((r) => r.id === id)) { id = 'resumen'; args = []; }
  let vista: Vista | null = null;
  try {
    vista = S.ctx.rol === 'cliente' ? vistaCliente(id, args) : vistaEquipo(id, args);
  } catch (e) {
    console.error(e);
    vista = { titulo: 'Error', html: '<div class="ap-empty"><h3>No hemos podido mostrar esta pantalla</h3><p>Pulsa “Actualizar” o vuelve a entrar.</p></div>' };
  }
  vista ??= { titulo: 'Resumen', html: '' };
  const cont = $('#ap-contenido');
  const y = window.scrollY;
  cont.innerHTML = vista.html;
  $('#ap-titulo').textContent = vista.titulo;
  document.title = `${vista.titulo} · Área cliente | TuAgencia`;
  $$('#ap-nav a').forEach((a) => (a.dataset.ruta === id ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  cerrarDrawer();
  if (conservarScroll) window.scrollTo(0, y);
  else { window.scrollTo(0, 0); cont.focus({ preventScroll: true }); }
  vista.montar?.(cont);
}

puente.repintar = () => {
  const activo = document.activeElement as HTMLElement | null;
  const nombreInp = activo?.dataset?.inp;
  const pos = (activo as HTMLInputElement | null)?.selectionStart ?? null;
  enrutar(true);
  if (nombreInp) {
    const el = $$<HTMLInputElement>(`[data-inp="${nombreInp}"]`)[0];
    if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(pos ?? el.value.length, pos ?? el.value.length); } catch { /* tipo search */ } }
  }
};
puente.ir = (hash) => { if (location.hash === hash) enrutar(); else location.hash = hash; };

async function cargarDatos() {
  const ctx = S.ctx!;
  if (ctx.rol === 'cliente') S.cli = await cargarCliente(ctx.user);
  else S.eq = await cargarEquipo();
  S.actualizado = Date.now();
  montarShell();
  pintarActualizado();
}
puente.recargar = async () => { await cargarDatos(); enrutar(true); };

function pintarActualizado() {
  const e = $('#ap-actualizado');
  e.textContent = S.actualizado ? `Actualizado ${hace(new Date(S.actualizado).toISOString())}` : '';
}

// ── Drawer móvil ──
function abrirDrawer() { $('#ap-side').classList.add('open'); $('#ap-backdrop').classList.add('open'); $('#ap-burger').setAttribute('aria-expanded', 'true'); }
function cerrarDrawer() { $('#ap-side').classList.remove('open'); $('#ap-backdrop').classList.remove('open'); $('#ap-burger').setAttribute('aria-expanded', 'false'); }

// ── Menú de usuario ──
function menuUsuario(abrir: boolean) {
  $('#ap-menu').hidden = !abrir;
  $('#ap-menu-btn').setAttribute('aria-expanded', String(abrir));
}

// ── Cerrar sesión / cambiar de cuenta ──
function limpiarTodo() {
  S.ctx = null; S.cli = null; S.eq = null; S.actualizado = 0;
  limpiarPerfil();
  $('#ap-contenido').innerHTML = '';
  $('#ap-resultados').innerHTML = '';
  $<HTMLInputElement>('#ap-q').value = '';
  menuUsuario(false);
  cerrarDrawer();
  document.title = 'Área cliente | TuAgencia';
}

async function salir(modo: 'normal' | 'cambiar' | 'todo') {
  try { await supabase?.auth.signOut({ scope: modo === 'todo' ? 'global' : 'local' }); } catch { /* aunque falle la red, cerramos la pantalla */ }
  limpiarTodo();
  history.replaceState(null, '', location.pathname);
  show('auth');
  pestana('login');
  const email = $<HTMLInputElement>('#l-email');
  if (modo === 'cambiar') { email.value = ''; memoria.set('ta_email', ''); }
  else email.value = memoria.get('ta_email');
  decir('login', modo === 'cambiar' ? 'Sesión cerrada. Entra con otra cuenta.' : modo === 'todo' ? 'Hemos cerrado tu sesión en todos los dispositivos.' : 'Has cerrado sesión.', 'ok');
  (modo === 'cambiar' ? email : $<HTMLInputElement>('#l-pass')).focus();
}
ACT['salir'] = () => salir('normal');
ACT['cambiar-cuenta'] = () => salir('cambiar');
ACT['salir-todo'] = () => salir('todo');
ACT['actualizar'] = async () => {
  const b = $('#ap-refrescar');
  b.classList.add('girando');
  try { await puente.recargar(); aviso('Datos actualizados.', 'info'); } catch { aviso('No se han podido actualizar los datos.', 'err'); }
  b.classList.remove('girando');
};

// ── Buscador global (equipo/admin) ──
function buscar(q: string) {
  const box = $('#ap-resultados');
  const t = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (t.length < 2 || !S.eq) { box.innerHTML = ''; box.hidden = true; return; }
  const n = (s: string | null | undefined) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const res: { ic: string; t: string; s: string; href: string }[] = [
    ...S.eq.clientes.filter((c) => n(`${c.negocio} ${c.contacto} ${c.email}`).includes(t)).slice(0, 4).map((c) => ({ ic: 'usuarios', t: c.negocio, s: `Cliente · ${c.email ?? ''}`, href: `#/clientes/${c.id}` })),
    ...S.eq.leads.filter((l) => n(`${l.nombre} ${l.negocio} ${l.email}`).includes(t)).slice(0, 4).map((l) => ({ ic: 'contactos', t: l.nombre, s: `Contacto · ${l.negocio || l.email}`, href: `#/contactos/${l.id}` })),
    ...S.eq.tickets.filter((x) => n(`${x.titulo} ${x.mensaje}`).includes(t)).slice(0, 3).map((x) => ({ ic: 'bandeja', t: x.titulo || x.tipo, s: `Solicitud · ${mayus(x.estado)}`, href: `#/solicitudes/${x.id}` })),
  ].slice(0, 9);
  box.hidden = false;
  box.innerHTML = res.length
    ? res.map((r) => `<a href="${esc(r.href)}" role="option">${icono(r.ic, 16)}<span><b>${esc(r.t)}</b><small>${esc(r.s)}</small></span></a>`).join('')
    : '<p class="ap-vacio">Sin resultados</p>';
}

// ── Eventos delegados ──
function eventos() {
  const app = $('[data-view="app"]');
  const ejecutar = async (fn: () => void | Promise<void>) => {
    try { await fn(); } catch (e) { console.error(e); aviso('Algo ha fallado. Inténtalo de nuevo.', 'err'); }
  };
  app.addEventListener('click', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!el || el.matches('select,input,textarea')) return;
    const fn = ACT[el.dataset.act!];
    if (fn) { ev.preventDefault(); ejecutar(() => fn(el, ev)); }
    if (!(ev.target as HTMLElement).closest('#ap-menu, #ap-menu-btn')) menuUsuario(false);
  });
  app.addEventListener('change', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-chg]');
    const fn = el && ACT[el.dataset.chg!];
    if (el && fn) ejecutar(() => fn(el, ev));
  });
  let temporizador = 0;
  app.addEventListener('input', (ev) => {
    const el = (ev.target as HTMLElement).closest<HTMLElement>('[data-inp]');
    const fn = el && ACT[el.dataset.inp!];
    if (!el || !fn) return;
    clearTimeout(temporizador);
    temporizador = window.setTimeout(() => ejecutar(() => fn(el, ev)), 150);
  });
  app.addEventListener('submit', (ev) => {
    const f = (ev.target as HTMLElement).closest<HTMLFormElement>('form[data-form]');
    const fn = f && FORM[f.dataset.form!];
    if (!f || !fn) return;
    ev.preventDefault();
    ejecutar(() => fn(f, ev as SubmitEvent));
  });

  $('#ap-burger').addEventListener('click', () => ($('#ap-side').classList.contains('open') ? cerrarDrawer() : abrirDrawer()));
  $('#ap-backdrop').addEventListener('click', cerrarDrawer);
  $('#ap-menu-btn').addEventListener('click', (e) => { e.stopPropagation(); menuUsuario($('#ap-menu').hidden); });
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('#ap-menu, #ap-menu-btn')) menuUsuario(false);
    if (!(e.target as HTMLElement).closest('#ap-buscador')) $('#ap-resultados').hidden = true;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { menuUsuario(false); cerrarDrawer(); $('#ap-resultados').hidden = true; }
  });
  $('#ap-q').addEventListener('input', (e) => buscar((e.target as HTMLInputElement).value));
  $('#ap-q').addEventListener('focus', (e) => buscar((e.target as HTMLInputElement).value));
  $('#ap-resultados').addEventListener('click', () => { $('#ap-resultados').hidden = true; $<HTMLInputElement>('#ap-q').value = ''; });
  addEventListener('hashchange', () => { if (S.ctx) enrutar(); });

  // Actualización automática cada minuto si la pestaña está a la vista y no estás escribiendo
  setInterval(async () => {
    if (!S.ctx || document.visibilityState !== 'visible' || document.querySelector('dialog[open]')) { pintarActualizado(); return; }
    pintarActualizado();
    if (Date.now() - S.actualizado < 60_000) return;
    const a = document.activeElement as HTMLElement | null;
    const escribiendo = !!a && a.closest('#ap-contenido') && a.matches('input,textarea,select');
    try { await cargarDatos(); if (!escribiendo) enrutar(true); } catch { /* se reintenta en el siguiente ciclo */ }
  }, 30_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && S.ctx && Date.now() - S.actualizado > 60_000) puente.recargar().catch(() => {});
  });
}

// ──────────────────────────── ENTRADA ────────────────────────────
// Si llegas desde el enlace "contraseña olvidada", primero toca elegir la nueva (no cargar el panel todavía)
let recuperando = /type=recovery/.test(location.hash);
let ocupado = false;

async function entrar() {
  if (!supabase || ocupado || recuperando) return;
  ocupado = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { limpiarTodo(); return show('auth'); }
    await abrirPanel(session.user);
  } catch (e) {
    console.error(e);
    limpiarTodo();
    show('auth');
    decir('login', 'No hemos podido cargar tu área. Inténtalo de nuevo.', 'err');
  } finally { ocupado = false; }
}

async function abrirPanel(user: User) {
  const { rol, nombre } = await resolverRol(user);
  S.ctx = { user, rol, nombre, email: (user.email ?? '').toLowerCase() };
  await cargarDatos();
  if (!location.hash.startsWith('#/')) history.replaceState(null, '', location.pathname + '#/resumen');
  show('app');
  enrutar();
}

export function iniciar() {
  iniciarAcceso();
  eventos();
  if (!supabase) { $('[data-aviso-config]').hidden = false; show('auth'); return; }
  supabase.auth.onAuthStateChange((evento: string, session: Session | null) => {
    // (no se llama a Supabase directamente dentro de este callback)
    if (evento === 'PASSWORD_RECOVERY') { recuperando = true; show('recovery'); return; }
    if (recuperando) return; // mientras eliges la contraseña nueva no se carga el panel
    if (evento === 'SIGNED_OUT') { if (S.ctx) { limpiarTodo(); show('auth'); } return; }
    if (evento === 'INITIAL_SESSION' && !session) { show('auth'); return; }
    if (evento === 'INITIAL_SESSION' || evento === 'SIGNED_IN') {
      if (session && S.ctx && session.user.id === S.ctx.user.id) return; // ya cargado (p. ej. al volver a la pestaña)
      setTimeout(entrar, 0);
    }
  });
}
