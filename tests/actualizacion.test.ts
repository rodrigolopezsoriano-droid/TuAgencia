// Comprueba que supabase/schema.sql se puede ejecutar ENCIMA de la versión anterior (v1) que ya
// está creada en Supabase, sin perder datos ni romper nada. Ejecutar con: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const V1 = readFileSync(new URL('./fixtures/schema-v1.sql', import.meta.url), 'utf8');
const V2 = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const q = async (db: PGlite, sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows as any[];

test('actualizar de v1 a v2 conserva los datos y crea el perfil de las cuentas que ya existían', async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb, last_sign_in_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
    grant usage on schema public, auth to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
  `);

  // Estado real actual: esquema v1 + cuentas y datos que ya hubiera
  await db.exec(V1);
  await db.exec(`
    insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
      ('00000000-0000-0000-0000-0000000000a1', 'Vieja@Cliente.es', now(), '{"nombre":"Vieja","negocio":"Taller Vieja"}'),
      ('00000000-0000-0000-0000-0000000000a2', 'manual@cliente.es', now(), '{}'),
      ('00000000-0000-0000-0000-0000000000a3', 'pablo@tuagencia.tech', now(), '{"nombre":"Pablo"}');
    insert into public.clientes (user_id, negocio, contacto, email, plan, coste_hora)
      values ('00000000-0000-0000-0000-0000000000a2', 'Negocio creado a mano', 'Contacto manual', 'manual@cliente.es', 'Esencial', 22);
    insert into public.automatizaciones (cliente_id, nombre) select id, 'Chatbot' from public.clientes;
    insert into public.leads (nombre, email, mensaje) values ('Lead antiguo', 'l@x.com', 'hola');
    insert into public.tickets (user_id, mensaje) values ('00000000-0000-0000-0000-0000000000a2', 'ticket antiguo');
  `);

  await db.exec(V2); // ← la actualización
  await db.exec(V2); // y se puede repetir

  // Los datos antiguos siguen ahí, con los valores nuevos por defecto
  assert.equal((await q(db, `select count(*)::int n from public.leads where nombre = 'Lead antiguo'`))[0].n, 1);
  const t = (await q(db, `select tipo, estado, respuesta from public.tickets`))[0];
  assert.deepEqual(t, { tipo: 'otro', estado: 'abierto', respuesta: null });
  assert.equal((await q(db, `select count(*)::int n from public.automatizaciones`))[0].n, 1);

  // La ficha creada a mano no se toca ni se duplica
  const manual = await q(db, `select negocio, plan, coste_hora::float c from public.clientes where user_id = '00000000-0000-0000-0000-0000000000a2'`);
  assert.equal(manual.length, 1);
  assert.deepEqual(manual[0], { negocio: 'Negocio creado a mano', plan: 'Esencial', c: 22 });

  // Las cuentas que ya existían reciben perfil (y ficha de cliente si no son del equipo)
  const perfiles = await q(db, `select email, nombre, negocio from public.perfiles order by email`);
  assert.deepEqual(perfiles.map((p) => p.email), ['manual@cliente.es', 'pablo@tuagencia.tech', 'vieja@cliente.es']);
  assert.equal(perfiles.find((p) => p.email === 'vieja@cliente.es')!.negocio, 'Taller Vieja');
  assert.equal((await q(db, `select count(*)::int n from public.clientes where user_id = '00000000-0000-0000-0000-0000000000a1'`))[0].n, 1);
  assert.equal((await q(db, `select count(*)::int n from public.clientes where user_id = '00000000-0000-0000-0000-0000000000a3'`))[0].n, 0); // equipo: sin ficha de cliente
  assert.equal((await q(db, `select count(*)::int n from public.staff`))[0].n, 4);
});
