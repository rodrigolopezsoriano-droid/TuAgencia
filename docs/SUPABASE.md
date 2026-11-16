# Base de datos y cuentas (Supabase)

Aquí se guardan: las **cuentas** (clientes y equipo), los **perfiles** que autocompletan formularios, las **solicitudes** que envían los clientes, los **contactos** del formulario y los datos del **panel de cada cliente** (automatizaciones, métricas e informes).

Todo está en un solo archivo: [`supabase/schema.sql`](../supabase/schema.sql). Se puede ejecutar varias veces sin borrar datos.

## Quién puede qué

| Quién | Qué puede hacer |
|---|---|
| Visitante sin cuenta | Solo **enviar** el formulario de contacto. No puede leer nada. |
| Cliente registrado | Ver y editar **sus** datos, ver y crear **sus** solicitudes, ver **su** panel. Nada de los demás. |
| Equipo (`pablo@`, `jorge@`, `rodrigo@`) | Ver todo; responder solicitudes, gestionar contactos, automatizaciones, métricas e informes. |
| Admin (`admin@`) | Lo del equipo + dar de alta clientes y cambiar planes. |

**Importante:** el rol de equipo/admin se decide por el **email verificado** de la lista `staff`, nunca por lo que alguien escriba al registrarse. Por eso es imprescindible dejar activada la **confirmación de email** (paso 3).

Esto está comprobado con 13 pruebas automáticas contra un PostgreSQL real (`npm test`): un visitante no lee nada, un cliente no ve datos ajenos ni puede cerrarse sus propias solicitudes, un impostor con el email de admin sin verificar no obtiene permisos, etc.

---

## ¿Puede hacerlo Claude, o lo hace tu Claude de escritorio?

- **El código y el SQL ya están hechos** (esta carpeta). Eso no hay que pedírselo a nadie más.
- **Crear el proyecto en Supabase y ejecutar el SQL** necesita entrar en **tu cuenta de Supabase**, y Claude Code no tiene acceso a ella. Lo tiene que hacer una persona (tú, ~15 min con esta guía) **o** un Claude con acceso a tu navegador o a un conector de Supabase.
- Si quieres que lo haga tu Claude de escritorio: solo funciona si tiene el **conector de Supabase** o el control del navegador activado. Pásale el texto del final de esta guía.
- En ambos casos, **las claves se las pones tú**: no las pegues en ningún chat.

---

## Pasos (una sola vez)

### 1. Crear el proyecto
1. Entra en <https://supabase.com> → *New project*.
2. Nombre `tuagencia`, **región de la UE** (la de este proyecto es West EU, Irlanda), y una contraseña de base de datos larga (guárdala en un gestor de contraseñas).

### 2. Crear las tablas y los permisos
*SQL Editor → New query* → pega **todo** `supabase/schema.sql` → *Run*. Debe terminar con «Success».

### 3. Configurar el acceso (*Authentication*)
- **Providers → Email**: *Confirm email* **activado** (obligatorio, ver arriba) y *Minimum password length* = **10**.
- **URL Configuration**:
  - *Site URL*: `https://tuagencia.tech`
  - *Redirect URLs*: `https://tuagencia.tech/area-cliente`, `http://localhost:4321/area-cliente` y la dirección `*.pages.dev` de Cloudflare mientras pruebes.
- **SMTP (correo)** — *Project Settings → Authentication → SMTP Settings*: el correo incluido de Supabase es solo para pruebas (muy pocos correos por hora y, según el plan, solo a miembros del proyecto). Para clientes reales hay que configurar uno propio, por ejemplo **Resend** o **Brevo** (planes gratis). Ponlo para que los correos salgan de `no-reply@tuagencia.tech` (requiere añadir los registros DNS que te indique el proveedor).
- *(Opcional)* **Attack Protection → Captcha**: activa Cloudflare Turnstile para frenar registros de bots.

### 4. Conectar la web
*Project Settings → API*: copia la **Project URL** y la clave **anon public**.
- En local: duplica `.env.example` como `.env` y rellena `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.
- En Cloudflare Pages: las mismas dos variables.
- En GitHub (*Settings → Secrets → Actions*): `SUPABASE_URL` y `SUPABASE_ANON_KEY` para el «ping» que evita que el proyecto gratis se pause.

> ⚠ **Nunca** uses la clave `service_role` en la web ni la subas a GitHub.

### 5. Crear vuestras cuentas (admin y equipo)
1. **Los buzones tienen que existir** para recibir el correo de confirmación: `admin@`, `pablo@`, `jorge@` y `rodrigo@tuagencia.tech`. Gratis: Cloudflare → *Email → Email Routing* → crea esas direcciones y reenvíalas a vuestros correos personales.
2. Cada uno entra en `/area-cliente` → **Registrarse** con su dirección de `tuagencia.tech` → confirma el correo → **Iniciar sesión**.
3. Al entrar verá el **panel de gestión** (no el de cliente). `admin@` verá además el selector de plan en *Clientes*.

Para añadir a otra persona al equipo más adelante: *SQL Editor* →
```sql
insert into public.staff (email, nombre, rol) values ('nueva@tuagencia.tech', 'Nombre Apellido', 'equipo');
```
(el email siempre en minúsculas; tiene que registrarse y confirmar el correo).

### 6. Probarlo
1. Registra una cuenta de prueba con un correo tuyo cualquiera → confirma → inicia sesión → envía una solicitud.
2. Entra como `pablo@` → verás esa solicitud → responde y ciérrala.
3. Vuelve a entrar con la cuenta de prueba → verás la respuesta.
4. Ve a `/contacto` con la sesión iniciada → los datos deberían aparecer ya rellenados.
5. Borra la cuenta de prueba: *Authentication → Users → Delete* (se borran también sus datos).

---

## Día a día

- **Dar de alta a un cliente de pago:** que se registre él mismo; luego el admin le pone el plan en *Clientes*. Vosotros añadís sus automatizaciones, métricas e informes desde *Table Editor* (Supabase) o con n8n.
- **Sumar métricas desde n8n o scripts:** insertar filas en `metricas` (por ejemplo `etiqueta = 'Citas agendadas por el chatbot'`, `valor = 1`, `horas_ahorradas = 0.1`). El panel del cliente lo calcula solo. Usad la clave `service_role` **solo dentro de n8n o de un script vuestro**, nunca en la web.
- **Ver los contactos que llegan:** pestaña *Contactos* del panel de gestión.
- **Borrar los datos de una persona (RGPD):** *Authentication → Users → Delete*; se eliminan su perfil y sus solicitudes.
- **Copias de seguridad:** el plan gratis no incluye restauración a un punto concreto. Haced una exportación periódica (*Database → Backups* o `pg_dump`) y guardadla fuera de Supabase.

---

## Texto para tu Claude de escritorio

> Necesito que prepares un proyecto de Supabase para mi web tuagencia.tech. Hazlo con mi cuenta de Supabase, **sin pegar ninguna clave en este chat** y sin gastar dinero (plan gratis).
>
> 1. Crea un proyecto llamado `tuagencia` en una región de la **Unión Europea**.
> 2. En el *SQL Editor*, ejecuta el contenido completo del archivo `supabase/schema.sql` del repositorio (carpeta `c:\Users\pvmar\Desktop\TuAgencia`). Comprueba que termina sin errores y que existen las tablas `perfiles`, `staff`, `leads`, `clientes`, `automatizaciones`, `metricas`, `informes`, `tickets` y `keepalive`, todas con RLS activado, y que `staff` tiene 4 filas.
> 3. En *Authentication*: deja **Confirm email activado**, pon la longitud mínima de contraseña en **10**, *Site URL* = `https://tuagencia.tech` y añade como *Redirect URLs* `https://tuagencia.tech/area-cliente` y `http://localhost:4321/area-cliente`.
> 4. **No toques** nada más (ni claves, ni el plan, ni facturación) y **no uses la clave service_role** para nada.
> 5. Al terminar, dime solo: la *Project URL*, qué has configurado y qué falta (por ejemplo el SMTP propio, que lo configuro yo). Las claves las copio yo desde *Project Settings → API*.
