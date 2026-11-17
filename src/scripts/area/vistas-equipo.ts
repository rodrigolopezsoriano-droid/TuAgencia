// Vistas del panel del EQUIPO y del ADMINISTRADOR. El admin ve además "Ingresos".
// La seguridad real la imponen las políticas RLS de la base de datos; aquí solo se muestran u ocultan botones.
import { S, op } from './datos';
import type { Cliente, DatosEquipo, Lead, Nota, Ticket } from './datos';
import {
  ACT, ESTADOS_LEAD, ESTADOS_TICKET, FORM, ORIGEN_LEAD, TIPOS_TICKET, boton, chip, chipEstado, kpi, opciones, puente, tarjeta, vacio, volver, type Vista,
} from './nucleo';
import { barras, barrasH, segmentos } from './charts';
import {
  NOMBRE_MES, aviso, confirmar, descargarCsv, eur, esc, fecha, fechaHora, hace, icono, mayus, mesDe, num, num1, telWhatsapp, ultimosMeses, urlSegura,
} from './util';
import { MESES_INTRO, PLANES } from '../../data/precios';
import { cuenta } from './vistas-cliente';

const E = (): DatosEquipo => S.eq!;
const esAdmin = () => S.ctx!.rol === 'admin';
const hoyISO = () => new Date().toISOString().slice(0, 10);
const horas = (h: number) => h * 3600_000;

const nombreCliente = (c: Cliente) => (c.negocio && c.negocio !== 'Sin indicar' ? c.negocio : c.contacto || c.email || `Cliente ${c.id}`);
const clientePorUsuario = (uid: string | null) => (uid ? E().clientes.find((c) => c.user_id === uid) : undefined);
const clientePorId = (id: number) => E().clientes.find((c) => c.id === id);
const quienTicket = (t: Ticket) => {
  const c = clientePorUsuario(t.user_id);
  const p = E().perfiles.get(t.user_id);
  return { c, p, nombre: c ? nombreCliente(c) : p?.negocio || p?.nombre || p?.email || 'Cliente' };
};

const horasPorMes = () => {
  const r = new Map<string, number>();
  E().metricas.forEach((m) => r.set(mesDe(m.fecha), (r.get(mesDe(m.fecha)) ?? 0) + m.horas_ahorradas));
  return r;
};

export function precioMensual(c: Cliente, ahora = new Date()): number {
  const p = PLANES.find((x) => x.nombre === c.plan);
  if (!p) return 0;
  const alta = new Date(c.alta);
  const meses = (ahora.getFullYear() - alta.getFullYear()) * 12 + (ahora.getMonth() - alta.getMonth());
  return p.mensualIntro && meses < MESES_INTRO ? p.mensualIntro : p.mensual;
}

// ───────────────────────── RESUMEN ─────────────────────────
function resumen(): Vista {
  const { tickets, leads, clientes } = E();
  const meses = ultimosMeses(6);
  const hm = horasPorMes();
  const horasMes = hm.get(meses[5]) ?? 0;
  const abiertos = tickets.filter((t) => t.estado !== 'cerrado');
  const nuevos = leads.filter((l) => l.estado === 'nuevo');
  const conPlan = clientes.filter((c) => c.plan).length;
  const mrr = clientes.reduce((a, c) => a + precioMensual(c), 0);
  const ahora = Date.now();

  type Pend = { t: number; html: string };
  const pend: Pend[] = [
    ...abiertos.map((t) => {
      const q = quienTicket(t);
      const viejo = ahora - new Date(t.creado).getTime() > horas(48);
      return { t: new Date(t.creado).getTime(), html: `<li><a href="#/solicitudes/${t.id}"><span class="ap-pend-ic">${icono('bandeja', 18)}</span><div><b>${esc(t.titulo || TIPOS_TICKET[t.tipo] || t.tipo)}</b><small>${esc(q.nombre)} · ${esc(hace(t.creado))}</small></div>${t.tipo === 'incidencia' ? chip('Incidencia', 'abierto') : ''}${viejo ? chip('+48 h', 'urgente') : chipEstado(t.estado)}</a></li>` };
    }),
    ...nuevos.map((l) => {
      const viejo = ahora - new Date(l.creado).getTime() > horas(24);
      return { t: new Date(l.creado).getTime(), html: `<li><a href="#/contactos/${l.id}"><span class="ap-pend-ic lead">${icono('contactos', 18)}</span><div><b>${esc(l.nombre)}${l.negocio ? ' · ' + esc(l.negocio) : ''}</b><small>${esc(ORIGEN_LEAD(l.origen))} · ${esc(hace(l.creado))}</small></div>${viejo ? chip('+24 h sin contactar', 'urgente') : chip('Nuevo', 'nuevo')}</a></li>` };
    }),
  ].sort((a, b) => a.t - b.t).slice(0, 7);

  const colores: Record<string, string> = { nuevo: '#3b82f6', contactado: '#6366f1', demo: '#d946ef', cliente: '#16a34a', descartado: '#a1a1aa' };
  const pipeline = ESTADOS_LEAD.map((e) => ({ etiqueta: mayus(e), valor: leads.filter((l) => l.estado === e).length, color: colores[e] }));
  const orig = new Map<string, number>();
  leads.forEach((l) => orig.set(ORIGEN_LEAD(l.origen), (orig.get(ORIGEN_LEAD(l.origen)) ?? 0) + 1));

  const actividad = [
    ...leads.slice(0, 8).map((l) => ({ t: new Date(l.creado).getTime(), ic: 'contactos', txt: `Nuevo contacto: <b>${esc(l.nombre)}</b> (${esc(ORIGEN_LEAD(l.origen))})`, href: `#/contactos/${l.id}`, iso: l.creado })),
    ...tickets.slice(0, 8).map((t) => ({ t: new Date(t.creado).getTime(), ic: 'bandeja', txt: `Solicitud de <b>${esc(quienTicket(t).nombre)}</b>: ${esc(t.titulo || TIPOS_TICKET[t.tipo] || t.tipo)}`, href: `#/solicitudes/${t.id}`, iso: t.creado })),
  ].sort((a, b) => b.t - a.t).slice(0, 8);

  const nombre = (S.ctx!.nombre || S.ctx!.email).split(' ')[0];
  const html = `
  <section class="ap-hero">
    <div><p class="ap-eyebrow">${esAdmin() ? 'Administrador' : 'Equipo'} · ${esc(new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
      <h2>Hola, ${esc(nombre)} 👋</h2>
      <p class="ap-sub">${abiertos.length + nuevos.length ? `Tienes <b>${abiertos.length}</b> solicitud${abiertos.length === 1 ? '' : 'es'} sin cerrar y <b>${nuevos.length}</b> contacto${nuevos.length === 1 ? '' : 's'} nuevo${nuevos.length === 1 ? '' : 's'}.` : 'Todo al día: no hay nada pendiente.'}</p></div>
    <div class="ap-hero-acc"><a class="btn btn-primary btn-sm" href="#/solicitudes">${icono('bandeja', 16)}<span>Ver solicitudes</span></a><a class="btn btn-sm ap-btn-sec" href="#/contactos">${icono('contactos', 16)}<span>Ver contactos</span></a></div>
  </section>
  <div class="ap-kpis ${esAdmin() ? 'ap-kpis5' : ''}">
    ${kpi('Contactos nuevos', String(nuevos.length), `${leads.length} en total`, 'contactos')}
    ${kpi('Solicitudes sin cerrar', String(abiertos.length), `${tickets.length} en total`, 'bandeja')}
    ${kpi('Clientes', String(clientes.length), `${conPlan} con plan`, 'usuarios')}
    ${kpi('Horas ahorradas este mes', num1(horasMes) + ' h', 'Entre todos los clientes', 'reloj')}
    ${esAdmin() ? kpi('Ingresos mensuales (est.)', eur(mrr), 'Según planes y fecha de alta', 'euro') : ''}
  </div>
  <div class="ap-grid2">
    ${tarjeta('Requiere atención', pend.length ? `<ul class="ap-lista ap-pend">${pend.map((p) => p.html).join('')}</ul>` : '<p class="ap-vacio">Nada pendiente. ¡Buen trabajo!</p>')}
    ${tarjeta('Embudo de contactos', segmentos(pipeline))}
  </div>
  <div class="ap-grid2">
    ${tarjeta('Horas ahorradas por mes (todos los clientes)', barras(meses.map((m) => ({ etiqueta: NOMBRE_MES(m), valor: Math.round((hm.get(m) ?? 0) * 10) / 10 })), { unidad: ' h', titulo: 'Horas ahorradas por mes' }))}
    ${tarjeta('De dónde llegan los contactos', barrasH([...orig].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor), { vacio: 'Aún no hay contactos.' }))}
  </div>
  ${tarjeta('Actividad reciente', actividad.length ? `<ul class="ap-lista ap-act">${actividad.map((a) => `<li><a href="${a.href}"><span class="ap-pend-ic">${icono(a.ic, 16)}</span><span>${a.txt}</span><small>${esc(hace(a.iso))}</small></a></li>`).join('')}</ul>` : '<p class="ap-vacio">Todavía no hay actividad.</p>')}`;
  return { titulo: 'Resumen', html };
}

// ───────────────────────── CONTACTOS (leads) ─────────────────────────
const normaliza = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function contactos(args: string[]): Vista {
  if (args[0]) return contactoDetalle(Number(args[0]));
  const { leads } = E();
  const u = S.ui;
  const b = normaliza(u.leadBusca);
  const lista = leads.filter((l) =>
    (u.leadFiltro === 'todos' || l.estado === u.leadFiltro) &&
    (!u.leadOrigen || (l.origen ?? 'web') === u.leadOrigen) &&
    (!b || normaliza(`${l.nombre} ${l.negocio ?? ''} ${l.email} ${l.interes ?? ''}`).includes(b)));
  const origenes = [...new Set(leads.map((l) => l.origen ?? 'web'))];
  const cuenta = (e: string) => (e === 'todos' ? leads.length : leads.filter((l) => l.estado === e).length);
  const html = `
  <div class="ap-bar-acc">
    <div class="ap-tabs" role="tablist" aria-label="Estado">${['todos', ...ESTADOS_LEAD].map((e) => `<button type="button" role="tab" aria-selected="${u.leadFiltro === e}" data-act="lead-filtro" data-f="${e}">${mayus(e)} <small>${cuenta(e)}</small></button>`).join('')}</div>
    ${boton('Exportar CSV', 'data-act="leads-csv"', 'ap-btn-sec', 'descargar')}
  </div>
  <div class="ap-filtros">
    <label class="ap-buscar">${icono('buscar', 16)}<span class="sr-only">Buscar contactos</span><input type="search" data-inp="lead-busca" placeholder="Buscar por nombre, negocio o email…" value="${esc(u.leadBusca)}" /></label>
    <label class="sr-only" for="f-origen">Origen</label>
    <select id="f-origen" class="input ap-sel" data-chg="lead-origen"><option value="">Todos los orígenes</option>${opciones(origenes.map((o) => ({ v: o, t: ORIGEN_LEAD(o) })), u.leadOrigen)}</select>
  </div>
  ${lista.length
    ? `<div class="ap-card ap-tabla-c"><div class="ap-tabla"><table><thead><tr><th>Contacto</th><th>Interés</th><th>Origen</th><th>Recibido</th><th>Estado</th></tr></thead><tbody>${lista.map((l) => `<tr><td><a class="ap-fuerte" href="#/contactos/${l.id}">${esc(l.nombre)}</a><small>${esc(l.negocio || l.email)}</small></td><td>${esc(l.interes || '—')}</td><td>${esc(ORIGEN_LEAD(l.origen))}</td><td title="${esc(fechaHora(l.creado))}">${esc(hace(l.creado))}</td><td><select class="ap-sel-mini ${esc(l.estado)}" data-chg="lead-estado" data-id="${l.id}" aria-label="Estado de ${esc(l.nombre)}">${opciones(ESTADOS_LEAD.map((e) => ({ v: e, t: mayus(e) })), l.estado)}</select></td></tr>`).join('')}</tbody></table></div></div>`
    : vacio('contactos', leads.length ? 'Ningún contacto con esos filtros' : 'Todavía no hay contactos', leads.length ? 'Cambia el filtro o la búsqueda.' : 'Cuando alguien rellene un formulario de la web, aparecerá aquí.')}`;
  return { titulo: 'Contactos', html };
}
ACT['lead-filtro'] = (el) => { S.ui.leadFiltro = el.dataset.f!; puente.repintar(); };
ACT['lead-busca'] = (el) => { S.ui.leadBusca = (el as HTMLInputElement).value; puente.repintar(); };
ACT['lead-origen'] = (el) => { S.ui.leadOrigen = (el as HTMLSelectElement).value; puente.repintar(); };
ACT['lead-estado'] = async (el) => {
  const id = Number(el.dataset.id), estado = (el as HTMLSelectElement).value;
  const err = await op.leadEstado(id, estado);
  if (err) { aviso('No se ha podido cambiar el estado.', 'err'); return puente.repintar(); }
  const l = E().leads.find((x) => x.id === id); if (l) l.estado = estado;
  aviso('Estado actualizado.');
  puente.repintar();
};
ACT['leads-csv'] = () => {
  descargarCsv(`contactos-${hoyISO()}.csv`, [
    ['Fecha', 'Nombre', 'Negocio', 'Email', 'Teléfono', 'Interés', 'Origen', 'Estado', 'Mensaje'],
    ...E().leads.map((l) => [l.creado.slice(0, 10), l.nombre, l.negocio, l.email, l.telefono, l.interes, ORIGEN_LEAD(l.origen), l.estado, l.mensaje]),
  ]);
};

function contactoDetalle(id: number): Vista {
  const l = E().leads.find((x) => x.id === id);
  if (!l) return { titulo: 'Contacto', html: `${volver('#/contactos', 'Contactos')}${vacio('contactos', 'No encontramos ese contacto', 'Puede que se haya eliminado.')}` };
  const cli = clientePorUsuario(l.user_id) ?? E().clientes.find((c) => c.email && c.email.toLowerCase() === l.email.toLowerCase());
  const wa = telWhatsapp(l.telefono);
  const html = `${volver('#/contactos', 'Contactos')}
  <section class="ap-card ap-det">
    <header class="ap-det-h"><div><p class="ap-eyebrow">${esc(ORIGEN_LEAD(l.origen))} · ${esc(fechaHora(l.creado))}</p><h2>${esc(l.nombre)}</h2>${l.negocio ? `<p class="ap-sub">${esc(l.negocio)}</p>` : ''}</div>
      <select class="ap-sel-mini ${esc(l.estado)}" data-chg="lead-estado-det" data-id="${l.id}" aria-label="Estado del contacto">${opciones(ESTADOS_LEAD.map((e) => ({ v: e, t: mayus(e) })), l.estado)}</select></header>
    <div class="ap-acciones-r">
      <a class="btn btn-sm btn-primary" href="mailto:${esc(l.email)}">${icono('contactos', 16)}<span>Escribir email</span></a>
      ${l.telefono ? `<a class="btn btn-sm ap-btn-sec" href="tel:${esc(l.telefono.replace(/\s/g, ''))}">${icono('telefono', 16)}<span>Llamar</span></a>` : ''}
      ${wa ? `<a class="btn btn-sm ap-btn-sec" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${icono('chat', 16)}<span>WhatsApp</span></a>` : ''}
      ${cli ? `<a class="btn btn-sm ap-btn-sec" href="#/clientes/${cli.id}">${icono('usuarios', 16)}<span>Ver como cliente</span></a>` : ''}
    </div>
    <dl class="ap-dl"><div><dt>Email</dt><dd>${esc(l.email)}</dd></div><div><dt>Teléfono</dt><dd>${esc(l.telefono || '—')}</dd></div><div><dt>Interés</dt><dd>${esc(l.interes || '—')}</dd></div><div><dt>Recibido</dt><dd>${esc(hace(l.creado))}</dd></div></dl>
    <div><h3 class="ap-h3">Mensaje</h3><p class="ap-texto">${esc(l.mensaje || 'No ha escrito ningún mensaje.')}</p></div>
  </section>
  ${tarjeta('Notas internas', notasHtml('lead', l.id), '<span class="ap-nota-i">Solo las ve el equipo</span>')}`;
  return { titulo: 'Contacto', html, montar: (r) => cargarNotas(r, 'lead', l.id) };
}
ACT['lead-estado-det'] = ACT['lead-estado'];

// ── Notas internas (contactos y clientes) ──
const notasHtml = (tipo: string, ref: number) => `
  <form data-form="nota-nueva" data-tipo="${tipo}" data-ref="${ref}" class="ap-form ap-nota-f" novalidate>
    <label class="sr-only" for="nota-t">Nueva nota</label>
    <textarea class="input" id="nota-t" name="texto" rows="2" maxlength="2000" placeholder="Escribe una nota (llamada, acuerdos, próximos pasos…)"></textarea>
    <div class="ap-form-acc"><button class="btn btn-dark btn-sm" type="submit">Añadir nota</button></div>
  </form>
  <ul class="ap-notas" data-notas><li class="ap-vacio">Cargando notas…</li></ul>`;

const pintarNotas = (filas: Nota[]) =>
  filas.length
    ? filas.map((n) => `<li data-nota="${n.id}"><div><b>${esc(n.autor.split('@')[0])}</b><small>${esc(fechaHora(n.creado))}</small>${n.autor === S.ctx!.email.toLowerCase() || esAdmin() ? `<button type="button" class="ap-x" data-act="nota-borrar" data-id="${n.id}" aria-label="Borrar nota">${icono('cerrar', 14)}</button>` : ''}</div><p>${esc(n.texto)}</p></li>`).join('')
    : '<li class="ap-vacio">Todavía no hay notas.</li>';

async function cargarNotas(raiz: HTMLElement, tipo: 'lead' | 'cliente', ref: number) {
  const cont = raiz.querySelector<HTMLElement>('[data-notas]');
  if (!cont) return;
  const { filas, error } = await op.notas(tipo, ref);
  cont.innerHTML = error
    ? '<li class="ap-vacio">Las notas aún no están activas: hay que ejecutar la última versión de supabase/schema.sql en Supabase.</li>'
    : pintarNotas(filas);
}

FORM['nota-nueva'] = async (f) => {
  const ta = f.elements.namedItem('texto') as HTMLTextAreaElement;
  const texto = ta.value.trim();
  if (!texto) return;
  const tipo = f.dataset.tipo as 'lead' | 'cliente', ref = Number(f.dataset.ref);
  const { fila, error } = await op.notaNueva(tipo, ref, texto);
  if (error || !fila) return aviso('No se ha podido guardar la nota.', 'err');
  ta.value = '';
  const cont = document.querySelector<HTMLElement>('[data-notas]');
  if (cont) { const v = cont.querySelector('.ap-vacio'); if (v) v.remove(); cont.insertAdjacentHTML('afterbegin', pintarNotas([fila])); }
  aviso('Nota añadida.');
};
ACT['nota-borrar'] = async (el) => {
  if (!(await confirmar('¿Borrar la nota?', 'Se eliminará para todo el equipo.', 'Borrar', true))) return;
  const err = await op.notaBorrar(Number(el.dataset.id));
  if (err) return aviso('No se ha podido borrar.', 'err');
  el.closest('li')?.remove();
};

// ───────────────────────── SOLICITUDES (tickets) ─────────────────────────
function solicitudes(args: string[]): Vista {
  if (args[0]) return solicitudDetalle(Number(args[0]));
  const { tickets } = E();
  const u = S.ui;
  const b = normaliza(u.solBusca);
  const lista = tickets.filter((t) =>
    (u.solFiltro === 'todas' || t.estado === u.solFiltro) &&
    (!u.solTipo || t.tipo === u.solTipo) &&
    (!b || normaliza(`${t.titulo ?? ''} ${t.mensaje} ${quienTicket(t).nombre}`).includes(b)));
  const filtros = [['todas', 'Todas'], ['abierto', 'Abiertas'], ['en curso', 'En curso'], ['cerrado', 'Cerradas']];
  const cuenta = (f: string) => (f === 'todas' ? tickets.length : tickets.filter((t) => t.estado === f).length);
  const html = `
  <div class="ap-bar-acc"><div class="ap-tabs" role="tablist" aria-label="Estado">${filtros.map(([v, t]) => `<button type="button" role="tab" aria-selected="${u.solFiltro === v}" data-act="sol-filtro" data-f="${v}">${t} <small>${cuenta(v)}</small></button>`).join('')}</div></div>
  <div class="ap-filtros">
    <label class="ap-buscar">${icono('buscar', 16)}<span class="sr-only">Buscar solicitudes</span><input type="search" data-inp="sol-busca" placeholder="Buscar por título, mensaje o cliente…" value="${esc(u.solBusca)}" /></label>
    <label class="sr-only" for="f-tipo">Tipo</label>
    <select id="f-tipo" class="input ap-sel" data-chg="sol-tipo"><option value="">Todos los tipos</option>${opciones(Object.entries(TIPOS_TICKET).map(([v, t]) => ({ v, t })), u.solTipo)}</select>
  </div>
  ${lista.length
    ? `<div class="ap-card"><ul class="ap-lista ap-lista-v">${lista.map((t) => { const q = quienTicket(t); return `<li><a href="#/solicitudes/${t.id}"><span class="ap-fila"><b>${esc(t.titulo || TIPOS_TICKET[t.tipo] || t.tipo)}</b>${t.tipo === 'incidencia' && t.estado !== 'cerrado' ? chip('Incidencia', 'abierto') : ''}${chipEstado(t.estado)}</span><span class="ap-prev">${esc(t.mensaje.slice(0, 130))}${t.mensaje.length > 130 ? '…' : ''}</span><small>${esc(q.nombre)} · ${esc(TIPOS_TICKET[t.tipo] ?? t.tipo)} · ${esc(hace(t.creado))}${t.respuesta ? ' · respondida' : ''}</small></a></li>`; }).join('')}</ul></div>`
    : vacio('bandeja', tickets.length ? 'Ninguna solicitud con esos filtros' : 'No hay solicitudes', tickets.length ? 'Cambia el filtro o la búsqueda.' : 'Cuando un cliente envíe una solicitud desde su área, aparecerá aquí.')}`;
  return { titulo: 'Solicitudes', html };
}
ACT['sol-busca'] = (el) => { S.ui.solBusca = (el as HTMLInputElement).value; puente.repintar(); };
ACT['sol-tipo'] = (el) => { S.ui.solTipo = (el as HTMLSelectElement).value; puente.repintar(); };

const RESPUESTAS_TIPO = [
  'Recibido, lo revisamos hoy mismo y te contamos.',
  'Hecho: ya está funcionando. Si ves cualquier cosa rara, dínoslo.',
  'Para avanzar necesitamos que nos cuentes un poco más. ¿Podemos hacer una llamada de 15 minutos?',
];

function solicitudDetalle(id: number): Vista {
  const t = E().tickets.find((x) => x.id === id);
  if (!t) return { titulo: 'Solicitud', html: `${volver('#/solicitudes', 'Solicitudes')}${vacio('bandeja', 'No encontramos esa solicitud', 'Puede que se haya eliminado.')}` };
  const q = quienTicket(t);
  const html = `${volver('#/solicitudes', 'Solicitudes')}
  <section class="ap-card ap-det">
    <header class="ap-det-h"><div><p class="ap-eyebrow">${esc(TIPOS_TICKET[t.tipo] ?? t.tipo)} · ${esc(fechaHora(t.creado))}</p><h2>${esc(t.titulo || TIPOS_TICKET[t.tipo] || t.tipo)}</h2>
      <p class="ap-sub">${q.c ? `<a class="ap-link" href="#/clientes/${q.c.id}">${esc(q.nombre)}</a>` : esc(q.nombre)}${q.p?.nombre ? ' · ' + esc(q.p.nombre) : ''}${q.p?.email ? ' · ' + esc(q.p.email) : ''}</p></div>${chipEstado(t.estado)}</header>
    <div class="ap-bub yo"><small>Mensaje del cliente</small><p>${esc(t.mensaje)}</p></div>
    <form data-form="ticket-responder" data-id="${t.id}" class="ap-form" novalidate>
      <div class="field"><label for="r-resp">Respuesta para el cliente <span class="muted">(la verá en su área)</span></label>
        <textarea class="input" id="r-resp" name="respuesta" rows="6" maxlength="3000">${esc(t.respuesta ?? '')}</textarea></div>
      <div class="ap-plantillas"><span>Respuestas rápidas:</span>${RESPUESTAS_TIPO.map((r, i) => `<button type="button" class="ap-pill" data-act="plantilla" data-i="${i}">${esc(r.slice(0, 34))}…</button>`).join('')}</div>
      <div class="ap-form-acc">
        <div class="field ap-inline"><label for="r-estado" class="sr-only">Estado</label><select class="input ap-sel" id="r-estado" name="estado">${opciones(ESTADOS_TICKET.map((e) => ({ v: e, t: mayus(e) })), t.estado)}</select></div>
        <button class="btn btn-primary btn-sm" type="submit">Guardar</button>
        <button class="btn btn-sm ap-btn-sec" type="submit" data-cerrar="1">Guardar y cerrar</button>
      </div>
    </form>
  </section>`;
  return { titulo: 'Solicitud', html };
}
ACT['plantilla'] = (el) => {
  const ta = document.querySelector<HTMLTextAreaElement>('#r-resp');
  if (!ta) return;
  const r = RESPUESTAS_TIPO[Number(el.dataset.i)];
  ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${r}` : r;
  ta.focus();
};
FORM['ticket-responder'] = async (f, ev) => {
  const id = Number(f.dataset.id);
  const cerrar = (ev.submitter as HTMLElement | null)?.dataset.cerrar === '1';
  const estado = cerrar ? 'cerrado' : (f.elements.namedItem('estado') as HTMLSelectElement).value;
  const respuesta = (f.elements.namedItem('respuesta') as HTMLTextAreaElement).value.trim() || null;
  const err = await op.ticketActualizar(id, { estado, respuesta });
  if (err) return aviso('No se ha podido guardar: ' + err, 'err');
  const t = E().tickets.find((x) => x.id === id);
  if (t) { t.estado = estado; t.respuesta = respuesta; t.actualizado = new Date().toISOString(); }
  aviso(cerrar ? 'Solicitud cerrada.' : 'Guardado. El cliente ya ve la respuesta.');
  if (cerrar) puente.ir('#/solicitudes'); else puente.repintar();
};

// ───────────────────────── CLIENTES ─────────────────────────
function clientes(args: string[]): Vista {
  if (args[0]) return clienteDetalle(Number(args[0]), args[1] || 'resumen');
  const { clientes: lista, autos, tickets } = E();
  const u = S.ui;
  const b = normaliza(u.cliBusca);
  const hm = new Map<number, number>();
  const mesAct = ultimosMeses(1)[0];
  E().metricas.filter((m) => mesDe(m.fecha) === mesAct).forEach((m) => hm.set(m.cliente_id, (hm.get(m.cliente_id) ?? 0) + m.horas_ahorradas));
  const f = lista.filter((c) => (!u.cliPlan || (u.cliPlan === '_ninguno' ? !c.plan : c.plan === u.cliPlan)) && (!b || normaliza(`${c.negocio} ${c.contacto ?? ''} ${c.email ?? ''}`).includes(b)));
  const html = `
  <div class="ap-filtros">
    <label class="ap-buscar">${icono('buscar', 16)}<span class="sr-only">Buscar clientes</span><input type="search" data-inp="cli-busca" placeholder="Buscar por negocio, contacto o email…" value="${esc(u.cliBusca)}" /></label>
    <label class="sr-only" for="f-plan">Plan</label>
    <select id="f-plan" class="input ap-sel" data-chg="cli-plan"><option value="">Todos los planes</option>${opciones([...PLANES.map((p) => ({ v: p.nombre, t: p.nombre })), { v: '_ninguno', t: 'Sin plan' }], u.cliPlan)}</select>
    ${boton('Exportar CSV', 'data-act="clientes-csv"', 'ap-btn-sec', 'descargar')}
  </div>
  ${f.length
    ? `<div class="ap-card ap-tabla-c"><div class="ap-tabla"><table><thead><tr><th>Cliente</th><th>Plan</th><th class="r">Horas (mes)</th><th class="r">Automat.</th><th class="r">Solicitudes</th><th>Alta</th></tr></thead><tbody>${f.map((c) => {
        const au = autos.filter((a) => a.cliente_id === c.id && a.activa).length;
        const ab = tickets.filter((t) => t.user_id === c.user_id && t.estado !== 'cerrado').length;
        return `<tr><td><a class="ap-fuerte" href="#/clientes/${c.id}">${esc(nombreCliente(c))}</a><small>${esc(c.contacto || '')}${c.contacto && c.email ? ' · ' : ''}${esc(c.email || '')}</small></td><td>${c.plan ? chip(c.plan, 'en-curso') : '<span class="muted">Sin plan</span>'}</td><td class="r">${num1(hm.get(c.id) ?? 0)}</td><td class="r">${au}</td><td class="r">${ab ? chip(String(ab), 'abierto') : '0'}</td><td>${esc(fecha(c.alta))}</td></tr>`;
      }).join('')}</tbody></table></div></div>`
    : vacio('usuarios', lista.length ? 'Ningún cliente con esos filtros' : 'Todavía no hay clientes', lista.length ? 'Cambia el filtro o la búsqueda.' : 'Cuando alguien cree su cuenta desde el área de cliente, aparecerá aquí.')}`;
  return { titulo: 'Clientes', html };
}
ACT['cli-busca'] = (el) => { S.ui.cliBusca = (el as HTMLInputElement).value; puente.repintar(); };
ACT['cli-plan'] = (el) => { S.ui.cliPlan = (el as HTMLSelectElement).value; puente.repintar(); };
ACT['clientes-csv'] = () => {
  descargarCsv(`clientes-${hoyISO()}.csv`, [
    ['Negocio', 'Contacto', 'Email', 'Plan', 'Coste hora', 'Alta'],
    ...E().clientes.map((c) => [c.negocio, c.contacto, c.email, c.plan, c.coste_hora, c.alta]),
  ]);
};

const TABS_CLIENTE = [['resumen', 'Resumen'], ['automatizaciones', 'Automatizaciones'], ['metricas', 'Métricas'], ['informes', 'Informes'], ['solicitudes', 'Solicitudes'], ['notas', 'Notas']];

function clienteDetalle(id: number, tab: string): Vista {
  const c = clientePorId(id);
  if (!c) return { titulo: 'Cliente', html: `${volver('#/clientes', 'Clientes')}${vacio('usuarios', 'No encontramos ese cliente', 'Puede que se haya eliminado.')}` };
  const p = c.user_id ? E().perfiles.get(c.user_id) : undefined;
  const cab = `${volver('#/clientes', 'Clientes')}
  <section class="ap-card ap-det ap-cli-h">
    <div><p class="ap-eyebrow">Cliente desde ${esc(fecha(c.alta))}</p><h2>${esc(nombreCliente(c))}</h2><p class="ap-sub">${esc(c.contacto || '')}${c.contacto && c.email ? ' · ' : ''}${esc(c.email || '')}${p?.telefono ? ' · ' + esc(p.telefono) : ''}</p></div>
    ${c.plan ? chip(c.plan, 'en-curso') : chip('Sin plan', '')}
  </section>
  <div class="ap-tabs ap-tabs-l" role="tablist" aria-label="Secciones del cliente">${TABS_CLIENTE.map(([v, t]) => `<a role="tab" aria-selected="${tab === v}" href="#/clientes/${c.id}/${v}">${t}</a>`).join('')}</div>`;
  let cuerpo = '';
  let montar: ((r: HTMLElement) => void) | undefined;
  if (tab === 'automatizaciones') cuerpo = cliAutos(c);
  else if (tab === 'metricas') cuerpo = cliMetricas(c);
  else if (tab === 'informes') cuerpo = cliInformes(c);
  else if (tab === 'solicitudes') cuerpo = cliSolicitudes(c);
  else if (tab === 'notas') { cuerpo = tarjeta('Notas internas', notasHtml('cliente', c.id), '<span class="ap-nota-i">Solo las ve el equipo</span>'); montar = (r) => cargarNotas(r, 'cliente', c.id); }
  else cuerpo = cliResumen(c);
  return { titulo: nombreCliente(c), html: cab + cuerpo, montar };
}

function cliResumen(c: Cliente): string {
  const meses = ultimosMeses(6);
  const m = E().metricas.filter((x) => x.cliente_id === c.id);
  const hm = new Map<string, number>();
  m.forEach((x) => hm.set(mesDe(x.fecha), (hm.get(mesDe(x.fecha)) ?? 0) + x.horas_ahorradas));
  const horasMes = hm.get(meses[5]) ?? 0;
  const activas = E().autos.filter((a) => a.cliente_id === c.id && a.activa).length;
  const abiertas = E().tickets.filter((t) => t.user_id === c.user_id && t.estado !== 'cerrado').length;
  const edit = esAdmin();
  return `<div class="ap-kpis">
    ${kpi('Horas este mes', num1(horasMes) + ' h', eur(horasMes * c.coste_hora), 'reloj')}
    ${kpi('Automatizaciones activas', String(activas), '', 'rayo')}
    ${kpi('Solicitudes abiertas', String(abiertas), '', 'bandeja')}
    ${kpi('Cuota mensual (est.)', c.plan ? eur(precioMensual(c)) : '—', c.plan ? `Plan ${c.plan}` : 'Sin plan', 'euro')}
  </div>
  <div class="ap-grid2">
    ${tarjeta('Plan y tarifa', `<form data-form="cliente-ficha" data-id="${c.id}" class="ap-form" novalidate>
      <div class="field"><label for="c-plan">Plan</label><select class="input" id="c-plan" name="plan" ${edit ? '' : 'disabled'}><option value="">Sin plan</option>${opciones(PLANES.map((p) => ({ v: p.nombre, t: p.nombre })), c.plan ?? '')}</select></div>
      <div class="field"><label for="c-coste">Coste por hora del cliente (€)</label><input class="input" id="c-coste" name="coste_hora" type="number" min="1" max="500" step="0.5" value="${esc(c.coste_hora)}" ${edit ? '' : 'disabled'} /></div>
      ${edit ? '<div class="ap-form-acc"><button class="btn btn-primary btn-sm" type="submit">Guardar</button></div>' : '<p class="ap-nota-i">Solo el administrador puede cambiar el plan y la tarifa.</p>'}
    </form>`)}
    ${tarjeta('Horas ahorradas por mes', barras(meses.map((x) => ({ etiqueta: NOMBRE_MES(x), valor: Math.round((hm.get(x) ?? 0) * 10) / 10 })), { unidad: ' h', titulo: 'Horas ahorradas por mes' }))}
  </div>`;
}
FORM['cliente-ficha'] = async (f) => {
  const id = Number(f.dataset.id);
  const plan = (f.elements.namedItem('plan') as HTMLSelectElement).value || null;
  const coste = Number((f.elements.namedItem('coste_hora') as HTMLInputElement).value);
  if (!(coste >= 1 && coste <= 500)) return aviso('El coste por hora debe estar entre 1 y 500 €.', 'err');
  const err = await op.clienteActualizar(id, { plan, coste_hora: coste });
  if (err) return aviso('No se ha podido guardar (solo el administrador puede).', 'err');
  const c = clientePorId(id); if (c) { c.plan = plan; c.coste_hora = coste; }
  aviso('Cliente actualizado.');
  puente.repintar();
};

function cliAutos(c: Cliente): string {
  const lista = E().autos.filter((a) => a.cliente_id === c.id);
  return tarjeta('Automatizaciones', `
    <form data-form="auto-nueva" data-id="${c.id}" class="ap-form ap-inline-f" novalidate>
      <label class="sr-only" for="a-nombre">Nombre de la automatización</label>
      <input class="input" id="a-nombre" name="nombre" maxlength="120" placeholder="Ej.: Chatbot de WhatsApp" required />
      <button class="btn btn-primary btn-sm" type="submit">${icono('mas', 16)}<span>Añadir</span></button>
    </form>
    ${lista.length ? `<ul class="ap-lista ap-edit">${lista.map((a) => `<li><span>${esc(a.nombre)}</span><span class="ap-fila-acc">${chip(a.activa ? 'Activa' : 'En pausa', a.activa ? 'cerrado' : 'abierto')}${boton(a.activa ? 'Pausar' : 'Activar', `data-act="auto-toggle" data-id="${a.id}"`, 'ap-btn-sec')}<button type="button" class="ap-x" data-act="auto-borrar" data-id="${a.id}" aria-label="Eliminar ${esc(a.nombre)}">${icono('papelera', 16)}</button></span></li>`).join('')}</ul>` : '<p class="ap-vacio">Este cliente aún no tiene automatizaciones.</p>'}`);
}
FORM['auto-nueva'] = async (f) => {
  const nombre = (f.elements.namedItem('nombre') as HTMLInputElement).value.trim();
  if (!nombre) return;
  const { fila, error } = await op.autoNueva(Number(f.dataset.id), nombre);
  if (error || !fila) return aviso('No se ha podido añadir.', 'err');
  E().autos.push(fila);
  aviso('Automatización añadida.');
  puente.repintar();
};
ACT['auto-toggle'] = async (el) => {
  const a = E().autos.find((x) => x.id === Number(el.dataset.id));
  if (!a) return;
  const err = await op.autoActiva(a.id, !a.activa);
  if (err) return aviso('No se ha podido cambiar.', 'err');
  a.activa = !a.activa;
  puente.repintar();
};
ACT['auto-borrar'] = async (el) => {
  const id = Number(el.dataset.id);
  if (!(await confirmar('¿Eliminar la automatización?', 'Dejará de verla el cliente. Sus métricas se conservan.', 'Eliminar', true))) return;
  const err = await op.autoBorrar(id);
  if (err) return aviso('No se ha podido eliminar.', 'err');
  E().autos = E().autos.filter((x) => x.id !== id);
  puente.repintar();
};

function cliMetricas(c: Cliente): string {
  const lista = E().metricas.filter((m) => m.cliente_id === c.id).slice(0, 40);
  const etiquetas = [...new Set(E().metricas.map((m) => m.etiqueta).filter(Boolean))] as string[];
  return tarjeta('Añadir métrica', `
    <form data-form="metrica-nueva" data-id="${c.id}" class="ap-form" novalidate>
      <div class="ap-row4">
        <div class="field"><label for="m-fecha">Fecha</label><input class="input" id="m-fecha" name="fecha" type="date" value="${hoyISO()}" max="${hoyISO()}" required /></div>
        <div class="field"><label for="m-et">Concepto</label><input class="input" id="m-et" name="etiqueta" list="m-lista" maxlength="120" placeholder="Citas agendadas por el chatbot" required /><datalist id="m-lista">${etiquetas.map((e) => `<option value="${esc(e)}">`).join('')}</datalist></div>
        <div class="field"><label for="m-val">Cantidad</label><input class="input" id="m-val" name="valor" type="number" min="0" step="1" value="1" required /></div>
        <div class="field"><label for="m-h">Horas ahorradas</label><input class="input" id="m-h" name="horas" type="number" min="0" max="9999" step="0.1" value="0" required /></div>
      </div>
      <div class="ap-form-acc"><button class="btn btn-primary btn-sm" type="submit">Guardar métrica</button></div>
    </form>`) +
  tarjeta('Últimos registros', lista.length
    ? `<div class="ap-tabla"><table><thead><tr><th>Fecha</th><th>Concepto</th><th class="r">Cantidad</th><th class="r">Horas</th><th></th></tr></thead><tbody>${lista.map((m) => `<tr><td>${esc(fecha(m.fecha))}</td><td>${esc(m.etiqueta || '—')}</td><td class="r">${num(m.valor)}</td><td class="r">${num1(m.horas_ahorradas)}</td><td class="r"><button type="button" class="ap-x" data-act="metrica-borrar" data-id="${m.id}" aria-label="Borrar registro">${icono('papelera', 16)}</button></td></tr>`).join('')}</tbody></table></div>`
    : '<p class="ap-vacio">Todavía no hay métricas de este cliente.</p>');
}
FORM['metrica-nueva'] = async (f) => {
  const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
  const valor = Number(v('valor')), h = Number(v('horas'));
  if (!v('etiqueta')) return aviso('Escribe el concepto de la métrica.', 'err');
  if (!(valor >= 0) || !(h >= 0 && h <= 9999)) return aviso('La cantidad y las horas deben ser números válidos (≥ 0).', 'err');
  const { fila, error } = await op.metricaNueva({ cliente_id: Number(f.dataset.id), fecha: v('fecha') || hoyISO(), etiqueta: v('etiqueta'), valor, horas_ahorradas: h });
  if (error || !fila) return aviso('No se ha podido guardar.', 'err');
  E().metricas.unshift(fila);
  E().metricas.sort((a, b) => b.fecha.localeCompare(a.fecha));
  aviso('Métrica guardada. El cliente ya la ve en su panel.');
  puente.repintar();
};
ACT['metrica-borrar'] = async (el) => {
  const id = Number(el.dataset.id);
  if (!(await confirmar('¿Borrar el registro?', 'Cambiarán las horas ahorradas que ve el cliente.', 'Borrar', true))) return;
  const err = await op.metricaBorrar(id);
  if (err) return aviso('No se ha podido borrar.', 'err');
  E().metricas = E().metricas.filter((m) => m.id !== id);
  puente.repintar();
};

function cliInformes(c: Cliente): string {
  const lista = E().informes.filter((i) => i.cliente_id === c.id);
  return tarjeta('Añadir informe', `
    <form data-form="informe-nuevo" data-id="${c.id}" class="ap-form" novalidate>
      <div class="ap-row2">
        <div class="field"><label for="i-tit">Título</label><input class="input" id="i-tit" name="titulo" maxlength="160" placeholder="Informe de reseñas · noviembre" required /></div>
        <div class="field"><label for="i-url">Enlace (https://…)</label><input class="input" id="i-url" name="url" type="url" maxlength="500" placeholder="https://…" required /></div>
      </div>
      <div class="ap-form-acc"><button class="btn btn-primary btn-sm" type="submit">Publicar informe</button></div>
    </form>`) +
  tarjeta('Informes del cliente', lista.length
    ? `<ul class="ap-lista ap-edit">${lista.map((i) => `<li><span><b>${esc(i.titulo)}</b><small>${esc(fecha(i.creado))}</small></span><span class="ap-fila-acc"><a class="btn btn-sm ap-btn-sec" href="${esc(urlSegura(i.url))}" target="_blank" rel="noopener">Abrir</a><button type="button" class="ap-x" data-act="informe-borrar" data-id="${i.id}" aria-label="Borrar ${esc(i.titulo)}">${icono('papelera', 16)}</button></span></li>`).join('')}</ul>`
    : '<p class="ap-vacio">Este cliente aún no tiene informes.</p>');
}
FORM['informe-nuevo'] = async (f) => {
  const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
  if (!v('titulo')) return aviso('Escribe un título.', 'err');
  if (!/^https?:\/\/\S+$/i.test(v('url'))) return aviso('El enlace debe empezar por http:// o https://', 'err');
  const { fila, error } = await op.informeNuevo({ cliente_id: Number(f.dataset.id), titulo: v('titulo'), url: v('url') });
  if (error || !fila) return aviso('No se ha podido publicar.', 'err');
  E().informes.unshift(fila);
  aviso('Informe publicado. El cliente ya puede abrirlo.');
  puente.repintar();
};
ACT['informe-borrar'] = async (el) => {
  const id = Number(el.dataset.id);
  if (!(await confirmar('¿Borrar el informe?', 'El cliente dejará de verlo.', 'Borrar', true))) return;
  const err = await op.informeBorrar(id);
  if (err) return aviso('No se ha podido borrar.', 'err');
  E().informes = E().informes.filter((i) => i.id !== id);
  puente.repintar();
};

function cliSolicitudes(c: Cliente): string {
  const lista = E().tickets.filter((t) => t.user_id === c.user_id);
  return tarjeta('Solicitudes del cliente', lista.length
    ? `<ul class="ap-lista ap-lista-v">${lista.map((t) => `<li><a href="#/solicitudes/${t.id}"><span class="ap-fila"><b>${esc(t.titulo || TIPOS_TICKET[t.tipo] || t.tipo)}</b>${chipEstado(t.estado)}</span><small>${esc(TIPOS_TICKET[t.tipo] ?? t.tipo)} · ${esc(hace(t.creado))}</small></a></li>`).join('')}</ul>`
    : '<p class="ap-vacio">Este cliente no ha enviado solicitudes.</p>');
}

// ───────────────────────── MÉTRICAS GLOBALES ─────────────────────────
function metricasGlobal(): Vista {
  const meses = ultimosMeses(6);
  const hm = horasPorMes();
  const mesAct = meses[5];
  const porCliente = new Map<number, { mes: number; seis: number }>();
  E().metricas.forEach((m) => {
    const x = porCliente.get(m.cliente_id) ?? { mes: 0, seis: 0 };
    x.seis += m.horas_ahorradas;
    if (mesDe(m.fecha) === mesAct) x.mes += m.horas_ahorradas;
    porCliente.set(m.cliente_id, x);
  });
  const filas = [...porCliente].map(([id, x]) => ({ c: clientePorId(id), ...x })).filter((x) => x.c).sort((a, b) => b.mes - a.mes || b.seis - a.seis);
  const total6 = [...hm.values()].reduce((a, b) => a + b, 0);
  const etiquetas = new Map<string, number>();
  E().metricas.filter((m) => mesDe(m.fecha) === mesAct && m.etiqueta).forEach((m) => etiquetas.set(m.etiqueta!, (etiquetas.get(m.etiqueta!) ?? 0) + m.valor));
  const html = `
  <div class="ap-kpis">
    ${kpi('Horas este mes', num1(hm.get(mesAct) ?? 0) + ' h', 'Todos los clientes', 'reloj')}
    ${kpi('Últimos 6 meses', num1(total6) + ' h', '', 'grafica')}
    ${kpi('Clientes con datos', String(porCliente.size), `de ${E().clientes.length}`, 'usuarios')}
    ${kpi('Automatizaciones activas', String(E().autos.filter((a) => a.activa).length), `de ${E().autos.length}`, 'rayo')}
  </div>
  <div class="ap-grid2">
    ${tarjeta('Horas ahorradas por mes', barras(meses.map((m) => ({ etiqueta: NOMBRE_MES(m), valor: Math.round((hm.get(m) ?? 0) * 10) / 10 })), { unidad: ' h', titulo: 'Horas ahorradas por mes' }))}
    ${tarjeta('Lo más activo este mes', barrasH([...etiquetas].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor).slice(0, 6), { vacio: 'Sin actividad este mes.' }))}
  </div>
  ${tarjeta('Por cliente', filas.length
    ? `<div class="ap-tabla"><table><thead><tr><th>Cliente</th><th class="r">Horas (mes)</th><th class="r">Horas (6 meses)</th><th class="r">Valor (mes)</th></tr></thead><tbody>${filas.map((x) => `<tr><td><a class="ap-fuerte" href="#/clientes/${x.c!.id}/metricas">${esc(nombreCliente(x.c!))}</a></td><td class="r">${num1(x.mes)}</td><td class="r">${num1(x.seis)}</td><td class="r">${eur(x.mes * x.c!.coste_hora)}</td></tr>`).join('')}</tbody></table></div>`
    : '<p class="ap-vacio">Todavía no hay métricas. Añádelas desde la ficha de cada cliente (pestaña Métricas).</p>')}`;
  return { titulo: 'Métricas', html };
}

// ───────────────────────── INGRESOS (solo admin) ─────────────────────────
function ingresos(): Vista {
  if (!esAdmin()) return { titulo: 'Ingresos', html: vacio('escudo', 'Solo para el administrador', 'Esta sección es solo para la cuenta de administración.') };
  const { clientes: lista } = E();
  const ahora = new Date();
  const total = lista.reduce((a, c) => a + precioMensual(c, ahora), 0);
  const filas = PLANES.map((p) => {
    const cs = lista.filter((c) => c.plan === p.nombre);
    return { p, n: cs.length, sub: cs.reduce((a, c) => a + precioMensual(c, ahora), 0) };
  });
  const sinPlan = lista.filter((c) => !c.plan).length;
  const html = `
  <div class="ap-kpis">
    ${kpi('Ingresos mensuales (est.)', eur(total), 'Cuotas de los clientes con plan', 'euro')}
    ${kpi('Previsión anual (est.)', eur(total * 12), 'Si todo sigue igual', 'grafica')}
    ${kpi('Clientes con plan', String(lista.length - sinPlan), `${sinPlan} sin plan`, 'usuarios')}
    ${kpi('Cuota media', lista.length - sinPlan ? eur(total / (lista.length - sinPlan)) : '—', 'Por cliente con plan', 'reloj')}
  </div>
  ${tarjeta('Por plan', `<div class="ap-tabla"><table><thead><tr><th>Plan</th><th class="r">Clientes</th><th class="r">Cuota mensual</th><th class="r">Subtotal</th></tr></thead><tbody>${filas.map((x) => `<tr><td>${esc(x.p.nombre)}</td><td class="r">${x.n}</td><td class="r">${x.p.mensualIntro ? `${eur(x.p.mensualIntro)} (${MESES_INTRO} primeros meses) → ${eur(x.p.mensual)}` : eur(x.p.mensual)}</td><td class="r"><b>${eur(x.sub)}</b></td></tr>`).join('')}</tbody></table></div>`)}
  <p class="ap-nota">Es una <b>estimación</b>: se calcula con el plan asignado a cada cliente y su fecha de alta (precio de introducción durante los ${MESES_INTRO} primeros meses). No sustituye a la facturación real ni incluye las puestas en marcha. Los precios salen de <code>src/data/precios.ts</code>.</p>`;
  return { titulo: 'Ingresos', html };
}

// ───────────────────────── EQUIPO ─────────────────────────
function equipo(): Vista {
  const html = `${tarjeta('Quién tiene acceso', '<div data-equipo><p class="ap-vacio">Cargando…</p></div>')}
  ${esAdmin() ? tarjeta('Añadir a alguien al equipo', `<p class="ap-sub">La persona debe registrarse y confirmar su correo. Después, en Supabase → SQL Editor, ejecuta (con su email en minúsculas):</p><pre class="ap-code">insert into public.staff (email, nombre, rol)
values ('nueva@tuagencia.tech', 'Nombre Apellido', 'equipo');</pre><p class="ap-nota-i">El rol «admin» da además acceso a Ingresos y a editar planes. Se decide por el email verificado, nunca por lo que escriba la persona al registrarse.</p>`) : ''}`;
  return {
    titulo: 'Equipo', html,
    montar: async (r) => {
      const cont = r.querySelector<HTMLElement>('[data-equipo]');
      if (!cont) return;
      const { filas, error } = await op.equipo();
      if (error) { cont.innerHTML = '<p class="ap-vacio">No se ha podido cargar la lista. Ejecuta la última versión de supabase/schema.sql en Supabase.</p>'; return; }
      cont.innerHTML = `<ul class="ap-lista ap-equipo">${filas.map((m) => `<li><span class="ap-avatar">${esc((m.nombre || m.email).charAt(0).toUpperCase())}</span><div><b>${esc(m.nombre)}</b><small>${esc(m.email)}</small></div>${chip(m.rol === 'admin' ? 'Administrador' : 'Equipo', m.rol === 'admin' ? 'urgente' : 'en-curso')}<small class="ap-ultimo">${m.confirmado ? (m.ultimo_acceso ? 'Último acceso ' + esc(hace(m.ultimo_acceso)) : 'Aún no ha entrado') : 'Sin confirmar el correo'}</small></li>`).join('')}</ul>`;
    },
  };
}

// ───────────────────────── Router del equipo ─────────────────────────
export const rutasEquipo = (admin: boolean) => {
  const { tickets, leads } = E();
  const base = [
    { id: 'resumen', etiqueta: 'Resumen', icono: 'inicio', seccion: 'Gestión' },
    { id: 'contactos', etiqueta: 'Contactos', icono: 'contactos', seccion: 'Gestión', badge: leads.filter((l) => l.estado === 'nuevo').length },
    { id: 'solicitudes', etiqueta: 'Solicitudes', icono: 'bandeja', seccion: 'Gestión', badge: tickets.filter((t) => t.estado !== 'cerrado').length },
    { id: 'clientes', etiqueta: 'Clientes', icono: 'usuarios', seccion: 'Gestión' },
    { id: 'metricas', etiqueta: 'Métricas', icono: 'grafica', seccion: 'Análisis' },
  ];
  if (admin) base.push({ id: 'ingresos', etiqueta: 'Ingresos', icono: 'euro', seccion: 'Análisis' } as never);
  base.push({ id: 'equipo', etiqueta: 'Equipo', icono: 'escudo', seccion: 'Cuenta' } as never, { id: 'cuenta', etiqueta: 'Mi cuenta', icono: 'usuario', seccion: 'Cuenta' } as never);
  return base;
};

export function vistaEquipo(id: string, args: string[]): Vista | null {
  switch (id) {
    case 'resumen': return resumen();
    case 'contactos': return contactos(args);
    case 'solicitudes': return solicitudes(args);
    case 'clientes': return clientes(args);
    case 'metricas': return metricasGlobal();
    case 'ingresos': return ingresos();
    case 'equipo': return equipo();
    case 'cuenta': return cuenta();
    default: return null;
  }
}
