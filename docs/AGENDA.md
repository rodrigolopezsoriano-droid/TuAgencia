# Agenda propia: llamadas en tu Google Calendar con Google Meet

Sustituye a Calendly. El cliente entra en **/reservar**, elige un hueco libre y la web:

1. crea el evento en **tu Google Calendar**,
2. le añade un enlace de **Google Meet**,
3. envía la invitación al cliente (le llega por correo y se añade a su calendario).

Los huecos libres se calculan leyendo tu calendario, así que si ya tienes algo apuntado a esa hora, ese hueco no se ofrece. Todo es gratis.

> ⚠ **Estado:** el código está probado con 18 pruebas automáticas (`npm test`) que simulan a Google, y la pantalla se ha probado en un navegador. **No se ha probado todavía contra tu Google real**, porque necesita tus credenciales. Haz la reserva de prueba del paso 5 antes de enseñar la página a nadie.

---

## Qué necesitas hacer tú (una sola vez, ~15 min)

### 1. Crear las credenciales en Google Cloud
1. Entra en <https://console.cloud.google.com> con la cuenta de Google **cuyo calendario quieres usar** y crea un proyecto (por ejemplo, `tuagencia-agenda`).
2. **APIs y servicios → Biblioteca** → busca **Google Calendar API** → *Habilitar*.
3. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo**.
   - Nombre: `TuAgencia`; correo de soporte: el tuyo.
   - Ámbitos (scopes): añade `.../auth/calendar.events` y `.../auth/calendar.freebusy`.
   - Usuarios de prueba: añade tu propio correo de Google.
   - **MUY IMPORTANTE:** al terminar, pulsa **«Publicar aplicación»** (pasar de *Pruebas* a *En producción*). Si la dejas en *Pruebas*, Google **caduca el token a los 7 días** y las reservas dejarían de funcionar. No hace falta pasar la verificación de Google: la app es solo para ti (al autorizar verás un aviso de «aplicación no verificada»; es normal, pulsa *Avanzado → Ir a TuAgencia*).
4. **Credenciales → Crear credenciales → ID de cliente de OAuth** → tipo **Aplicación de escritorio**. Copia el **ID de cliente** y el **Secreto de cliente**.

### 2. Obtener tu token de acceso
En la terminal de VS Code, en la carpeta del proyecto:

```powershell
$env:GOOGLE_CLIENT_ID="pega-aquí-el-id"
$env:GOOGLE_CLIENT_SECRET="pega-aquí-el-secreto"
node scripts/google-refresh-token.mjs
```

Abre el enlace que sale, elige tu cuenta y acepta. En la terminal aparece el **refresh token**. Guárdalo en un sitio seguro: es como una contraseña de tu calendario.

### 3. Ponerlo en Cloudflare Pages
En tu proyecto de Pages → **Settings → Variables and secrets** (entorno *Production*), añade como **Secret**:

| Nombre | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | el ID de cliente |
| `GOOGLE_CLIENT_SECRET` | el secreto de cliente |
| `GOOGLE_REFRESH_TOKEN` | el token del paso 2 |
| `GOOGLE_CALENDAR_ID` | *(opcional)* si no usas el calendario principal; por defecto `primary` |

Haz un nuevo despliegue (Deployments → *Retry deployment*, o cualquier `git push`).

> **Nunca** pongas estos valores en el código ni en GitHub. Solo en Cloudflare.

### 4. Proteger la página de bots (recomendado, gratis)
Cualquiera puede abrir /reservar, así que conviene evitar que un bot llene tu agenda o mande invitaciones a correos ajenos:

- **Cloudflare Turnstile** (captcha gratis, invisible casi siempre): Cloudflare → *Turnstile → Add site*. Copia la **Site key** y la **Secret key**.
  - Variable de **build** `PUBLIC_TURNSTILE_SITEKEY` = la Site key.
  - Secret `TURNSTILE_SECRET` = la Secret key.
  - Si no pones `TURNSTILE_SECRET`, el captcha queda desactivado.
- **Regla de límite de peticiones** (el plan gratis incluye una): *Security → WAF → Rate limiting rules* → ruta `/api/reservar`, máximo 5 peticiones por 10 minutos por IP.

### 5. Probarlo de verdad
1. Abre `https://tu-proyecto.pages.dev/reservar` (o tuagencia.tech cuando esté).
2. Reserva un hueco con **otro correo tuyo** (no el de la cuenta de Google).
3. Comprueba que: aparece el evento en tu Google Calendar con enlace de Meet, y que te llega la invitación al otro correo.
4. Vuelve a /reservar: ese hueco ya no debe aparecer.

---

## Cómo cambiar tu disponibilidad
Edita `src/data/agenda.ts`: días, franjas horarias, duración de la llamada (30 min), antelación mínima (12 h) y cuántos días se ofrecen (30). El horario que viene es de ejemplo (lunes a viernes, 10–14 h y 16–19 h): **ajústalo al vuestro**.

- Para bloquear un día o una hora, **crea un evento en tu Google Calendar**: el hueco desaparece solo.
- Un evento marcado como «Disponible» (no «Ocupado») no bloquea.
- Para cancelar o mover una llamada, hazlo desde Google Calendar: el cliente recibe el aviso.

## Si algo falla
| Síntoma | Causa probable |
|---|---|
| /reservar dice «El calendario se está configurando» | Faltan variables en Cloudflare o no se ha redesplegado |
| «Ahora mismo no podemos mostrar los huecos» | El token ha caducado o se revocó (¿dejaste la app en *Pruebas*? repite los pasos 1.3 y 2) |
| En local (`npm run dev`) sale un aviso | Normal: las funciones solo corren en Cloudflare. Para probar en local: `npx wrangler pages dev dist` con un archivo `.dev.vars` con las mismas variables |
| La reserva se hace pero no llega Meet | Revisa que la cuenta tiene Google Meet activo (cuentas de Workspace pueden restringirlo) |

## Comandos
```bash
npm test      # 18 pruebas de la lógica de huecos y de las reservas (no usa Google)
```

## Cómo funciona por dentro
- `src/pages/reservar.astro`: la página que ve el cliente.
- `functions/api/disponibilidad.ts` y `functions/api/reservar.ts`: las dos funciones de Cloudflare.
- `functions/_lib/`: cálculo de huecos y cliente de Google Calendar.
- La reserva se vuelve a validar en el servidor (hueco libre, dentro de horario, datos correctos) y se comprueba el calendario justo antes de crear el evento. No se guarda nada en ninguna otra base de datos: **tu Google Calendar es la fuente de verdad**.
