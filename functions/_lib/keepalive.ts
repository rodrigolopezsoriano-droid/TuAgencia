// Mantiene activo el proyecto gratis de Supabase (lo pausa tras 7 días sin uso).
// Lo llama el Cron Trigger del Worker (ver wrangler.jsonc). Solo usa la clave pública (anon/publishable).
export interface KeepaliveEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export async function keepalive(env: KeepaliveEnv): Promise<string> {
  const url = env.SUPABASE_URL?.replace(/\/+$/, '');
  const key = env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('keepalive: faltan SUPABASE_URL y SUPABASE_ANON_KEY en las variables del Worker');
  const r = await fetch(`${url}/rest/v1/keepalive?select=id`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`keepalive: Supabase respondió ${r.status}`);
  return `keepalive ok (${r.status})`;
}
