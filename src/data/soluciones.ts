// Catálogo de soluciones. Cada una genera su página en /soluciones/<slug>
export type Solucion = {
  slug: string;
  nombre: string;
  corto: string; // titular corto
  resumen: string;
  icono: string; // emoji sencillo; cámbialo por un SVG si queréis
  destacado?: boolean;
  plan: 'Esencial' | 'Crecimiento' | 'IA a medida';
  queHace: string[];
  paraQuien: string[];
  resultado: string; // beneficio principal (sin cifras inventadas)
  seo: { title: string; description: string };
};

export const SOLUCIONES: Solucion[] = [
  {
    slug: 'chatbot-whatsapp',
    nombre: 'Chatbot de WhatsApp y web',
    corto: 'Responde 24/7. Agenda solo.',
    resumen:
      'Un asistente con IA que contesta a tus clientes por WhatsApp y en tu web, resuelve dudas, da precios y reserva citas en tu calendario, también de madrugada.',
    icono: '💬',
    destacado: true,
    plan: 'Crecimiento',
    queHace: [
      'Contesta al instante preguntas frecuentes: horarios, precios, servicios, ubicación.',
      'Reserva, cambia y cancela citas directamente en tu agenda.',
      'Detecta cuándo hace falta una persona y te pasa la conversación.',
      'Habla con el tono de tu negocio y en varios idiomas.',
    ],
    paraQuien: ['Peluquerías y barberías', 'Clínicas y centros de estética', 'Academias', 'Tiendas online'],
    resultado: 'Ningún mensaje sin respuesta y menos tiempo pegado al móvil.',
    seo: {
      title: 'Chatbot de WhatsApp con IA para negocios en Madrid',
      description:
        'Chatbot con inteligencia artificial para WhatsApp y web que responde 24/7 y reserva citas. Para negocios locales de Madrid y Alcalá de Henares.',
    },
  },
  {
    slug: 'crm-inteligente',
    nombre: 'CRM inteligente',
    corto: 'Cada cliente, en su sitio.',
    resumen:
      'Todos los contactos que llegan por tu web, WhatsApp, Instagram o correo entran solos en un CRM. La IA los clasifica y hace el seguimiento para que ninguno se enfríe.',
    icono: '📇',
    destacado: true,
    plan: 'Crecimiento',
    queHace: [
      'Recoge leads de formularios, WhatsApp, Instagram y email en un único sitio.',
      'Clasifica cada contacto por interés y urgencia con IA.',
      'Envía seguimientos automáticos a quien pidió presupuesto y no respondió.',
      'Te avisa al móvil cuando entra un cliente caliente.',
    ],
    paraQuien: ['Inmobiliarias', 'Academias', 'Talleres', 'Servicios profesionales'],
    resultado: 'Menos clientes perdidos por falta de seguimiento.',
    seo: {
      title: 'CRM con inteligencia artificial para pymes',
      description:
        'CRM automático con IA que centraliza los contactos de web, WhatsApp e Instagram y hace el seguimiento por ti. Implantación en 2 semanas.',
    },
  },
  {
    slug: 'informes-con-ia',
    nombre: 'Informes automáticos con IA',
    corto: 'De fotos y notas a informe.',
    resumen:
      'Subes las fotos, dictas un par de notas y la IA redacta el informe completo con tu estilo y tu plantilla, aprendiendo de todos los informes que ya has hecho.',
    icono: '📄',
    destacado: true,
    plan: 'IA a medida',
    queHace: [
      'Transcribe notas de voz y analiza fotografías.',
      'Busca tus informes anteriores más parecidos y copia su estructura y su estilo.',
      'Genera el documento en Word o PDF con tu plantilla.',
      'Tú solo revisas y firmas.',
    ],
    paraQuien: ['Peritos', 'Arquitectos e ingenieros', 'Gestorías', 'Clínicas'],
    resultado: 'Informes en minutos en lugar de horas, con tu estilo de siempre.',
    seo: {
      title: 'Informes periciales automáticos con IA',
      description:
        'Automatiza la redacción de informes periciales y técnicos con inteligencia artificial: sube fotos, dicta notas y recibe el informe en tu plantilla.',
    },
  },
  {
    slug: 'reputacion-online',
    nombre: 'Monitor de reputación',
    corto: 'Tus reseñas, analizadas.',
    resumen:
      'Leemos tus reseñas de Google Maps, la IA detecta las quejas que se repiten y te enviamos un informe semanal con qué mejorar. También puede responder reseñas por ti.',
    icono: '⭐',
    plan: 'Esencial',
    queHace: [
      'Recoge automáticamente tus reseñas de Google Maps.',
      'Detecta quejas y elogios recurrentes con IA.',
      'Te envía un informe PDF cada semana.',
      'Propone o publica respuestas a cada reseña.',
    ],
    paraQuien: ['Clínicas dentales', 'Restaurantes', 'Peluquerías', 'Comercios'],
    resultado: 'Sabes qué opinan de ti sin leer reseña por reseña.',
    seo: {
      title: 'Gestión de reseñas de Google con IA',
      description:
        'Monitor de reputación online: análisis de reseñas de Google Maps con IA e informe semanal para negocios locales.',
    },
  },
  {
    slug: 'recordatorios-citas',
    nombre: 'Recordatorios anti-ausencias',
    corto: 'Menos huecos vacíos.',
    resumen:
      'Lee tu calendario y envía recordatorios por WhatsApp y email antes de cada cita, con un botón para confirmar o cambiarla. El hueco liberado se ofrece a otros clientes.',
    icono: '⏰',
    plan: 'Esencial',
    queHace: [
      'Recordatorio automático 24 h y 2 h antes de cada cita.',
      'Confirmación, cambio o cancelación con un toque.',
      'Avisa a la lista de espera cuando se libera un hueco.',
      'Funciona con Google Calendar y con tu sistema de reservas.',
    ],
    paraQuien: ['Clínicas', 'Fisioterapia', 'Peluquerías', 'Talleres'],
    resultado: 'Menos citas perdidas y una agenda más llena.',
    seo: {
      title: 'Recordatorios de citas por WhatsApp automáticos',
      description:
        'Reduce las ausencias con recordatorios automáticos por WhatsApp y email conectados a tu calendario.',
    },
  },
  {
    slug: 'webs-con-reservas',
    nombre: 'Web con reservas online',
    corto: 'Tu web, que trabaja sola.',
    resumen:
      'Diseñamos tu web con reservas online, área de clientes, programa de fidelización y panel de gestión para tu equipo. Todo conectado con el resto de tus automatizaciones.',
    icono: '🗓️',
    plan: 'Crecimiento',
    queHace: [
      'Reservas online con disponibilidad real y sin solapamientos.',
      'Cuentas de cliente, historial y club de fidelización.',
      'Panel de gestión con agenda y clientes para tu equipo.',
      'Agenda sincronizada con el calendario del móvil.',
    ],
    paraQuien: ['Barberías y peluquerías', 'Centros de estética', 'Clínicas', 'Academias'],
    resultado: 'Reservas a cualquier hora sin coger el teléfono.',
    seo: {
      title: 'Página web con reservas online para negocios locales',
      description:
        'Webs con sistema de reservas, área de clientes y panel de gestión para barberías, peluquerías y clínicas de Madrid y Alcalá.',
    },
  },
];

export const getSolucion = (slug: string) => SOLUCIONES.find((s) => s.slug === slug);
