// POST /api/reservar → crea la llamada en tu Google Calendar con enlace de Google Meet
// y manda la invitación al cliente. Todo se valida aquí, nunca se confía en el navegador.
import { AGENDA } from '../../src/data/agenda.ts';
import { fechaLocal, generarHuecos, zonedAUtc, sumarDias } from '../_lib/agenda.ts';
import { AgendaNoConfigurada, crearEvento, ocupado, turnstileValido, type Env } from '../_lib/google.ts';

const json = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
// Quita saltos de línea y caracteres de control; recorta el largo.
const limpio = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '');
const unaLinea = (v: unknown, max: number) => limpio(v, max).replace(/[\r\n]+/g, ' ');

export const onRequestPost = async ({ request, env, now = Date.now() }: { request: Request; env: Env; now?: number }) => {
  // Solo desde nuestra propia web y en JSON (así un formulario de otro sitio no puede reservar por el visitante)
  const origen = request.headers.get('origin');
  if (origen && origen !== new URL(request.url).origin) return json({ error: 'origen_no_permitido' }, 403);
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return json({ error: 'formato_incorrecto' }, 415);
  if (Number(request.headers.get('content-length') ?? 0) > 10_000) return json({ error: 'demasiado_grande' }, 413);

  let b: Record<string, unknown>;
  try { b = (await request.json()) as Record<string, unknown>; } catch { return json({ error: 'json_invalido' }, 400); }

  if (b.web) return json({ ok: true }); // trampa anti-bots: fingimos éxito y no hacemos nada

  const nombre = unaLinea(b.nombre, 80);
  const email = unaLinea(b.email, 120).toLowerCase();
  const telefono = unaLinea(b.telefono, 30);
  const mensaje = limpio(b.mensaje, 500);
  const inicio = typeof b.inicio === 'string' ? Date.parse(b.inicio) : NaN;

  if (nombre.length < 2) return json({ error: 'nombre_invalido' }, 400);
  if (!EMAIL.test(email)) return json({ error: 'email_invalido' }, 400);
  if (b.consentimiento !== true) return json({ error: 'falta_consentimiento' }, 400);
  if (!Number.isFinite(inicio)) return json({ error: 'hueco_invalido' }, 400);

  try {
    if (!(await turnstileValido(env, b.captcha, request.headers.get('cf-connecting-ip')))) return json({ error: 'captcha_fallido' }, 400);

    // Volvemos a mirar el calendario justo ahora: el hueco tiene que seguir libre y ser uno de los que ofrecemos.
    const dia = fechaLocal(inicio);
    const ocup = await ocupado(env, zonedAUtc(dia, '00:00'), zonedAUtc(sumarDias(dia, 1), '00:00'));
    const iso = new Date(inicio).toISOString();
    if (!generarHuecos(dia, ocup, now).some((h) => h.inicio === iso)) return json({ error: 'hueco_ocupado' }, 409);

    const ev = await crearEvento(env, { inicio, nombre, email, telefono: telefono || undefined, mensaje: mensaje || undefined });
    return json({ ok: true, inicio: iso, zona: AGENDA.zona, enlaceMeet: ev.enlaceMeet ?? null });
  } catch (e) {
    if (e instanceof AgendaNoConfigurada) return json({ error: 'agenda_no_configurada' }, 503);
    console.error('reservar:', e instanceof Error ? e.message : e);
    return json({ error: 'agenda_no_disponible' }, 502);
  }
};
