// Lógica pura de huecos (sin red): zonas horarias, franjas y solapes.
// Se prueba con `npm test`. Los ficheros de functions/ no se publican como páginas.
import { AGENDA } from '../../src/data/agenda.ts';

export type Intervalo = { inicio: number; fin: number }; // milisegundos desde 1970 (UTC)
export type Hueco = { inicio: string; hora: string }; // inicio en ISO UTC; hora 'HH:MM' en la zona de la agenda

const MIN = 60_000;
const DIA = 86_400_000;

/** Diferencia (ms) entre la hora de pared de `zona` y UTC en el instante `ms`. */
function desfaseMs(ms: number, zona: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: zona, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(ms / 1000) * 1000;
}

/** Convierte "fecha + hora de pared en la zona" al instante UTC (ms). Resuelve bien los cambios de hora. */
export function zonedAUtc(fecha: string, hora: string, zona = AGENDA.zona): number {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  const pared = Date.UTC(y, m - 1, d, hh, mm);
  let t = pared - desfaseMs(pared, zona);
  t = pared - desfaseMs(t, zona);
  return t;
}

export function fechaValida(f: unknown): f is string {
  if (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  const [y, m, d] = f.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function sumarDias(f: string, n: number): string {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DIA).toISOString().slice(0, 10);
}

export function diaSemana(f: string): number {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Fecha 'YYYY-MM-DD' de un instante, vista en la zona de la agenda. */
export function fechaLocal(ms: number, zona = AGENDA.zona): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  return p; // en-CA da YYYY-MM-DD
}

export function horaLocal(ms: number, zona = AGENDA.zona): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zona, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
}

function solapa(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fin && a.fin > b.inicio;
}

/** Huecos libres de un día concreto. */
export function generarHuecos(fecha: string, ocupados: Intervalo[], ahora: number): Hueco[] {
  const minimo = ahora + AGENDA.antelacionHoras * 60 * MIN;
  const maximo = ahora + (AGENDA.diasVista + 1) * DIA;
  const huecos: Hueco[] = [];
  for (const [desde, hasta] of AGENDA.horario[diaSemana(fecha)] ?? []) {
    const fin = zonedAUtc(fecha, hasta);
    for (let t = zonedAUtc(fecha, desde); t + AGENDA.duracionMin * MIN <= fin; t += AGENDA.duracionMin * MIN) {
      const h: Intervalo = { inicio: t, fin: t + AGENDA.duracionMin * MIN };
      if (h.inicio < minimo || h.inicio > maximo) continue;
      if (ocupados.some((o) => solapa(h, o))) continue;
      huecos.push({ inicio: new Date(t).toISOString(), hora: horaLocal(t) });
    }
  }
  return huecos;
}

/** Huecos libres de `dias` días a partir de `desde`, agrupados por fecha. Solo incluye días con algún hueco. */
export function huecosEnRango(desde: string, dias: number, ocupados: Intervalo[], ahora: number): Record<string, Hueco[]> {
  const out: Record<string, Hueco[]> = {};
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(desde, i);
    const h = generarHuecos(f, ocupados, ahora);
    if (h.length) out[f] = h;
  }
  return out;
}
