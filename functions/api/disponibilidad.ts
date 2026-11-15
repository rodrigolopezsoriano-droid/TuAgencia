// GET /api/disponibilidad → huecos libres de los próximos días, según tu Google Calendar.
import { AGENDA } from '../../src/data/agenda.ts';
import { fechaLocal, huecosEnRango, sumarDias, zonedAUtc } from '../_lib/agenda.ts';
import { AgendaNoConfigurada, ocupado, type Env } from '../_lib/google.ts';

const json = (cuerpo: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache } });

export const onRequestGet = async ({ env, now = Date.now() }: { env: Env; now?: number }) => {
  try {
    const desde = fechaLocal(now);
    const hasta = sumarDias(desde, AGENDA.diasVista + 1);
    const ocup = await ocupado(env, zonedAUtc(desde, '00:00'), zonedAUtc(hasta, '00:00'));
    const dias = huecosEnRango(desde, AGENDA.diasVista + 1, ocup, now);
    return json({ zona: AGENDA.zona, duracionMin: AGENDA.duracionMin, dias }, 200, 'public, max-age=30');
  } catch (e) {
    if (e instanceof AgendaNoConfigurada) return json({ error: 'agenda_no_configurada' }, 503);
    console.error('disponibilidad:', e instanceof Error ? e.message : e);
    return json({ error: 'agenda_no_disponible' }, 502);
  }
};
