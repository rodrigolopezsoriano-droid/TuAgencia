// Cliente mínimo de Google Calendar para Cloudflare Pages Functions (solo usa fetch).
// Las credenciales llegan por variables de entorno de Cloudflare: nunca están en el código.
import { AGENDA } from '../../src/data/agenda.ts';
import type { Intervalo } from './agenda.ts';

export interface Env {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  GOOGLE_CALENDAR_ID?: string; // por defecto 'primary'
  TURNSTILE_SECRET?: string; // opcional: si existe, se exige superar el captcha de Cloudflare
}

/** Faltan variables de entorno: la agenda no está configurada todavía. */
export class AgendaNoConfigurada extends Error {}

const API = 'https://www.googleapis.com/calendar/v3';
let cache: { token: string; caduca: number } | null = null;
export const limpiarCache = () => { cache = null; };

export async function tokenAcceso(env: Env): Promise<string> {
  const { GOOGLE_CLIENT_ID: id, GOOGLE_CLIENT_SECRET: secret, GOOGLE_REFRESH_TOKEN: refresh } = env;
  if (!id || !secret || !refresh) throw new AgendaNoConfigurada('Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN');
  if (cache && cache.caduca > Date.now() + 60_000) return cache.token;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }),
  });
  if (!r.ok) throw new Error(`Google OAuth respondió ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in?: number };
  cache = { token: j.access_token, caduca: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return cache.token;
}

const calendarId = (env: Env) => env.GOOGLE_CALENDAR_ID || 'primary';

/** Intervalos en los que el calendario ya tiene algo (cualquier evento que bloquee tiempo). */
export async function ocupado(env: Env, desde: number, hasta: number): Promise<Intervalo[]> {
  const token = await tokenAcceso(env);
  const id = calendarId(env);
  const r = await fetch(`${API}/freeBusy`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ timeMin: new Date(desde).toISOString(), timeMax: new Date(hasta).toISOString(), items: [{ id }] }),
  });
  if (!r.ok) throw new Error(`Google freeBusy respondió ${r.status}`);
  const j = (await r.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }> };
  const cal = j.calendars?.[id] ?? Object.values(j.calendars ?? {})[0];
  if (!cal || cal.errors?.length) throw new Error('Google freeBusy devolvió errores para el calendario');
  return (cal.busy ?? []).map((b) => ({ inicio: Date.parse(b.start), fin: Date.parse(b.end) }));
}

export interface DatosReserva {
  inicio: number;
  nombre: string;
  email: string;
  telefono?: string;
  mensaje?: string;
}

/** Crea el evento con videollamada de Google Meet y envía la invitación al cliente. */
export async function crearEvento(env: Env, d: DatosReserva): Promise<{ enlaceMeet?: string; enlaceEvento?: string }> {
  const token = await tokenAcceso(env);
  const fin = d.inicio + AGENDA.duracionMin * 60_000;
  const descripcion = [
    'Reserva hecha desde tuagencia.tech',
    `Nombre: ${d.nombre}`,
    `Email: ${d.email}`,
    d.telefono ? `Teléfono: ${d.telefono}` : '',
    d.mensaje ? `\nMensaje:\n${d.mensaje}` : '',
  ].filter(Boolean).join('\n');

  const r = await fetch(`${API}/calendars/${encodeURIComponent(calendarId(env))}/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      summary: `${AGENDA.titulo} · ${d.nombre}`,
      description: descripcion,
      start: { dateTime: new Date(d.inicio).toISOString(), timeZone: AGENDA.zona },
      end: { dateTime: new Date(fin).toISOString(), timeZone: AGENDA.zona },
      attendees: [{ email: d.email, displayName: d.nombre }],
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 60 }, { method: 'popup', minutes: 10 }] },
    }),
  });
  if (!r.ok) throw new Error(`Google events.insert respondió ${r.status}`);
  const j = (await r.json()) as { hangoutLink?: string; htmlLink?: string };
  return { enlaceMeet: j.hangoutLink, enlaceEvento: j.htmlLink };
}

/** Comprueba el captcha de Cloudflare Turnstile (solo si hay TURNSTILE_SECRET). */
export async function turnstileValido(env: Env, token: unknown, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true;
  if (typeof token !== 'string' || !token) return false;
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  if (ip) form.set('remoteip', ip);
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!r.ok) return false;
  return ((await r.json()) as { success?: boolean }).success === true;
}
