# Pruebas del panel del área de cliente (navegador real + Supabase simulado)

`panel.py` abre el área de cliente en un navegador (Playwright) contra `supabase_simulado.py`, que imita
la autenticación y las tablas de Supabase **con las mismas reglas de acceso** que `supabase/schema.sql`
(cliente / equipo / admin). Comprueba el acceso, el menú, cerrar sesión, cambiar de cuenta, las vistas de
los tres roles, el móvil y el funcionamiento con una base de datos sin actualizar. No toca la base real.

```bash
pip install playwright pillow && playwright install chromium
# terminal 1 (apunta la web a la base simulada):
PUBLIC_SUPABASE_URL=https://mock.supabase.co PUBLIC_SUPABASE_ANON_KEY=sb_publishable_mock npx astro dev --port 4323
# terminal 2 (la carpeta de capturas se crea sola):
mkdir -p capturas/shots && python tests/e2e/panel.py capturas
```
No forman parte de `npm test` (necesitan Python y un navegador). Las pruebas de seguridad de la base de datos
(`tests/rls.test.ts`) sí corren en `npm test` contra un PostgreSQL real en memoria.
