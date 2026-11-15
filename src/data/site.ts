// ─────────────────────────────────────────────────────────────
//  DATOS GENERALES DE LA AGENCIA — edita aquí y cambia toda la web
// ─────────────────────────────────────────────────────────────

export const SITE = {
  nombre: 'TuAgencia',
  dominio: 'tuagencia.tech',
  url: 'https://tuagencia.tech',
  eslogan: 'Tu negocio, en piloto automático.',
  descripcion:
    'Chatbots, CRM y automatizaciones con IA para negocios locales de Madrid y Alcalá de Henares. Recupera horas cada semana sin cambiar tu forma de trabajar.',
  email: 'admin@tuagencia.tech',
  // PENDIENTE: cuando tengáis WhatsApp Business, pon el número con prefijo y sin espacios, p. ej. '34600111222'
  whatsapp: '',
  instagram: 'https://www.instagram.com/tuagenciatech',
  zona: ['Alcalá de Henares', 'Madrid'],
  // Página propia de reservas, conectada a Google Calendar y Google Meet. Ver docs/AGENDA.md
  agenda: '/reservar',
};

export const NAV = [
  { href: '/soluciones', label: 'Soluciones' },
  { href: '/sectores', label: 'Sectores' },
  { href: '/precios', label: 'Precios' },
  { href: '/equipo', label: 'Equipo' },
];

// En la web solo se muestran los nombres (sin estudios ni cargos).
export const EQUIPO = [
  { nombre: 'Pablo Villalvilla Martín', inicial: 'P' },
  { nombre: 'Jorge Jiménez Gutiérrez', inicial: 'J' },
  { nombre: 'Rodrigo López Soriano', inicial: 'R' },
];

export const FAQ = [
  {
    p: '¿Necesito saber de tecnología?',
    r: 'No. Nos adaptamos a las herramientas que ya usas (WhatsApp, Google Calendar, Excel, tu correo…) y formamos a tu equipo en una sesión de 30 minutos.',
  },
  {
    p: '¿Cuánto se tarda en tenerlo funcionando?',
    r: 'Te enseñamos una demo sobre un caso real de tu negocio en 48 horas. Una automatización estándar queda funcionando en unas 2 semanas.',
  },
  {
    p: '¿Qué pasa con los datos de mis clientes?',
    r: 'Cumplimos el RGPD: alojamos los datos en servidores de la Unión Europea, firmamos contigo un contrato de encargado del tratamiento y usamos proveedores de IA que no entrenan con tus datos.',
  },
  {
    p: '¿Hay permanencia?',
    r: 'No. Pagas la puesta en marcha y una cuota mensual que incluye mantenimiento y soporte. Puedes darte de baja cuando quieras.',
  },
  {
    p: '¿Y si no me ahorra tiempo?',
    r: 'La auditoría inicial es gratis. Si no vemos un ahorro claro para tu negocio, te lo decimos y no te cobramos nada.',
  },
  {
    p: '¿Trabajáis fuera de Madrid?',
    r: 'Sí. Estamos en Alcalá de Henares y Madrid, pero casi todo el trabajo es en remoto, así que podemos ayudarte estés donde estés.',
  },
];
