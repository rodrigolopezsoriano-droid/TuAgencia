-- ════════════════════════════════════════════════════════════════
--  TuAgencia · Base de datos (Supabase / PostgreSQL) · versión 2
--  Pega este archivo entero en Supabase > SQL Editor > New query > Run.
--  Se puede ejecutar varias veces sin problema (no borra datos).
--  Guía completa: docs/SUPABASE.md
-- ════════════════════════════════════════════════════════════════
--
--  QUIÉN PUEDE QUÉ
--   · Visitante (anónimo) ......... solo ENVIAR el formulario de contacto.
--   · Cliente registrado .......... solo ve y modifica SUS datos, SUS solicitudes y SU panel.
--   · Equipo (staff) .............. ve todo; gestiona solicitudes, contactos, automatizaciones,
--                                   métricas e informes.
--   · Admin ....................... lo mismo que el equipo + da de alta/edita clientes y planes.
--  Quién es equipo o admin se decide en la tabla `staff` (por email VERIFICADO), nunca por
--  datos que el usuario escriba al registrarse.

-- ── 1) PERFILES: datos de cada persona registrada (sirven para autocompletar formularios) ──
create table if not exists public.perfiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  nombre      text check (char_length(nombre)   <= 120),
  negocio     text check (char_length(negocio)  <= 160),
  telefono    text check (char_length(telefono) <= 40),
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists perfiles_email on public.perfiles (lower(email));

-- ── 2) STAFF: quién es admin o equipo ──
create table if not exists public.staff (
  email  text primary key check (email = lower(email)),
  nombre text not null,
  rol    text not null check (rol in ('admin', 'equipo'))
);
insert into public.staff (email, nombre, rol) values
  ('admin@tuagencia.tech',  'Administración',           'admin'),
  ('pablo@tuagencia.tech',  'Pablo Villalvilla Martín', 'equipo'),
  ('jorge@tuagencia.tech',  'Jorge Jiménez Gutiérrez',  'equipo'),
  ('rodrigo@tuagencia.tech','Rodrigo López Soriano',    'equipo')
on conflict (email) do nothing;

-- ── 3) LEADS: lo que llega desde el formulario de contacto de la web ──
create table if not exists public.leads (
  id         bigint generated always as identity primary key,
  creado     timestamptz not null default now(),
  nombre     text not null check (char_length(nombre) between 1 and 120),
  negocio    text check (char_length(negocio) <= 160),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefono   text check (char_length(telefono) <= 40),
  interes    text check (char_length(interes) <= 60),
  mensaje    text check (char_length(mensaje) <= 3000),
  origen     text default 'web' check (char_length(origen) <= 40),
  estado     text not null default 'nuevo' check (estado in ('nuevo','contactado','demo','cliente','descartado')),
  notas      text
);
-- Si quien envía el formulario ha iniciado sesión, el contacto queda ligado a su cuenta
alter table public.leads add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete set null;
create index if not exists leads_user on public.leads (user_id);

-- ── 4) CLIENTES: una fila por negocio, enlazada a la cuenta de acceso ──
create table if not exists public.clientes (
  id          bigint generated always as identity primary key,
  user_id     uuid unique references auth.users(id) on delete set null,
  negocio     text not null,
  contacto    text,
  email       text,
  plan        text check (plan in ('Esencial','Crecimiento','IA a medida')),
  coste_hora  numeric(6,2) not null default 15,
  alta        date not null default current_date
);

-- ── 5) AUTOMATIZACIONES contratadas por cada cliente ──
create table if not exists public.automatizaciones (
  id         bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes(id) on delete cascade,
  nombre     text not null,
  activa     boolean not null default true,
  creado     timestamptz not null default now()
);

-- ── 6) MÉTRICAS: lo que va sumando cada automatización (n8n o vuestros scripts insertan aquí) ──
create table if not exists public.metricas (
  id               bigint generated always as identity primary key,
  cliente_id       bigint not null references public.clientes(id) on delete cascade,
  fecha            date not null default current_date,
  etiqueta         text,             -- p. ej. 'Citas agendadas por el chatbot'
  valor            numeric not null default 0,
  horas_ahorradas  numeric(6,2) not null default 0
);
create index if not exists metricas_cliente_fecha on public.metricas (cliente_id, fecha);

-- ── 7) INFORMES descargables (PDF en Supabase Storage o cualquier URL) ──
create table if not exists public.informes (
  id         bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes(id) on delete cascade,
  titulo     text not null,
  url        text not null,
  creado     timestamptz not null default now()
);

-- ── 8) TICKETS = solicitudes que el cliente envía desde su área ──
create table if not exists public.tickets (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  mensaje  text not null check (char_length(mensaje) between 1 and 3000),
  estado   text not null default 'abierto' check (estado in ('abierto','en curso','cerrado')),
  creado   timestamptz not null default now()
);
alter table public.tickets add column if not exists tipo        text not null default 'otro'
  check (tipo in ('nueva automatización','cambio','incidencia','otro'));
alter table public.tickets add column if not exists titulo      text check (char_length(titulo) <= 140);
alter table public.tickets add column if not exists respuesta   text check (char_length(respuesta) <= 3000);
alter table public.tickets add column if not exists actualizado timestamptz not null default now();
create index if not exists tickets_user on public.tickets (user_id, creado desc);

-- ── Tabla para el "ping" que evita que el proyecto gratis se pause ──
create table if not exists public.keepalive (id int primary key default 1, ultimo timestamptz);
insert into public.keepalive (id, ultimo) values (1, now()) on conflict (id) do nothing;

-- ════════════════════════════════════════════════════════════════
--  FUNCIONES
-- ════════════════════════════════════════════════════════════════

-- ¿La persona que ha iniciado sesión es del equipo? Solo cuenta si su email está VERIFICADO.
create or replace function public.es_staff() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.staff s join auth.users u on lower(u.email) = s.email
    where u.id = auth.uid() and u.email_confirmed_at is not null)
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.staff s join auth.users u on lower(u.email) = s.email
    where u.id = auth.uid() and u.email_confirmed_at is not null and s.rol = 'admin')
$$;

-- id de la ficha de cliente de quien ha iniciado sesión
create or replace function public.mi_cliente_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from public.clientes where user_id = auth.uid()
$$;

-- Al registrarse alguien: se crea su perfil y, si no es del equipo, su ficha de cliente.
-- (Lo que escribe el usuario en el registro solo se usa como texto; NUNCA para dar permisos.)
create or replace function public.nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nombre   text := left(nullif(btrim(m->>'nombre'),   ''), 120);
  v_negocio  text := left(nullif(btrim(m->>'negocio'),  ''), 160);
  v_telefono text := left(nullif(btrim(m->>'telefono'), ''), 40);
begin
  insert into public.perfiles (user_id, email, nombre, negocio, telefono)
  values (new.id, lower(new.email), v_nombre, v_negocio, v_telefono)
  on conflict (user_id) do nothing;

  if not exists (select 1 from public.staff where email = lower(new.email)) then
    insert into public.clientes (user_id, negocio, contacto, email)
    values (new.id, coalesce(v_negocio, 'Sin indicar'), v_nombre, lower(new.email))
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.nuevo_usuario();

-- Cuando el cliente edita su perfil, se refleja en su ficha de cliente
create or replace function public.perfil_antes_de_guardar() returns trigger
language plpgsql as $$
begin new.actualizado := now(); return new; end $$;
drop trigger if exists perfil_antes on public.perfiles;
create trigger perfil_antes before update on public.perfiles
  for each row execute function public.perfil_antes_de_guardar();

create or replace function public.perfil_sincroniza_cliente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.clientes
     set negocio  = coalesce(nullif(new.negocio, ''), negocio),
         contacto = coalesce(nullif(new.nombre,  ''), contacto)
   where user_id = new.user_id;
  return new;
end $$;
drop trigger if exists perfil_despues on public.perfiles;
create trigger perfil_despues after update on public.perfiles
  for each row execute function public.perfil_sincroniza_cliente();

create or replace function public.ticket_antes_de_guardar() returns trigger
language plpgsql as $$
begin new.actualizado := now(); return new; end $$;
drop trigger if exists ticket_antes on public.tickets;
create trigger ticket_antes before update on public.tickets
  for each row execute function public.ticket_antes_de_guardar();

-- ════════════════════════════════════════════════════════════════
--  SEGURIDAD: Row Level Security
-- ════════════════════════════════════════════════════════════════
alter table public.perfiles         enable row level security;
alter table public.staff            enable row level security;   -- sin políticas: nadie la toca desde la web
alter table public.leads            enable row level security;
alter table public.clientes         enable row level security;
alter table public.automatizaciones enable row level security;
alter table public.metricas         enable row level security;
alter table public.informes         enable row level security;
alter table public.tickets          enable row level security;
alter table public.keepalive        enable row level security;

-- Permisos a nivel de tabla: lo mínimo imprescindible (RLS decide después qué filas)
revoke all on all tables in schema public from anon;
revoke all on public.staff from anon, authenticated;
revoke update on public.perfiles from authenticated;
revoke update on public.tickets  from authenticated;
revoke update on public.leads    from authenticated;
grant insert on public.leads to anon;
grant select on public.keepalive to anon;
grant update (nombre, negocio, telefono) on public.perfiles to authenticated;   -- el email no se cambia desde la web
grant update (estado, respuesta)         on public.tickets  to authenticated;   -- solo el equipo (lo exige RLS)
grant update (estado, notas)             on public.leads    to authenticated;   -- solo el equipo (lo exige RLS)

-- PERFILES
drop policy if exists "perfil: ver el mío"        on public.perfiles;
drop policy if exists "perfil: equipo ve todos"   on public.perfiles;
drop policy if exists "perfil: crear el mío"      on public.perfiles;
drop policy if exists "perfil: editar el mío"     on public.perfiles;
create policy "perfil: ver el mío"      on public.perfiles for select to authenticated using (user_id = auth.uid());
create policy "perfil: equipo ve todos" on public.perfiles for select to authenticated using (public.es_staff());
create policy "perfil: crear el mío"    on public.perfiles for insert to authenticated
  with check (user_id = auth.uid() and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "perfil: editar el mío"   on public.perfiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- LEADS: la web (anónima) solo puede INSERTAR; si hay sesión, el lead queda ligado a su cuenta
drop policy if exists "web inserta leads"   on public.leads;
drop policy if exists "lead: ver los míos"  on public.leads;
drop policy if exists "lead: equipo ve"     on public.leads;
drop policy if exists "lead: equipo edita"  on public.leads;
create policy "web inserta leads" on public.leads for insert to anon, authenticated
  with check (estado = 'nuevo' and notas is null and (user_id is null or user_id = auth.uid()));
create policy "lead: ver los míos" on public.leads for select to authenticated using (user_id = auth.uid());
create policy "lead: equipo ve"    on public.leads for select to authenticated using (public.es_staff());
create policy "lead: equipo edita" on public.leads for update to authenticated
  using (public.es_staff()) with check (public.es_staff());

-- CLIENTES: cada uno ve la suya; el equipo ve todas; solo el admin crea/edita/borra
drop policy if exists "ver mi ficha"           on public.clientes;
drop policy if exists "cliente: equipo ve"     on public.clientes;
drop policy if exists "cliente: admin escribe" on public.clientes;
create policy "ver mi ficha"           on public.clientes for select to authenticated using (user_id = auth.uid());
create policy "cliente: equipo ve"     on public.clientes for select to authenticated using (public.es_staff());
create policy "cliente: admin escribe" on public.clientes for all    to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- AUTOMATIZACIONES / MÉTRICAS / INFORMES: cada cliente ve lo suyo; el equipo lo ve y lo gestiona todo
drop policy if exists "ver mis automatizaciones"    on public.automatizaciones;
drop policy if exists "automatizaciones: equipo"    on public.automatizaciones;
create policy "ver mis automatizaciones" on public.automatizaciones for select to authenticated using (cliente_id = public.mi_cliente_id());
create policy "automatizaciones: equipo" on public.automatizaciones for all to authenticated
  using (public.es_staff()) with check (public.es_staff());

drop policy if exists "ver mis metricas"  on public.metricas;
drop policy if exists "metricas: equipo"  on public.metricas;
create policy "ver mis metricas" on public.metricas for select to authenticated using (cliente_id = public.mi_cliente_id());
create policy "metricas: equipo" on public.metricas for all to authenticated
  using (public.es_staff()) with check (public.es_staff());

drop policy if exists "ver mis informes"  on public.informes;
drop policy if exists "informes: equipo"  on public.informes;
create policy "ver mis informes" on public.informes for select to authenticated using (cliente_id = public.mi_cliente_id());
create policy "informes: equipo" on public.informes for all to authenticated
  using (public.es_staff()) with check (public.es_staff());

-- TICKETS: el cliente crea y ve los suyos (siempre "abierto" y sin respuesta); el equipo ve todos y responde
drop policy if exists "mis tickets"          on public.tickets;
drop policy if exists "ver mis tickets"      on public.tickets;
drop policy if exists "ticket: crear el mío" on public.tickets;
drop policy if exists "ticket: ver los míos" on public.tickets;
drop policy if exists "ticket: equipo ve"    on public.tickets;
drop policy if exists "ticket: equipo edita" on public.tickets;
create policy "ticket: crear el mío" on public.tickets for insert to authenticated
  with check (user_id = auth.uid() and estado = 'abierto' and respuesta is null);
create policy "ticket: ver los míos" on public.tickets for select to authenticated using (user_id = auth.uid());
create policy "ticket: equipo ve"    on public.tickets for select to authenticated using (public.es_staff());
create policy "ticket: equipo edita" on public.tickets for update to authenticated
  using (public.es_staff()) with check (public.es_staff());

-- KEEPALIVE
drop policy if exists "leer keepalive" on public.keepalive;
create policy "leer keepalive" on public.keepalive for select to anon using (true);

-- Las funciones auxiliares solo las usa la propia web con sesión iniciada
revoke execute on function public.es_staff()     from anon, public;
revoke execute on function public.es_admin()     from anon, public;
revoke execute on function public.mi_cliente_id() from anon, public;
grant  execute on function public.es_staff()     to authenticated;
grant  execute on function public.es_admin()     to authenticated;
grant  execute on function public.mi_cliente_id() to authenticated;

-- ════════════════════════════════════════════════════════════════
--  CUENTAS QUE YA EXISTÍAN antes de esta versión: se les crea su perfil y su ficha de cliente
--  (no toca las fichas que ya estuvieran creadas a mano)
-- ════════════════════════════════════════════════════════════════
insert into public.perfiles (user_id, email, nombre, negocio, telefono)
select u.id, lower(u.email),
       left(nullif(btrim(u.raw_user_meta_data ->> 'nombre'),   ''), 120),
       left(nullif(btrim(u.raw_user_meta_data ->> 'negocio'),  ''), 160),
       left(nullif(btrim(u.raw_user_meta_data ->> 'telefono'), ''), 40)
from auth.users u
where u.email is not null
on conflict (user_id) do nothing;

insert into public.clientes (user_id, negocio, contacto, email)
select u.id,
       coalesce(left(nullif(btrim(u.raw_user_meta_data ->> 'negocio'), ''), 160), 'Sin indicar'),
       left(nullif(btrim(u.raw_user_meta_data ->> 'nombre'), ''), 120),
       lower(u.email)
from auth.users u
where u.email is not null
  and not exists (select 1 from public.staff s where s.email = lower(u.email))
  and not exists (select 1 from public.clientes c where c.user_id = u.id);

-- NOTA: desde la web NUNCA se usa la clave service_role. El Table Editor de Supabase sí la usa
-- (se salta RLS) y es donde, si hace falta, tocáis cosas a mano.
