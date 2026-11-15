// ─────────────────────────────────────────────────────────────
//  AGENDA DE LLAMADAS — edita aquí tu disponibilidad
//  Lo usan la página /reservar y las funciones de functions/api/
//  Las reservas se guardan en tu Google Calendar, con enlace de Google Meet.
// ─────────────────────────────────────────────────────────────

export type Franja = [desde: string, hasta: string]; // 'HH:MM' en la zona horaria de abajo

export const AGENDA = {
  zona: 'Europe/Madrid',
  duracionMin: 30,
  titulo: 'Llamada con TuAgencia',
  // Franjas en las que se puede reservar, por día de la semana (0 = domingo … 6 = sábado).
  // Un día con [] no ofrece huecos. Cada franja se trocea en llamadas de `duracionMin`.
  // ⚠ Horario de partida: cámbialo por el que de verdad queráis atender.
  horario: {
    0: [],
    1: [['10:00', '14:00'], ['16:00', '19:00']],
    2: [['10:00', '14:00'], ['16:00', '19:00']],
    3: [['10:00', '14:00'], ['16:00', '19:00']],
    4: [['10:00', '14:00'], ['16:00', '19:00']],
    5: [['10:00', '14:00'], ['16:00', '19:00']],
    6: [],
  } as Record<number, Franja[]>,
  antelacionHoras: 12, // no se puede reservar con menos antelación que esta
  diasVista: 30, // cuántos días hacia delante se ofrecen
};
