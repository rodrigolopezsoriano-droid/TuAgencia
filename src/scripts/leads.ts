// Guarda un contacto en la tabla `leads` de Supabase (la web anónima solo puede INSERTAR).
// Lo usan el informe de reseñas, la calculadora y el chat. El formulario de /contacto tiene su propia lógica.
import { supabase } from './supabase';

export type Lead = {
  nombre: string;
  email: string;
  negocio?: string | null;
  telefono?: string | null;
  interes?: string | null;
  mensaje?: string | null;
  origen: string;
};

/** 'ok' = guardado · 'error' = falló · 'sin-servicio' = Supabase no está configurado en esta web */
export async function enviarLead(lead: Lead): Promise<'ok' | 'error' | 'sin-servicio'> {
  if (!supabase) return 'sin-servicio';
  const fila = {
    nombre: lead.nombre.trim().slice(0, 120),
    email: lead.email.trim().slice(0, 200),
    negocio: lead.negocio?.trim().slice(0, 160) || null,
    telefono: lead.telefono?.trim().slice(0, 40) || null,
    interes: lead.interes?.slice(0, 60) || null,
    mensaje: lead.mensaje?.trim().slice(0, 3000) || null,
    origen: lead.origen.slice(0, 40),
  };
  const { error } = await supabase.from('leads').insert(fila);
  return error ? 'error' : 'ok';
}

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
