// Vistas del panel del CLIENTE (y la vista "Mi cuenta", común a todos los roles).
import { S, op } from './datos';
import type { DatosCliente } from './datos';
import { ACT, FORM, TIPOS_TICKET, boton, chip, chipEstado, kpi, puente, tarjeta, vacio, volver, type Vista } from './nucleo';
import { barras } from './charts';
import { NOMBRE_MES, aviso, confirmar, eur, esc, fecha, fechaHora, hace, icono, inicial, mayus, mesDe, num, num1, ultimosMeses, urlSegura } from './util';
import { limpiarPerfil } from '../perfil';
import { FAQ, SITE } from '../../data/site';
import { PLANES } from '../../data/precios';

const MIN_PASS = 10;
const d = (): DatosCliente => S.cli!;

const horasPorMes = (m: DatosCliente['metricas']) => {
  const r = new Map<string, number>();
  m.forEach((x) => r.set(mesDe(x.fecha), (r.get(mesDe(x.fecha)) ?? 0) + x.horas_ahorradas));
  return r;
};

/** Texto de la barra superior de cada plan, para mostrar qué incluye */
const planInfo = (plan: string | null) => PLANES.find((p) => p.nombre === plan);

// ───────────────────────── RESUMEN ─────────────────────────
function resumen(): Vista {
  const { perfil, cliente, autos, metricas, tickets } = d();
  const meses = ultimosMeses(6);
  const hm = horasPorMes(metricas);
  const act = meses[5], prev = meses[4];
  const horas = hm.get(act) ?? 0, horasPrev = hm.get(prev) ?? 0;
  const coste = cliente?.coste_hora ?? 15;
  const nombre = (perfil?.nombre || S.ctx!.email.split('@')[0]).split(' ')[0];
  const activas = autos.filter((a) => a.activa).length;
  const abiertas = tickets.filter((t) => t.estado !== 'cerrado');
  const delta = horasPrev > 0 ? Math.round(((horas - horasPrev) / horasPrev) * 100) : null;
  const deltaTxt = delta === null ? (horas > 0 ? 'Primer mes con datos' : 'Sin datos todavía') : `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)} % vs. mes anterior`;

  const etiquetas = new Map<string, number>();
  metricas.filter((m) => mesDe(m.fecha) === act && m.etiqueta).forEach((m) => etiquetas.set(m.etiqueta!, (etiquetas.get(m.etiqueta!) ?? 0) + m.valor));
  const actividad = [...etiquetas].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const respondidas = tickets.filter((t) => t.respuesta).slice(0, 3);
  const pasos = [
    { ok: !!(perfil?.nombre && perfil?.negocio && perfil?.telefono), t: 'Completa tus datos', s: 'Así te rellenamos los formularios de la web.', href: '#/cuenta', txt: 'Ir a Mi cuenta' },
    { ok: tickets.length > 0, t: 'Envía tu primera solicitud', s: 'Cuéntanos qué te quita más tiempo.', href: '#/solicitudes/nueva', txt: 'Nueva solicitud' },
    { ok: false, t: 'Reserva una llamada con el equipo', s: '30 minutos por Google Meet, sin coste.', href: '/reservar', txt: 'Reservar llamada' },
  ];
  const mostrarPasos = !cliente?.plan || tickets.length === 0;
  const plan = planInfo(cliente?.plan ?? null);

  const html = `
  <section class="ap-hero">
    <div>
      <p class="ap-eyebrow">${esc(perfil?.negocio || 'Tu negocio')}</p>
      <h2>Hola, ${esc(nombre)} 👋</h2>
      <p class="ap-sub">${cliente?.plan ? `Tienes el plan <b>${esc(cliente.plan)}</b>. ${plan ? esc(plan.para) : ''}` : 'Todavía no tienes un plan contratado. Cuéntanos qué necesitas y te lo preparamos.'}</p>
    </div>
    <div class="ap-hero-acc">
      <a class="btn btn-primary btn-sm" href="#/solicitudes/nueva">${icono('mas', 16)}<span>Nueva solicitud</span></a>
      <a class="btn btn-sm ap-btn-sec" href="${esc(SITE.agenda)}">${icono('calendario', 16)}<span>Reservar llamada</span></a>
    </div>
  </section>

  <div class="ap-kpis">
    ${kpi('Horas ahorradas este mes', num1(horas) + ' h', deltaTxt, 'reloj')}
    ${kpi('Valor estimado', eur(horas * coste), `a ${eur(coste)}/hora de tu equipo`, 'euro')}
    ${kpi('Automatizaciones activas', `${activas}${autos.length ? ` de ${autos.length}` : ''}`, autos.length ? 'Funcionando ahora' : 'Aún no hay ninguna', 'rayo')}
    ${kpi('Solicitudes abiertas', String(abiertas.length), abiertas.length ? 'Te respondemos lo antes posible' : 'Todo al día', 'bandeja')}
  </div>

  <div class="ap-grid2">
    ${tarjeta('Horas ahorradas por mes', metricas.length ? barras(meses.map((m) => ({ etiqueta: NOMBRE_MES(m), valor: Math.round((hm.get(m) ?? 0) * 10) / 10 })), { unidad: ' h', titulo: 'Horas ahorradas en los últimos 6 meses' }) : `<p class="ap-vacio">Aquí verás cuánto tiempo te ahorran tus automatizaciones en cuanto empiecen a funcionar.</p>`, '<a class="ap-link" href="#/resultados">Ver resultados</a>')}
    ${tarjeta('Actividad del mes', actividad.length ? `<ul class="ap-lista">${actividad.map(([e, v]) => `<li><span>${esc(e)}</span><b>${num(v)}</b></li>`).join('')}</ul>` : '<p class="ap-vacio">Sin actividad este mes todavía.</p>')}
  </div>

  <div class="ap-grid2">
    ${mostrarPasos
      ? tarjeta('Primeros pasos', `<ol class="ap-pasos">${pasos.map((p) => `<li class="${p.ok ? 'hecho' : ''}"><span class="ap-paso-n">${p.ok ? icono('check', 14) : ''}</span><div><b>${esc(p.t)}</b><small>${esc(p.s)}</small></div>${p.ok ? '' : `<a class="ap-link" href="${esc(p.href)}">${esc(p.txt)}</a>`}</li>`).join('')}</ol>`)
      : tarjeta('Tus automatizaciones', autos.length ? `<ul class="ap-lista">${autos.slice(0, 5).map((a) => `<li><span>${esc(a.nombre)}</span>${chip(a.activa ? 'Activa' : 'En pausa', a.activa ? 'cerrado' : 'abierto')}</li>`).join('')}</ul>` : '<p class="ap-vacio">Aún no tienes automatizaciones.</p>', '<a class="ap-link" href="#/automatizaciones">Ver todas</a>')}
    ${tarjeta('Últimas respuestas del equipo', respondidas.length
      ? `<ul class="ap-lista ap-lista-v">${respondidas.map((t) => `<li><a href="#/solicitudes/${t.id}"><b>${esc(t.titulo || TIPOS_TICKET[t.tipo] || t.tipo)}</b><span>${esc((t.respuesta ?? '').slice(0, 140))}${(t.respuesta ?? '').length > 140 ? '…' : ''}</span><small>${esc(hace(t.actualizado || t.creado))}</small></a></li>`).join('')}</ul>`
      : '<p class="ap-vacio">Cuando respondamos a una solicitud, la verás aquí.</p>')}
  </div>`;
  return { titulo: 'Resumen', html };
}

// ───────────────────────── AUTOMATIZACIONES ─────────────────────────
function automatizaciones(): Vista {
  const { autos } = d();
  const html = autos.length
    ? `<div class="ap-cards">${autos.map((a) => `<article class="ap-card ap-auto"><div class="ap-auto-ic ${a.activa ? 'on' : ''}">${icono('rayo', 20)}</div><div><h3>${esc(a.nombre)}</h3><small>Desde ${esc(fecha(a.creado))}</small></div>${chip(a.activa ? 'Activa' : 'En pausa', a.activa ? 'cerrado' : 'abierto')}</article>`).join('')}</div>
       <p class="ap-nota">¿Quieres cambiar algo o añadir otra automatización? <a class="ap-link" href="#/solicitudes/nueva">Envía una solicitud</a>.</p>`
    : vacio('rayo', 'Todavía no tienes automatizaciones', 'Cuando pongamos en marcha la primera, aparecerá aquí con su estado. Cuéntanos qué tarea te quita más tiempo.', '<a class="btn btn-primary btn-sm" href="#/solicitudes/nueva">Pedir una automatización</a>');
  return { titulo: 'Automatizaciones', html };
}

// ───────────────────────── RESULTADOS ─────────────────────────
function resultados(): Vista {
  const { metricas, cliente } = d();
  const meses = ultimosMeses(6);
  if (!meses.includes(S.ui.resMes)) S.ui.resMes = meses[5];
  const hm = horasPorMes(metricas);
  const coste = cliente?.coste_hora ?? 15;
  const sel = S.ui.resMes;
  const delMes = metricas.filter((m) => mesDe(m.fecha) === sel);
  const horas = hm.get(sel) ?? 0;
  const porEtiqueta = new Map<string, { v: number; h: number }>();
  delMes.forEach((m) => {
    const k = m.etiqueta || 'Sin etiqueta';
    const x = porEtiqueta.get(k) ?? { v: 0, h: 0 };
    x.v += m.valor; x.h += m.horas_ahorradas;
    porEtiqueta.set(k, x);
  });
  const filas = [...porEtiqueta].sort((a, b) => b[1].h - a[1].h || b[1].v - a[1].v);
  const total6 = [...hm.values()].reduce((a, b) => a + b, 0);

  const html = `
  <div class="ap-tabs" role="tablist" aria-label="Mes">${meses.map((m) => `<button type="button" role="tab" aria-selected="${m === sel}" data-act="mes" data-mes="${m}">${esc(NOMBRE_MES(m))}</button>`).join('')}</div>
  <div class="ap-kpis">
    ${kpi('Horas ahorradas', num1(horas) + ' h', mayus(new Date(`${sel}-01T12:00:00Z`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })), 'reloj')}
    ${kpi('Valor estimado', eur(horas * coste), `a ${eur(coste)}/hora`, 'euro')}
    ${kpi('Registros del mes', String(delMes.length), 'Acciones contabilizadas', 'grafica')}
    ${kpi('Últimos 6 meses', num1(total6) + ' h', eur(total6 * coste) + ' de tiempo', 'rayo')}
  </div>
  <div class="ap-grid2">
    ${tarjeta('Evolución mensual', barras(meses.map((m) => ({ etiqueta: NOMBRE_MES(m), valor: Math.round((hm.get(m) ?? 0) * 10) / 10 })), { unidad: ' h', titulo: 'Horas ahorradas por mes' }))}
    ${tarjeta('Detalle del mes', filas.length
      ? `<div class="ap-tabla"><table><thead><tr><th>Concepto</th><th class="r">Cantidad</th><th class="r">Horas</th></tr></thead><tbody>${filas.map(([e, x]) => `<tr><td>${esc(e)}</td><td class="r">${num(x.v)}</td><td class="r">${num1(x.h)}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="ap-vacio">No hay datos de este mes.</p>')}
  </div>
  <p class="ap-nota">El valor estimado multiplica las horas ahorradas por el coste por hora de tu equipo (${esc(eur(coste))}). Si no se ajusta a tu caso, dínoslo y lo cambiamos.</p>`;
  return { titulo: 'Resultados', html };
}

ACT['mes'] = (el) => { S.ui.resMes = el.dataset.mes!; puente.repintar(); };

// ───────────────────────── INFORMES ─────────────────────────
function informes(): Vista {
  const { informes: lista } = d();
  const html = lista.length
    ? `<div class="ap-card"><ul class="ap-lista ap-docs">${lista.map((i) => `<li><span class="ap-doc-ic">${icono('archivo', 20)}</span><div><b>${esc(i.titulo)}</b><small>${esc(fecha(i.creado))}</small></div><a class="btn btn-sm ap-btn-sec" href="${esc(urlSegura(i.url))}" target="_blank" rel="noopener">${icono('descargar', 16)}<span>Abrir</span></a></li>`).join('')}</ul></div>`
    : vacio('archivo', 'Todavía no hay informes', 'Aquí aparecerán tus informes (por ejemplo, el de reputación o el de horas ahorradas) en cuanto los preparemos.');
  return { titulo: 'Informes', html };
}

// ───────────────────────── SOLICITUDES ─────────────────────────
function solicitudes(args: string[]): Vista {
  if (args[0] === 'nueva') return solicitudNueva();
  if (args[0]) return solicitudDetalle(Number(args[0]));
  const { tickets } = d();
  const filtros = [['todas', 'Todas'], ['abierto', 'Abiertas'], ['en curso', 'En curso'], ['cerrado', 'Cerradas']];
  const cuenta = (f: string) => (f === 'todas' ? tickets.length : tickets.filter((t) => t.estado === f).length);
  const lista = tickets.filter((t) => S.ui.solFiltro === 'todas' || t.estado === S.ui.solFiltro);
  const html = `
  <div class="ap-bar-acc">
    <div class="ap-tabs" role="tablist" aria-label="Filtrar solicitudes">${filtros.map(([v, t]) => `<button type="button" role="tab" aria-selected="${S.ui.solFiltro === v}" data-act="sol-filtro" data-f="${v}">${t} <small>${cuenta(v)}</small></button>`).join('')}</div>
    <a class="btn btn-primary btn-sm" href="#/solicitudes/nueva">${icono('mas', 16)}<span>Nueva solicitud</span></a>
  </div>
  ${lista.length
    ? `<div class="ap-card"><ul class="ap-lista ap-lista-v">${lista.map((t) => `<li><a href="#/solicitudes/${t.id}"><span class="ap-fila"><b>${esc(t.titulo || TIPOS_TICKET[t.tipo] || t.tipo)}</b>${chipEstado(t.estado)}</span><span class="ap-prev">${esc(t.mensaje.slice(0, 120))}${t.mensaje.length > 120 ? '…' : ''}</span><small>${esc(TIPOS_TICKET[t.tipo] ?? t.tipo)} · ${esc(fechaHora(t.creado))}${t.respuesta ? ' · <b class="ap-resp-tag">Con respuesta</b>' : ''}</small></a></li>`).join('')}</ul></div>`
    : vacio('bandeja', tickets.length ? 'No hay solicitudes en este filtro' : 'Aún no has enviado ninguna solicitud', tickets.length ? 'Prueba con otro filtro.' : 'Pídenos una automatización nueva, un cambio o avísanos si algo no funciona.', tickets.length ? '' : '<a class="btn btn-primary btn-sm" href="#/solicitudes/nueva">Enviar mi primera solicitud</a>')}`;
  return { titulo: 'Solicitudes', html };
}
ACT['sol-filtro'] = (el) => { S.ui.solFiltro = el.dataset.f!; puente.repintar(); };

function solicitudNueva(): Vista {
  const html = `${volver('#/solicitudes', 'Solicitudes')}
  <section class="ap-card ap-form-card">
    <h2>Nueva solicitud</h2>
    <p class="ap-sub">Cuéntanos qué necesitas. Te respondemos aquí y por email lo antes posible.</p>
    <form data-form="ticket-nuevo" class="ap-form" novalidate>
      <div class="field"><label for="t-tipo">¿Qué necesitas?</label>
        <select class="input" id="t-tipo" name="tipo">${Object.entries(TIPOS_TICKET).map(([v, t]) => `<option value="${esc(v)}">${esc(t === 'Nueva automatización' ? 'Una automatización nueva' : t === 'Cambio' ? 'Cambiar algo de lo que ya tengo' : t === 'Incidencia' ? 'Algo no funciona' : 'Otra cosa')}</option>`).join('')}</select></div>
      <div class="field"><label for="t-titulo">Título</label><input class="input" id="t-titulo" name="titulo" maxlength="140" placeholder="Ej.: Recordatorios por WhatsApp" required /></div>
      <div class="field"><label for="t-msg">Cuéntanoslo</label><textarea class="input" id="t-msg" name="mensaje" rows="6" maxlength="3000" required></textarea></div>
      <div class="ap-form-acc"><button class="btn btn-primary" type="submit">Enviar solicitud</button><a class="btn ap-btn-sec" href="#/solicitudes">Cancelar</a></div>
      <p class="ap-msg" data-msg role="status" aria-live="polite"></p>
    </form>
  </section>`;
  return { titulo: 'Nueva solicitud', html };
}

FORM['ticket-nuevo'] = async (f) => {
  const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
  const msg = f.querySelector<HTMLElement>('[data-msg]')!;
  if (!v('titulo') || !v('mensaje')) { msg.textContent = 'Rellena el título y cuéntanos qué necesitas.'; msg.className = 'ap-msg err'; return; }
  const btn = f.querySelector<HTMLButtonElement>('button[type=submit]')!;
  btn.disabled = true;
  const err = await op.ticketNuevo(S.ctx!.user.id, { tipo: v('tipo'), titulo: v('titulo'), mensaje: v('mensaje') });
  btn.disabled = false;
  if (err) { msg.textContent = 'No se ha podido enviar. Inténtalo de nuevo.'; msg.className = 'ap-msg err'; return; }
  aviso('Solicitud enviada. Te respondemos lo antes posible.');
  await puente.recargar();
  puente.ir('#/solicitudes');
};

function solicitudDetalle(id: number): Vista {
  const t = d().tickets.find((x) => x.id === id);
  if (!t) return { titulo: 'Solicitud', html: `${volver('#/solicitudes', 'Solicitudes')}${vacio('bandeja', 'No encontramos esa solicitud', 'Puede que se haya eliminado.')}` };
  const pasos = ['abierto', 'en curso', 'cerrado'];
  const idx = pasos.indexOf(t.estado);
  const html = `${volver('#/solicitudes', 'Solicitudes')}
  <section class="ap-card ap-det">
    <header class="ap-det-h"><div><p class="ap-eyebrow">${esc(TIPOS_TICKET[t.tipo] ?? t.tipo)}</p><h2>${esc(t.titulo || TIPOS_TICKET[t.tipo] || t.tipo)}</h2></div>${chipEstado(t.estado)}</header>
    <ol class="ap-progreso" aria-label="Estado">${pasos.map((p, i) => `<li class="${i <= idx ? 'ok' : ''}"><i></i><span>${esc(mayus(p))}</span></li>`).join('')}</ol>
    <div class="ap-msgs">
      <div class="ap-bub yo"><small>Tú · ${esc(fechaHora(t.creado))}</small><p>${esc(t.mensaje)}</p></div>
      ${t.respuesta ? `<div class="ap-bub eq"><small>Equipo TuAgencia · ${esc(fechaHora(t.actualizado || t.creado))}</small><p>${esc(t.respuesta)}</p></div>` : '<p class="ap-vacio">Todavía no hemos respondido. Te avisaremos por email y lo verás aquí.</p>'}
    </div>
  </section>`;
  return { titulo: 'Solicitud', html };
}

// ───────────────────────── AYUDA ─────────────────────────
function ayuda(): Vista {
  const html = `
  <div class="ap-cards ap-cards3">
    <a class="ap-card ap-contacto" href="${esc(SITE.agenda)}">${icono('calendario', 24)}<h3>Reservar una llamada</h3><p>30 minutos por Google Meet con el equipo.</p></a>
    ${SITE.whatsapp ? `<a class="ap-card ap-contacto" href="https://wa.me/${esc(SITE.whatsapp)}" target="_blank" rel="noopener">${icono('chat', 24)}<h3>WhatsApp</h3><p>${esc(SITE.whatsappVisible)} · Respuesta rápida en horario laboral.</p></a>` : ''}
    <a class="ap-card ap-contacto" href="mailto:${esc(SITE.email)}">${icono('contactos', 24)}<h3>Email</h3><p>${esc(SITE.email)}</p></a>
  </div>
  ${tarjeta('Preguntas frecuentes', `<div class="ap-faq">${FAQ.map((f) => `<details><summary>${esc(f.p)}</summary><p>${esc(f.r)}</p></details>`).join('')}</div>`)}
  ${tarjeta('¿Algo no funciona?', `<p class="ap-sub">Si una automatización falla o algo no se comporta como esperas, envíanos una solicitud de tipo <b>“Algo no funciona”</b> y lo revisamos con prioridad.</p><a class="btn btn-primary btn-sm" href="#/solicitudes/nueva">Avisar de un problema</a>`)}`;
  return { titulo: 'Ayuda', html };
}

// ───────────────────────── MI CUENTA (todos los roles) ─────────────────────────
export function cuenta(): Vista {
  const ctx = S.ctx!;
  const esEquipo = ctx.rol !== 'cliente';
  const p = S.cli?.perfil ?? (S.eq ? S.eq.perfiles.get(ctx.user.id) ?? null : null);
  const rolTxt = ctx.rol === 'admin' ? 'Administrador' : ctx.rol === 'equipo' ? 'Equipo' : 'Cliente';
  const html = `
  <section class="ap-card ap-perfil-h">
    <span class="ap-avatar lg">${esc(inicial(p?.nombre || ctx.nombre || ctx.email))}</span>
    <div><h2>${esc(p?.nombre || ctx.nombre || ctx.email.split('@')[0])}</h2><p class="ap-sub">${esc(ctx.email)}</p></div>
    ${chip(rolTxt, esEquipo ? 'en-curso' : '')}
  </section>
  <div class="ap-grid2">
    ${tarjeta('Mis datos', `<form data-form="perfil" class="ap-form" novalidate>
      <p class="ap-sub">Con estos datos te rellenamos los formularios de la web.</p>
      <div class="field"><label for="p-nombre">Nombre</label><input class="input" id="p-nombre" name="nombre" autocomplete="name" maxlength="120" value="${esc(p?.nombre ?? '')}" /></div>
      <div class="field"><label for="p-negocio">Negocio</label><input class="input" id="p-negocio" name="negocio" autocomplete="organization" maxlength="160" value="${esc(p?.negocio ?? '')}" /></div>
      <div class="field"><label for="p-tel">Teléfono</label><input class="input" id="p-tel" name="telefono" type="tel" autocomplete="tel" maxlength="40" value="${esc(p?.telefono ?? '')}" /></div>
      <div class="field"><label for="p-email">Email</label><input class="input" id="p-email" type="email" value="${esc(ctx.email)}" disabled /></div>
      <div class="ap-form-acc"><button class="btn btn-primary btn-sm" type="submit">Guardar cambios</button></div>
      <p class="ap-msg" data-msg role="status" aria-live="polite"></p></form>`)}
    ${tarjeta('Seguridad', `<form data-form="contrasena" class="ap-form" novalidate>
      <div class="field"><label for="c-nueva">Nueva contraseña <span class="muted">(mínimo ${MIN_PASS} caracteres)</span></label><input class="input" id="c-nueva" name="nueva" type="password" autocomplete="new-password" minlength="${MIN_PASS}" /></div>
      <div class="field"><label for="c-rep">Repite la contraseña</label><input class="input" id="c-rep" name="repite" type="password" autocomplete="new-password" /></div>
      <div class="ap-form-acc"><button class="btn btn-dark btn-sm" type="submit">Cambiar contraseña</button></div>
      <p class="ap-msg" data-msg role="status" aria-live="polite"></p></form>`)}
  </div>
  ${tarjeta('Sesión', `<p class="ap-sub">Estás conectado como <b>${esc(ctx.email)}</b>.</p>
    <div class="ap-fila-acc">
      ${boton('Cerrar sesión', 'data-act="salir"', 'btn-dark', 'salir')}
      ${boton('Cambiar de cuenta', 'data-act="cambiar-cuenta"', 'ap-btn-sec', 'cambiar')}
      ${boton('Cerrar sesión en todos mis dispositivos', 'data-act="salir-todo"', 'ap-btn-sec', 'escudo')}
    </div>`)}
  ${esEquipo ? '' : tarjeta('Privacidad y datos', `<p class="ap-sub">Tus datos se guardan en la Unión Europea y solo los usamos para prestarte el servicio. Puedes leer la <a class="ap-link" href="/privacidad" target="_blank" rel="noopener">política de privacidad</a> o pedirnos que los borremos.</p>
    <div class="ap-fila-acc">${boton('Pedir que borremos mis datos', 'data-act="borrado"', 'ap-btn-peligro', 'papelera')}</div>`)}`;
  return { titulo: 'Mi cuenta', html };
}

FORM['perfil'] = async (f) => {
  const v = (n: string) => (f.elements.namedItem(n) as HTMLInputElement).value.trim();
  const msg = f.querySelector<HTMLElement>('[data-msg]')!;
  const err = await op.perfilGuardar(S.ctx!.user.id, { nombre: v('nombre') || null, negocio: v('negocio') || null, telefono: v('telefono') || null });
  if (err) { msg.textContent = 'No se han podido guardar los datos.'; msg.className = 'ap-msg err'; return; }
  const p = S.cli?.perfil ?? S.eq?.perfiles.get(S.ctx!.user.id);
  if (p) { p.nombre = v('nombre') || null; p.negocio = v('negocio') || null; p.telefono = v('telefono') || null; }
  S.ctx!.nombre = v('nombre') || S.ctx!.nombre;
  limpiarPerfil();
  aviso('Datos guardados.');
  puente.repintar();
};

FORM['contrasena'] = async (f) => {
  const nueva = (f.elements.namedItem('nueva') as HTMLInputElement).value;
  const rep = (f.elements.namedItem('repite') as HTMLInputElement).value;
  const msg = f.querySelector<HTMLElement>('[data-msg]')!;
  const fallo = (t: string) => { msg.textContent = t; msg.className = 'ap-msg err'; };
  if (nueva.length < MIN_PASS) return fallo(`La contraseña debe tener al menos ${MIN_PASS} caracteres.`);
  if (nueva !== rep) return fallo('Las dos contraseñas no coinciden.');
  const err = await op.contrasena(nueva);
  if (err) return fallo('No se ha podido cambiar la contraseña. Cierra sesión, vuelve a entrar e inténtalo de nuevo.');
  f.reset();
  msg.textContent = 'Contraseña cambiada.'; msg.className = 'ap-msg ok';
  aviso('Contraseña cambiada.');
};

ACT['borrado'] = async () => {
  if (!(await confirmar('¿Borrar tus datos?', 'Enviaremos una solicitud al equipo para eliminar tu cuenta y tus datos. Te contestaremos para confirmarlo.', 'Enviar solicitud', true))) return;
  const err = await op.ticketNuevo(S.ctx!.user.id, { tipo: 'otro', titulo: 'Solicitud de borrado de datos (RGPD)', mensaje: 'Quiero que eliminéis mi cuenta y todos mis datos personales.' });
  if (err) return aviso('No se ha podido enviar la solicitud.', 'err');
  aviso('Solicitud enviada. Te contestaremos para confirmar el borrado.');
  await puente.recargar();
  puente.ir('#/solicitudes');
};

// ───────────────────────── Router del cliente ─────────────────────────
export const RUTAS_CLIENTE = [
  { id: 'resumen', etiqueta: 'Resumen', icono: 'inicio', seccion: 'Mi espacio' },
  { id: 'automatizaciones', etiqueta: 'Automatizaciones', icono: 'rayo', seccion: 'Mi espacio' },
  { id: 'resultados', etiqueta: 'Resultados', icono: 'grafica', seccion: 'Mi espacio' },
  { id: 'informes', etiqueta: 'Informes', icono: 'archivo', seccion: 'Mi espacio' },
  { id: 'solicitudes', etiqueta: 'Solicitudes', icono: 'bandeja', seccion: 'Hablemos' },
  { id: 'ayuda', etiqueta: 'Ayuda', icono: 'ayuda', seccion: 'Hablemos' },
  { id: 'cuenta', etiqueta: 'Mi cuenta', icono: 'usuario', seccion: 'Cuenta' },
];

export function vistaCliente(id: string, args: string[]): Vista | null {
  switch (id) {
    case 'resumen': return resumen();
    case 'automatizaciones': return automatizaciones();
    case 'resultados': return resultados();
    case 'informes': return informes();
    case 'solicitudes': return solicitudes(args);
    case 'ayuda': return ayuda();
    case 'cuenta': return cuenta();
    default: return null;
  }
}
