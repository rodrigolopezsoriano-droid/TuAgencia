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
| Email, WhatsApp, Instagram, enlace de Calendly | `src/data/site.ts` |
| Equipo (nombres, roles, formación) | `src/data/site.ts` → `EQUIPO` |
| Preguntas frecuentes | `src/data/site.ts` → `FAQ` |
| Soluciones (se crea una página por cada una) | `src/data/soluciones.ts` |
| Sectores (se crea una página por cada uno) | `src/data/sectores.ts` |
| Precios | `src/data/precios.ts` |
| Datos legales (**⚠ PENDIENTE**) | `src/data/legal.ts` |
| Colores y tipografía | `src/styles/global.css` (variables `--brand`, `--ink`…) |
| Página de inicio | `src/pages/index.astro` |
| Versión en inglés | `src/pages/en/index.astro` |

**Añadir un sector nuevo** (por ejemplo, talleres): copia un bloque en `sectores.ts`, cambia el `slug` y los textos, guarda. La página `/sectores/talleres` se crea sola, con su SEO y en el sitemap.

**Fotos del equipo:** pon `pablo.webp`, `jorge.webp` y `rodrigo.webp` en `public/equipo/` y sigue el comentario que hay en `src/pages/equipo.astro`.

---

## 3. Conectar Supabase (base de datos + login)

1. Crea una cuenta en **supabase.com** → *New project*. En región elige **Central EU (Frankfurt)**.
2. Ve a **SQL Editor → New query**, pega todo `supabase/schema.sql` y pulsa **Run**. Esto crea las tablas:
   `leads`, `clientes`, `automatizaciones`, `metricas`, `informes`, `tickets`, con seguridad por filas (cada cliente solo ve lo suyo).
3. Ve a **Project Settings → API** y copia la *Project URL* y la clave **anon public**.
4. En VS Code, duplica `.env.example`, llámalo `.env` y pega los dos valores.
5. En **Authentication → URL Configuration**, pon como *Site URL* `https://tuagencia.tech` y añade `http://localhost:4321/area-cliente` en *Redirect URLs*.

⚠️ **Nunca** pongáis la clave `service_role` en la web ni la subáis a GitHub.

### Ver los contactos que llegan
Supabase → **Table Editor → leads**. También podéis conectar n8n a esa tabla para recibir un aviso por Telegram o WhatsApp con cada lead nuevo.

### Dar de alta a un cliente en el área de cliente
1. **Authentication → Users → Add user → Send invitation** con su email.
2. **Table Editor → clientes → Insert row**: negocio, contacto, `user_id` (el id del usuario del paso 1), plan y `coste_hora`.
3. Añade sus filas en `automatizaciones`. Vuestros scripts o n8n van sumando filas en `metricas` (por ejemplo, `etiqueta = 'Citas agendadas por el chatbot'`, `valor = 1`, `horas_ahorradas = 0.1`) y el panel lo calcula solo.
4. El cliente entra en `/area-cliente` con su email y recibe un enlace de acceso. Sin contraseñas.

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

- [ ] `src/data/legal.ts`: titular, NIF y domicilio reales. No uséis "SL" si la sociedad no está constituida.
- [ ] `src/data/site.ts`: número de WhatsApp Business y enlace de Calendly o Cal.com, cuando los tengáis.
- [ ] Apellidos y fotos del equipo.
- [ ] Permiso de la barbería para nombrarla en el caso de éxito (de momento sale anónima).
- [ ] Revisar los precios de `src/data/precios.ts`.
