-- ════════════════════════════════════════════════════════════════
--  TuAgencia · Base de datos (Supabase / PostgreSQL)
--  Pega este archivo entero en Supabase > SQL Editor > New query > Run
-- ════════════════════════════════════════════════════════════════

-- 1) LEADS: lo que llega desde el formulario de contacto de la web
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

-- 2) CLIENTES: una fila por negocio, enlazada a la cuenta de acceso (auth.users)
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

-- 3) AUTOMATIZACIONES contratadas por cada cliente
create table if not exists public.automatizaciones (
  id         bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes(id) on delete cascade,
  nombre     text not null,
  activa     boolean not null default true,
  creado     timestamptz not null default now()
);

-- 4) MÉTRICAS: lo que va sumando cada automatización (n8n o vuestros scripts insertan aquí)
create table if not exists public.metricas (
  id               bigint generated always as identity primary key,
  cliente_id       bigint not null references public.clientes(id) on delete cascade,
  fecha            date not null default current_date,
  etiqueta         text,             -- p. ej. 'Citas agendadas por el chatbot'
  valor            numeric not null default 0,
  horas_ahorradas  numeric(6,2) not null default 0
);
create index if not exists metricas_cliente_fecha on public.metricas (cliente_id, fecha);

-- 5) INFORMES descargables (PDF en Supabase Storage o cualquier URL)
create table if not exists public.informes (
  id         bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes(id) on delete cascade,
  titulo     text not null,
  url        text not null,
  creado     timestamptz not null default now()
);

-- 6) TICKETS de soporte enviados desde el área de cliente
create table if not exists public.tickets (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  mensaje  text not null check (char_length(mensaje) between 1 and 3000),
  estado   text not null default 'abierto' check (estado in ('abierto','en curso','cerrado')),
  creado   timestamptz not null default now()
);

-- ── Seguridad: Row Level Security ──────────────────────────────
alter table public.leads            enable row level security;
alter table public.clientes         enable row level security;
alter table public.automatizaciones enable row level security;
alter table public.metricas         enable row level security;
alter table public.informes         enable row level security;
alter table public.tickets          enable row level security;

-- La web (anónima) solo puede INSERTAR leads; nadie puede leerlos desde la web.
drop policy if exists "web inserta leads" on public.leads;
create policy "web inserta leads" on public.leads
  for insert to anon, authenticated with check (estado = 'nuevo' and notas is null);

-- Función auxiliar: id del cliente del usuario que ha iniciado sesión
create or replace function public.mi_cliente_id() returns bigint
language sql stable security definer set search_path = public as $$
  select id from public.clientes where user_id = auth.uid()
$$;

-- Cada cliente solo ve SUS datos
drop policy if exists "ver mi ficha" on public.clientes;
create policy "ver mi ficha" on public.clientes for select to authenticated using (user_id = auth.uid());

drop policy if exists "ver mis automatizaciones" on public.automatizaciones;
create policy "ver mis automatizaciones" on public.automatizaciones for select to authenticated using (cliente_id = public.mi_cliente_id());

drop policy if exists "ver mis metricas" on public.metricas;
create policy "ver mis metricas" on public.metricas for select to authenticated using (cliente_id = public.mi_cliente_id());

drop policy if exists "ver mis informes" on public.informes;
create policy "ver mis informes" on public.informes for select to authenticated using (cliente_id = public.mi_cliente_id());

drop policy if exists "mis tickets" on public.tickets;
create policy "mis tickets" on public.tickets for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "ver mis tickets" on public.tickets;
create policy "ver mis tickets" on public.tickets for select to authenticated using (user_id = auth.uid());

-- Vosotros (admin) gestionáis todo desde el panel de Supabase (Table Editor),
-- que usa la clave service_role y se salta RLS. NUNCA pongáis esa clave en la web.

-- ── Tabla para el "ping" que evita que el proyecto gratis se pause ──
create table if not exists public.keepalive (id int primary key default 1, ultimo timestamptz);
insert into public.keepalive (id, ultimo) values (1, now()) on conflict (id) do nothing;
alter table public.keepalive enable row level security;
drop policy if exists "leer keepalive" on public.keepalive;
create policy "leer keepalive" on public.keepalive for select to anon using (true);
