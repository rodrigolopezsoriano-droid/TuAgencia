// Páginas por sector: /sectores/<slug>. Son las que más ayudan a salir en Google
// en búsquedas como "automatización para peluquerías en Alcalá".
export type Sector = {
  slug: string;
  nombre: string;
  titular: string;
  problema: string;
  dolores: string[];
  soluciones: string[]; // slugs de soluciones.ts
  seo: { title: string; description: string };
};

export const SECTORES: Sector[] = [
  {
    slug: 'peluquerias-y-barberias',
    nombre: 'Peluquerías y barberías',
    titular: 'Menos teléfono. Más tijera.',
    problema:
      'Entre corte y corte respondes WhatsApps, apuntas citas y persigues a quien no se presenta. Lo automatizamos para que tu agenda se llene sola.',
    dolores: ['Citas por WhatsApp a todas horas', 'Clientes que no se presentan', 'Agenda en papel o en varias apps', 'Ninguna forma de premiar a los clientes fieles'],
    soluciones: ['webs-con-reservas', 'chatbot-whatsapp', 'recordatorios-citas', 'reputacion-online'],
    seo: {
      title: 'Automatización y reservas online para peluquerías y barberías en Alcalá y Madrid',
      description:
        'Reservas online, chatbot de WhatsApp y recordatorios automáticos para peluquerías y barberías de Alcalá de Henares y Madrid.',
    },
  },
  {
    slug: 'peritos',
    nombre: 'Peritos',
    titular: 'Tú peritas. La IA redacta.',
    problema:
      'Cada informe te cuesta horas de redacción repetitiva. Con tus propios informes anteriores entrenamos un asistente que escribe el borrador por ti a partir de fotos y notas de voz.',
    dolores: ['Horas redactando informes parecidos', 'Copiar y pegar de informes antiguos', 'Fotos y notas dispersas', 'Plazos de entrega ajustados'],
    soluciones: ['informes-con-ia', 'crm-inteligente'],
    seo: {
      title: 'Informes periciales con inteligencia artificial',
      description:
        'Automatiza la redacción de informes periciales con IA: fotos y notas de voz convertidas en un informe con tu estilo y tu plantilla.',
    },
  },
  {
    slug: 'moda-y-ecommerce',
    nombre: 'Moda y tiendas online',
    titular: 'Vende mientras duermes.',
    problema:
      'Mensajes de Instagram sin responder, preguntas por tallas y envíos, pedidos que hay que pasar a mano… Automatizamos la atención y la gestión para que te centres en la marca.',
    dolores: ['DMs de Instagram sin contestar', 'Preguntas repetidas de tallas y envíos', 'Pedidos y stock a mano', 'Contenido para redes que nunca da tiempo'],
    soluciones: ['chatbot-whatsapp', 'crm-inteligente', 'reputacion-online'],
    seo: {
      title: 'Automatización con IA para marcas de ropa y tiendas online',
      description:
        'Chatbot para Instagram y WhatsApp, CRM y automatización de pedidos para marcas de moda y e-commerce.',
    },
  },
  {
    slug: 'clinicas',
    nombre: 'Clínicas dentales y de estética',
    titular: 'Agenda llena. Recepción tranquila.',
    problema:
      'La recepción se satura con llamadas, recordatorios y reseñas. Automatizamos lo repetitivo para que tu equipo atienda a los pacientes que están delante.',
    dolores: ['Pacientes que no acuden', 'Teléfono saturado', 'Reseñas sin responder', 'Presupuestos sin seguimiento'],
    soluciones: ['recordatorios-citas', 'chatbot-whatsapp', 'reputacion-online', 'crm-inteligente'],
    seo: {
      title: 'Automatización para clínicas dentales y de estética en Madrid',
      description:
        'Recordatorios de citas por WhatsApp, chatbot y gestión de reseñas para clínicas dentales y de estética en Madrid y Alcalá.',
    },
  },
  {
    slug: 'academias',
    nombre: 'Academias',
    titular: 'Más alumnos. Menos papeleo.',
    problema:
      'Información de cursos, matrículas, recordatorios de pago y avisos a familias. Lo convertimos en un sistema que funciona solo.',
    dolores: ['Consultas repetidas sobre cursos', 'Matrículas manuales', 'Recordatorios de pago', 'Leads que se pierden'],
    soluciones: ['chatbot-whatsapp', 'crm-inteligente', 'recordatorios-citas'],
    seo: {
      title: 'Automatización y CRM para academias en Alcalá de Henares',
      description: 'Chatbot de información, CRM de alumnos y avisos automáticos para academias de idiomas y formación.',
    },
  },
  {
    slug: 'inmobiliarias',
    nombre: 'Inmobiliarias',
    titular: 'Cada interesado, atendido al minuto.',
    problema:
      'Los portales generan contactos que se enfrían en horas. La IA los responde, cualifica y agenda visitas antes que la competencia.',
    dolores: ['Leads de portales sin respuesta', 'Visitas que no se confirman', 'Fichas de inmuebles a mano', 'Seguimiento irregular'],
    soluciones: ['crm-inteligente', 'chatbot-whatsapp', 'recordatorios-citas'],
    seo: {
      title: 'CRM y chatbot con IA para inmobiliarias',
      description: 'Respuesta inmediata a leads, cualificación con IA y agenda de visitas automática para inmobiliarias.',
    },
  },
];

export const getSector = (slug: string) => SECTORES.find((s) => s.slug === slug);
