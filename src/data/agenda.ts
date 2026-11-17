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
  // Lunes a viernes de 9:00 a 20:00 y sábados de 9:00 a 15:00.
  horario: {
    0: [],
    1: [['09:00', '20:00']],
    2: [['09:00', '20:00']],
    3: [['09:00', '20:00']],
    4: [['09:00', '20:00']],
    5: [['09:00', '20:00']],
    6: [['09:00', '15:00']],
  } as Record<number, Franja[]>,
  antelacionHoras: 12, // no se puede reservar con menos antelación que esta
  diasVista: 30, // cuántos días hacia delante se ofrecen
};
