# CLAUDE.md

## Qué es este proyecto
Web de **TuAgencia** (tuagencia.tech): agencia de automatización con IA para negocios locales de Alcalá de Henares y Madrid. Somos 3 (Pablo, Jorge y Rodrigo). Email: admin@tuagencia.tech.
Estilo Apple (limpio, mucho espacio, color de marca `#6366F1`), SEO local y coste 0 €.

## Stack
- **Astro 7** (sitio estático) + TypeScript
- **Supabase Free** (región UE): formulario de contacto (`leads`) y área de cliente con login por enlace mágico
- **Cloudflare Pages** para publicar (rama conectada → despliegue automático)
- La web antigua (HTML estático en GitHub Pages) sigue viva en `main` hasta que se decida lo contrario

## Dónde se edita cada cosa
| Quiero cambiar… | Archivo |
|---|---|
| Email, WhatsApp, Instagram | `src/data/site.ts` |
| Horario de llamadas (agenda propia en `/reservar`, Google Calendar + Meet) | `src/data/agenda.ts` · `docs/AGENDA.md` |
| Equipo (nombres, roles, formación) | `src/data/site.ts` → `EQUIPO` |
| Preguntas frecuentes | `src/data/site.ts` → `FAQ` |
| Soluciones (una página por cada una) | `src/data/soluciones.ts` |
| Sectores (una página por cada uno) | `src/data/sectores.ts` |
| Precios | `src/data/precios.ts` |
| Datos legales (titular, NIF, domicilio) | `src/data/legal.ts` |
| Caso de la barbería: censurado / con nombre | `src/data/casos.ts` (no editar a mano) |
| Colores y tipografía | `src/styles/global.css` |
| Portada / versión en inglés | `src/pages/index.astro` · `src/pages/en/index.astro` |
| Área de cliente | `src/pages/area-cliente.astro` · `src/scripts/supabase.ts` |
| Tablas y seguridad de la base de datos | `supabase/schema.sql` |
| Redirecciones y cabeceras | `public/_redirects` · `public/_headers` |
| Fotos del equipo | `public/equipo/` (`pablo.webp`, `jorge.webp`, `rodrigo.webp`) |

Los informes `public/informe_*.pdf` y las demos `public/demo*.html` ya se han enviado a clientes: **no cambiar sus nombres ni URLs**.
`public/spaceverona/`, `demo_spaceverona.html` y `demo-spaceverona.html` son demos privadas para un cliente potencial (noindex). `scripts/reputacion_local.py` genera los informes de reputación (necesita una clave de Google Places en la constante `API_KEY`: ponerla solo en local y **nunca subirla** a GitHub; pendiente de pasarla a variable de entorno).

## Comandos
```bash
npm install       # instalar dependencias
npm run dev       # servidor local en http://localhost:4321
npm run build     # compila a dist/ (debe dar 25 páginas sin errores)
npm run preview   # sirve dist/ en local
npm test          # 18 pruebas de la agenda (simulan Google; no hacen falta credenciales)
npm run descensurar / npm run censurar   # caso de la barbería (solo con permiso del cliente)
```

## Reglas
1. **No tocar `main`** ni hacer `merge` a `main` sin permiso explícito. Se trabaja en la rama `web-v2`.
2. **Nunca subir** `.env`, claves de Supabase (jamás la `service_role`), `node_modules/` ni `dist/`. Revisar `git status` antes de cada commit y añadir archivos por ruta, no con `git add -A`.
3. Commits **pequeños, en español y en formato convencional**: `feat:`, `fix:`, `chore:`, `docs:`, `ci:`.
4. No crear cuentas, no cambiar DNS, no activar servicios de pago.
5. Si algo falla o hay una decisión importante, parar y preguntar.
6. Responder siempre en español.
7. **Caso de la barbería:** mientras no haya permiso, no escribir su nombre ni subir fotos sin difuminar. Los originales están en `casos-privados/` (ignorada por Git) y no deben salir de ahí.
8. Credenciales de Google (`GOOGLE_*`) y `TURNSTILE_SECRET`: solo en Cloudflare, nunca en el código ni en GitHub.
9. No poner "SL" en los datos legales mientras la sociedad no esté constituida.
