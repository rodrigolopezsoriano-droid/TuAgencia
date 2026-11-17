// Perfil de quien ha iniciado sesión: sirve para autocompletar formularios (contacto, reservas…).
// Si no hay sesión o Supabase no está configurado, simplemente no hace nada.
import { supabase } from './supabase';

export type Perfil = { nombre?: string | null; negocio?: string | null; telefono?: string | null; email?: string | null };

let cache: Promise<Perfil | null> | null = null;
export const limpiarPerfil = () => { cache = null; };

export function cargarPerfil(): Promise<Perfil | null> {
  if (!supabase) return Promise.resolve(null);
  const sb = supabase;
  cache ??= (async () => {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return null;
      const { data } = await sb.from('perfiles').select('nombre, negocio, telefono, email').eq('user_id', session.user.id).maybeSingle();
      return { email: session.user.email, ...(data ?? {}) };
    } catch { return null; }
  })();
  return cache;
}

/** Rellena los campos que sigan vacíos. `campos` = { 'selector CSS': 'campo del perfil' } */
export async function autocompletar(campos: Record<string, keyof Perfil>): Promise<boolean> {
  const p = await cargarPerfil();
  if (!p) return false;
  for (const [selector, campo] of Object.entries(campos)) {
    const el = document.querySelector<HTMLInputElement>(selector);
    const valor = p[campo];
    if (el && !el.value && valor) { el.value = valor; el.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  return true;
}
