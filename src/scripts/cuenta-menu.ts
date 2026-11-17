// Menú de cuenta de la cabecera: si hay sesión iniciada, en vez de "Área cliente" se ve el nombre de la
// persona y un desplegable con lo que puede hacer. Así sigue navegando por la web con normalidad.
import { borrarSesion, emailDeLaSesion, guardarSesion, haySesion, leerSesion, menuPorRol, type SesionLigera } from './sesion';
import { esc, icono, inicial } from './area/util';

const ROL_TXT = { cliente: 'Cliente', equipo: 'Equipo', admin: 'Administrador' };
let resolviendo = false;

function datos(): (SesionLigera & { provisional: boolean }) | null {
  if (!haySesion()) return null;
  const s = leerSesion();
  if (s) return { ...s, provisional: false };
  const email = emailDeLaSesion();
  return { nombre: email.split('@')[0] || 'Mi cuenta', rol: 'cliente', email, provisional: true };
}

const lista = (s: SesionLigera) =>
  `<p class="cta-rol">${esc(ROL_TXT[s.rol])} · ${esc(s.email)}</p>` +
  menuPorRol(s.rol).map((e) => `<a role="menuitem" href="${esc(e.href)}">${icono(e.icono, 16)}<span>${esc(e.texto)}</span></a>`).join('') +
  `<hr /><a role="menuitem" href="/area-cliente#/cuenta">${icono('usuario', 16)}<span>Mi cuenta</span></a>` +
  `<button type="button" role="menuitem" data-cuenta-cambiar>${icono('cambiar', 16)}<span>Cambiar de cuenta</span></button>` +
  `<button type="button" role="menuitem" class="cta-salir" data-cuenta-salir>${icono('salir', 16)}<span>Cerrar sesión</span></button>`;

function pintar() {
  const wrap = document.querySelector<HTMLElement>('[data-cuenta]');
  const enlace = document.querySelector<HTMLElement>('[data-login-link]');
  const hoja = document.querySelector<HTMLElement>('[data-cuenta-sheet]');
  const enlaceHoja = document.querySelector<HTMLElement>('[data-login-sheet]');
  if (!wrap) return;
  const d = datos();
  document.documentElement.classList.toggle('ta-logueado', !!d);
  wrap.hidden = !d;
  if (enlace) enlace.hidden = !!d;
  if (enlaceHoja) enlaceHoja.hidden = !!d;
  if (hoja) { hoja.hidden = !d; hoja.innerHTML = d ? `<p class="cta-sheet-t">${esc(d.nombre)} · ${esc(ROL_TXT[d.rol])}</p>${menuPorRol(d.rol).map((e) => `<a href="${esc(e.href)}">${esc(e.texto)}</a>`).join('')}<a href="/area-cliente#/cuenta">Mi cuenta</a><button type="button" data-cuenta-salir>Cerrar sesión</button>` : ''; }
  if (!d) { cerrar(); return; }
  const btn = wrap.querySelector<HTMLElement>('[data-cuenta-btn]')!;
  btn.innerHTML = `<span class="cta-av">${esc(inicial(d.nombre))}</span><span class="cta-n">${esc(d.nombre.split(' ')[0])}</span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
  btn.setAttribute('aria-label', `Menú de ${d.nombre}`);
  wrap.querySelector<HTMLElement>('[data-cuenta-menu]')!.innerHTML = lista(d);
}

function cerrar(devolverFoco = false) {
  const wrap = document.querySelector<HTMLElement>('[data-cuenta]');
  const menu = wrap?.querySelector<HTMLElement>('[data-cuenta-menu]');
  const btn = wrap?.querySelector<HTMLElement>('[data-cuenta-btn]');
  if (menu) menu.hidden = true;
  btn?.setAttribute('aria-expanded', 'false');
  if (devolverFoco) btn?.focus();
}

/** Si solo sabíamos el email del token, averiguamos nombre y rol (carga perezosa: solo al abrir el menú). */
async function completarDatos() {
  if (resolviendo || leerSesion() || !haySesion()) return;
  resolviendo = true;
  try {
    const [{ supabase }, { resolverRol }] = await Promise.all([import('./supabase'), import('./area/datos')]);
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { borrarSesion(); pintar(); return; }
    const { rol, nombre } = await resolverRol(session.user);
    let nom = nombre;
    if (!nom) {
      const { data } = await supabase.from('perfiles').select('nombre').eq('user_id', session.user.id).maybeSingle();
      nom = (data as { nombre?: string } | null)?.nombre || (session.user.email ?? '').split('@')[0];
    }
    guardarSesion({ nombre: nom, rol, email: (session.user.email ?? '').toLowerCase() });
    pintar();
    const menu = document.querySelector<HTMLElement>('[data-cuenta-menu]');
    if (menu && !menu.hidden) menu.querySelector<HTMLElement>('a')?.focus();
  } catch { /* se queda con lo que hay */ } finally { resolviendo = false; }
}

async function salir(cambiar: boolean) {
  try {
    const { supabase } = await import('./supabase');
    await supabase?.auth.signOut({ scope: 'local' });
  } catch { /* aunque falle la red, cerramos aquí */ }
  borrarSesion();
  pintar();
  if (cambiar) location.href = '/area-cliente';
}

export function iniciarMenuCuenta() {
  const wrap = document.querySelector<HTMLElement>('[data-cuenta]');
  if (!wrap) return;
  pintar();

  const btn = wrap.querySelector<HTMLElement>('[data-cuenta-btn]')!;
  const menu = wrap.querySelector<HTMLElement>('[data-cuenta-menu]')!;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = menu.hidden;
    menu.hidden = !abrir;
    btn.setAttribute('aria-expanded', String(abrir));
    if (abrir) { completarDatos(); menu.querySelector<HTMLElement>('a')?.focus(); }
  });
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-cuenta-salir]')) { salir(false); return; }
    if (t.closest('[data-cuenta-cambiar]')) { salir(true); return; }
    if (!t.closest('[data-cuenta]')) cerrar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) cerrar(true);
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !menu.hidden) {
      const items = [...menu.querySelectorAll<HTMLElement>('[role=menuitem]')];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
      e.preventDefault();
    }
  });
  // Si inicias o cierras sesión en otra pestaña, la cabecera se actualiza sola
  window.addEventListener('storage', pintar);
}
