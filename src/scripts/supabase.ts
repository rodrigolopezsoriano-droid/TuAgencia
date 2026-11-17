import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

/** Devuelve el cliente de Supabase, o null si aún no habéis puesto las claves en .env */
export const supabase: SupabaseClient | null =
  url && key && !url.includes('xxxxxxxx') ? createClient(url, key) : null;
