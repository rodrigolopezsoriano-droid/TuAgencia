// Planes. Las cifras son orientativas: ajustadlas a vuestros costes reales.
export const PLANES = [
  {
    nombre: 'Esencial',
    para: 'Para empezar a automatizar lo más repetitivo.',
    setup: 357,
    mensualIntro: 79,
    mensual: 159,
    incluye: ['1 automatización: reseñas, recordatorios o gestión de leads', 'Conexión con tus herramientas actuales', 'Informe mensual de horas ahorradas', 'Soporte por email'],
    destacado: false,
  },
  {
    nombre: 'Crecimiento',
    para: 'CRM y chatbot para no perder ni un cliente.',
    setup: 597,
    mensualIntro: 99,
    mensual: 199,
    incluye: ['Chatbot de WhatsApp y web con IA', 'CRM inteligente con seguimiento automático', 'Área de cliente con tus métricas', 'Soporte prioritario por WhatsApp'],
    destacado: true,
  },
  {
    nombre: 'IA a medida',
    para: 'Agentes e informes entrenados con tus documentos.',
    setup: 990,
    mensualIntro: null,
    mensual: 249,
    incluye: ['Informes o documentos generados con IA', 'Asistente entrenado con tus archivos (RAG)', 'Integraciones a medida', 'Revisión mensual de mejoras'],
    destacado: false,
  },
];

export const MESES_INTRO = 3;
