// Datos y operaciones de los paneles (cliente, equipo y admin). Todo pasa por Supabase con la sesión de
// la persona: la seguridad real la imponen las políticas RLS de supabase/schema.sql, no esta pantalla.
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { ultimosMeses } from './util';

export type Rol = 'cliente' | 'equipo' | 'admin';
export type Ctx = { user: User; rol: Rol; nombre: string; email: string };

export type Ticket = { id: number; user_id: string; tipo: string; titulo: string | null; mensaje: string; estado: string; respuesta: string | null; creado: string; actualizado?: string };
export type Lead = { id: number; creado: string; nombre: string; negocio: string | null; email: string; telefono: string | null; interes: string | null; mensaje: string | null; estado: string; origen: string | null; user_id: string | null };
export type Cliente = { id: number; user_id: string | null; negocio: string; contacto: string | null; email: string | null; plan: string | null; coste_hora: number; alta: string };
export type Auto = { id: number; cliente_id: number; nombre: string; activa: boolean; creado: string };
export type Metrica = { id: number; cliente_id: number; fecha: string; etiqueta: string | null; valor: number; horas_ahorradas: number };
export type Informe = { id: number; cliente_id: number; titulo: string; url: string; creado: string };
export type Perfil = { user_id: string; nombre: string | null; negocio: string | null; telefono: string | null; email: string };
export type Nota = { id: number; tipo: string; ref: number; texto: string; autor: string; creado: string };
export type Miembro = { email: string; nombre: string; rol: string; ultimo_acceso: string | null; confirmado: boolean };

export type DatosCliente = {
  perfil: Perfil | null; cliente: Cliente | null; autos: Auto[]; metricas: Metrica[]; informes: Informe[]; tickets: Ticket[];
};
export type DatosEquipo = {
  tickets: Ticket[]; clientes: Cliente[]; leads: Lead[]; perfiles: Map<string, Perfil>; metricas: Metrica[]; autos: Auto[]; informes: Informe[];
};

export const S = {
  ctx: null as Ctx | null,
  cli: null as DatosCliente | null,
  eq: null as DatosEquipo | null,
  actualizado: 0,
  ui: {
    solFiltro: 'todas', solTipo: '', solBusca: '',
    leadFiltro: 'todos', leadOrigen: '', leadBusca: '',
    cliBusca: '', cliPlan: '',
    resMes: ultimosMeses(1)[0],
  },
};

const sb = () => {
  if (!supabase) throw new Error('Sin conexión con la base de datos');
  return supabase;
};
const msgError = (e: { message?: string } | null) => (e ? e.message ?? 'Error desconocido' : null);

/** Descubre si la persona es cliente, equipo o admin (decidido por la base de datos, con email verificado). */
export async function resolverRol(user: User): Promise<{ rol: Rol; nombre: string }> {
  const c = sb();
  const r = await c.rpc('mi_rol');
  if (!r.error && Array.isArray(r.data)) {
    const fila = r.data[0] as { rol: string; nombre: string } | undefined;
    if (fila) return { rol: fila.rol === 'admin' ? 'admin' : 'equipo', nombre: fila.nombre };
    return { rol: 'cliente', nombre: '' };
  }
  // Base de datos sin actualizar (aún no existe mi_rol): usamos las funciones antiguas
  const [s, a] = await Promise.all([c.rpc('es_staff'), c.rpc('es_admin')]);
  if (s.data === true) return { rol: a.data === true ? 'admin' : 'equipo', nombre: (user.email ?? '').split('@')[0] };
  return { rol: 'cliente', nombre: '' };
}

const desde6Meses = () => `${ultimosMeses(6)[0]}-01`;

export async function cargarCliente(user: User): Promise<DatosCliente> {
  const c = sb();
  const [per, cli, autos, met, inf, tk] = await Promise.all([
    c.from('perfiles').select('user_id, nombre, negocio, telefono, email').eq('user_id', user.id).maybeSingle(),
    c.from('clientes').select('id, user_id, negocio, contacto, email, plan, coste_hora, alta').eq('user_id', user.id).maybeSingle(),
    c.from('automatizaciones').select('id, cliente_id, nombre, activa, creado').order('creado', { ascending: true }),
    c.from('metricas').select('id, cliente_id, fecha, etiqueta, valor, horas_ahorradas').gte('fecha', desde6Meses()).order('fecha', { ascending: false }).limit(3000),
    c.from('informes').select('id, cliente_id, titulo, url, creado').order('creado', { ascending: false }).limit(100),
    c.from('tickets').select('id, user_id, tipo, titulo, mensaje, estado, respuesta, creado, actualizado').order('creado', { ascending: false }).limit(200),
  ]);
  const fallo = [per, cli, autos, met, inf, tk].find((x) => x.error);
  if (fallo) throw new Error(msgError(fallo.error)!);
  const cliente = cli.data as Cliente | null;
  return {
    perfil: (per.data as Perfil | null) ?? null,
    cliente: cliente ? { ...cliente, coste_hora: Number(cliente.coste_hora) } : null,
    autos: (autos.data as Auto[]) ?? [],
    metricas: ((met.data as Metrica[]) ?? []).map(normMetrica),
    informes: (inf.data as Informe[]) ?? [],
    tickets: (tk.data as Ticket[]) ?? [],
  };
}

const normMetrica = (m: Metrica): Metrica => ({ ...m, valor: Number(m.valor) || 0, horas_ahorradas: Number(m.horas_ahorradas) || 0 });

export async function cargarEquipo(): Promise<DatosEquipo> {
  const c = sb();
  const [tk, cl, ld, pf, met, au, inf] = await Promise.all([
    c.from('tickets').select('id, user_id, tipo, titulo, mensaje, estado, respuesta, creado, actualizado').order('creado', { ascending: false }).limit(500),
    c.from('clientes').select('id, user_id, negocio, contacto, email, plan, coste_hora, alta').order('alta', { ascending: false }).limit(1000),
    c.from('leads').select('id, creado, nombre, negocio, email, telefono, interes, mensaje, estado, origen, user_id').order('creado', { ascending: false }).limit(1000),
    c.from('perfiles').select('user_id, nombre, negocio, telefono, email').limit(2000),
    c.from('metricas').select('id, cliente_id, fecha, etiqueta, valor, horas_ahorradas').gte('fecha', desde6Meses()).order('fecha', { ascending: false }).limit(5000),
    c.from('automatizaciones').select('id, cliente_id, nombre, activa, creado').limit(3000),
    c.from('informes').select('id, cliente_id, titulo, url, creado').order('creado', { ascending: false }).limit(1000),
  ]);
  const fallo = [tk, cl, ld, pf, met, au, inf].find((x) => x.error);
  if (fallo) throw new Error(msgError(fallo.error)!);
  return {
    tickets: (tk.data as Ticket[]) ?? [],
    clientes: ((cl.data as Cliente[]) ?? []).map((x) => ({ ...x, coste_hora: Number(x.coste_hora) })),
    leads: (ld.data as Lead[]) ?? [],
    perfiles: new Map(((pf.data as Perfil[]) ?? []).map((p) => [p.user_id, p])),
    metricas: ((met.data as Metrica[]) ?? []).map(normMetrica),
    autos: (au.data as Auto[]) ?? [],
    informes: (inf.data as Informe[]) ?? [],
  };
}

// ── Operaciones (devuelven null si va bien, o el texto del error) ──
export const op = {
  async ticketNuevo(userId: string, t: { tipo: string; titulo: string; mensaje: string }) {
    const { error } = await sb().from('tickets').insert({ user_id: userId, ...t });
    return msgError(error);
  },
  async ticketActualizar(id: number, cambios: { estado?: string; respuesta?: string | null }) {
    const { error } = await sb().from('tickets').update(cambios).eq('id', id);
    return msgError(error);
  },
  async leadEstado(id: number, estado: string) {
    const { error } = await sb().from('leads').update({ estado }).eq('id', id);
    return msgError(error);
  },
  async clienteActualizar(id: number, cambios: { plan?: string | null; coste_hora?: number }) {
    const { error } = await sb().from('clientes').update(cambios).eq('id', id);
    return msgError(error);
  },
  async autoNueva(cliente_id: number, nombre: string) {
    const { data, error } = await sb().from('automatizaciones').insert({ cliente_id, nombre }).select('id, cliente_id, nombre, activa, creado').single();
    return { fila: data as Auto | null, error: msgError(error) };
  },
  async autoActiva(id: number, activa: boolean) {
    const { error } = await sb().from('automatizaciones').update({ activa }).eq('id', id);
    return msgError(error);
  },
  async autoBorrar(id: number) {
    const { error } = await sb().from('automatizaciones').delete().eq('id', id);
    return msgError(error);
  },
  async metricaNueva(m: { cliente_id: number; fecha: string; etiqueta: string; valor: number; horas_ahorradas: number }) {
    const { data, error } = await sb().from('metricas').insert(m).select('id, cliente_id, fecha, etiqueta, valor, horas_ahorradas').single();
    return { fila: data ? normMetrica(data as Metrica) : null, error: msgError(error) };
  },
  async metricaBorrar(id: number) {
    const { error } = await sb().from('metricas').delete().eq('id', id);
    return msgError(error);
  },
  async informeNuevo(i: { cliente_id: number; titulo: string; url: string }) {
    const { data, error } = await sb().from('informes').insert(i).select('id, cliente_id, titulo, url, creado').single();
    return { fila: data as Informe | null, error: msgError(error) };
  },
  async informeBorrar(id: number) {
    const { error } = await sb().from('informes').delete().eq('id', id);
    return msgError(error);
  },
  async notas(tipo: 'lead' | 'cliente', ref: number) {
    const { data, error } = await sb().from('notas').select('id, tipo, ref, texto, autor, creado').eq('tipo', tipo).eq('ref', ref).order('creado', { ascending: false }).limit(100);
    return { filas: (data as Nota[]) ?? [], error: msgError(error) };
  },
  async notaNueva(tipo: 'lead' | 'cliente', ref: number, texto: string) {
    const { data, error } = await sb().from('notas').insert({ tipo, ref, texto }).select('id, tipo, ref, texto, autor, creado').single();
    return { fila: data as Nota | null, error: msgError(error) };
  },
  async notaBorrar(id: number) {
    const { error } = await sb().from('notas').delete().eq('id', id);
    return msgError(error);
  },
  async equipo() {
    const { data, error } = await sb().rpc('equipo');
    return { filas: (data as Miembro[]) ?? [], error: msgError(error) };
  },
  async perfilGuardar(userId: string, p: { nombre: string | null; negocio: string | null; telefono: string | null }) {
    const { error } = await sb().from('perfiles').update(p).eq('user_id', userId);
    return msgError(error);
  },
  async contrasena(nueva: string) {
    const { error } = await sb().auth.updateUser({ password: nueva });
    return msgError(error);
  },
};
