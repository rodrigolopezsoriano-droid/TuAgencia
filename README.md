# TuAgencia · Web v2

Web nueva de **tuagencia.tech** hecha con **Astro**. Todo es gratis: VS Code + GitHub + Cloudflare Pages + Supabase.

| Pieza | Herramienta | Coste |
|---|---|---|
| Código | VS Code + Astro | 0 € |
| Repositorio | GitHub | 0 € |
| Hosting | Cloudflare Pages (permite uso comercial gratis) | 0 € |
| Base de datos y login | Supabase Free (región UE) | 0 € |

---

## 1. Arrancar en tu PC (5 minutos)

1. Instala **Node.js 22 LTS** desde nodejs.org.
2. Abre esta carpeta en **VS Code**. Acepta instalar la extensión recomendada de Astro.
3. Abre la terminal de VS Code (`Ctrl + ñ`) y ejecuta:

```bash
npm install
npm run dev
```

4. Abre **http://localhost:4321**. Cada vez que guardes un archivo, la web se recarga sola.

Sin Supabase configurado, la web funciona igual: el formulario abre el correo y el área de cliente muestra un **panel de ejemplo**.

---

## 2. Dónde se cambia cada cosa

| Quiero cambiar… | Archivo |
|---|---|
| Email, WhatsApp, Instagram | `src/data/site.ts` |
| Horario de las llamadas (agenda propia) | `src/data/agenda.ts` · guía en `docs/AGENDA.md` |
| Mostrar nombre e imágenes de un caso (con permiso) | `npm run descensurar -- barberia` o `-- moda` (ver `src/data/casos.ts`) |
| Equipo (nombres, roles, formación) | `src/data/site.ts` → `EQUIPO` |
| Preguntas frecuentes | `src/data/site.ts` → `FAQ` |
| Soluciones (se crea una página por cada una) | `src/data/soluciones.ts` |
| Sectores (se crea una página por cada uno) | `src/data/sectores.ts` |
| Precios | `src/data/precios.ts` |
| Datos legales | `src/data/legal.ts` |
| Colores y tipografía | `src/styles/global.css` (variables `--brand`, `--ink`…) |
| Página de inicio | `src/pages/index.astro` |
| Versión en inglés | `src/pages/en/index.astro` |

**Añadir un sector nuevo** (por ejemplo, talleres): copia un bloque en `sectores.ts`, cambia el `slug` y los textos, guarda. La página `/sectores/talleres` se crea sola, con su SEO y en el sitemap.

**Fotos del equipo:** pon `pablo.webp`, `jorge.webp` y `rodrigo.webp` en `public/equipo/` y sigue el comentario que hay en `src/pages/equipo.astro`.

---

## 3. Conectar Supabase (cuentas + base de datos)

La guía completa, paso a paso, está en **[docs/SUPABASE.md](docs/SUPABASE.md)** (incluye el texto para pasárselo a tu Claude de escritorio). En resumen:

1. Crear el proyecto en Supabase (región Frankfurt) y ejecutar `supabase/schema.sql`.
2. En *Authentication*: confirmación de email **activada**, contraseña mínima de 10 y las URLs de la web. Configurar un SMTP propio para que lleguen los correos a los clientes.
3. Poner `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` en `.env` y en Cloudflare.
4. Registrar `admin@`, `pablo@`, `jorge@` y `rodrigo@tuagencia.tech` desde `/area-cliente` (necesitan buzón para confirmar el correo): ven el panel de gestión.

En `/area-cliente` cada persona puede **iniciar sesión** o **registrarse**. Un cliente ve sus solicitudes, su panel y sus datos (que luego autocompletan los formularios); el equipo ve todas las solicitudes y contactos; el admin además cambia los planes.

⚠️ **Nunca** pongáis la clave `service_role` en la web ni la subáis a GitHub.

### Evitar que Supabase pause el proyecto
Los proyectos gratis se pausan tras 7 días sin actividad. Ya está incluido `.github/workflows/supabase-keepalive.yml`, que hace un "ping" cada 3 días. Solo tenéis que añadir en GitHub → **Settings → Secrets and variables → Actions** los secretos `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

---

## 4. Publicar gratis en Cloudflare Pages

> GitHub Pages no está pensado para alojar negocios, y el plan gratis de Vercel no permite uso comercial. Cloudflare Pages sí.

1. Sube este proyecto a GitHub (recomendado: una rama nueva `web-v2` en el repo actual, para no romper la web que está publicada hasta que la nueva esté lista).
2. Entra en **dash.cloudflare.com** → **Workers & Pages → Create → Pages → Connect to Git** y elige el repo.
3. Configuración de build:
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Variables de entorno: `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`, y además `NODE_VERSION = 22`
4. Pulsa **Save and Deploy**. Te da una URL `*.pages.dev` para probar.
5. Cuando os guste: **Custom domains → tuagencia.tech**. Cloudflare os guía para cambiar los DNS del dominio. Después, borrad el archivo `CNAME` y desactivad GitHub Pages en el repo antiguo.

A partir de ahí: **guardar en VS Code → `git push` → la web se publica sola en unos 30 segundos.**

El archivo `public/_redirects` ya redirige las URLs antiguas (`contactanos.html`, `avisolegal.html`…) a las nuevas para no perder posicionamiento.

---

## 5. SEO incluido

- Title, description, Open Graph e imagen para compartir (`public/og.png`) en cada página.
- Datos estructurados schema.org: empresa (ProfessionalService), servicios y preguntas frecuentes.
- `sitemap-index.xml` automático, `robots.txt` y `llms.txt` (resumen para ChatGPT, Gemini y Perplexity).
- Una página por solución y por sector, que es lo que más ayuda a salir en búsquedas locales.
- Etiquetas `hreflang` para español e inglés.

**Después de publicar:**
1. Dad de alta la web en **Google Search Console** y enviad `https://tuagencia.tech/sitemap-index.xml`.
2. Cread la ficha de **Google Business Profile** como *negocio de área de servicio* (sin mostrar la dirección de casa), con zona Alcalá de Henares y Madrid.
3. Pedid una reseña en Google a cada cliente.

---

## 6. Pendientes antes de publicar

- [ ] **Base de datos y cuentas**: crear el proyecto de Supabase y las 4 cuentas de equipo/admin. Guía: `docs/SUPABASE.md`.
- [ ] **Buzones** `admin@`, `pablo@`, `jorge@`, `rodrigo@tuagencia.tech` (gratis con Cloudflare Email Routing) para poder confirmar las cuentas.
- [ ] **Agenda de llamadas** (`/reservar`): crear las credenciales de Google y ponerlas en Cloudflare. Sin esto, la página avisa de que el calendario se está configurando. Guía paso a paso: `docs/AGENDA.md`.
- [ ] Revisar el horario de partida de `src/data/agenda.ts` (lunes a viernes, 10–14 h y 16–19 h).
- [ ] `src/data/legal.ts`: falta el número de portal y el código postal del domicilio.
- [ ] `src/data/site.ts`: número de WhatsApp Business.
- [ ] Fotos del equipo en `public/equipo/`.
- [ ] Permiso del cliente de la barbería: mientras tanto el caso sale anónimo y con fotos difuminadas. Cuando lo den: `npm run descensurar -- barberia`. Igual con la marca de moda: `-- moda`.
- [ ] Revisar los precios de `src/data/precios.ts`.
