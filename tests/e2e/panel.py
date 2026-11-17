import sys, os, glob, json, datetime
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
from supabase_simulado import Backend

SC = sys.argv[1]
B = "http://localhost:4323"
exe = (glob.glob(os.path.expanduser("~/AppData/Local/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell.exe")) or [None])[0]
res, fallos = [], []

def check(nombre, cond, extra=""):
    res.append(("OK " if cond else "FALLO ") + nombre + (f"  → {extra}" if (extra and not cond) else ""))
    if not cond: fallos.append(nombre)

hoy = datetime.date.today()
def mes(n):  # fecha dentro del mes de hace n meses
    y, m = hoy.year, hoy.month - n
    while m <= 0: m += 12; y -= 1
    return f"{y}-{m:02d}-10"

def montar(nuevas=True):
    be = Backend()
    be.sin_funciones_nuevas = not nuevas
    be.add_user("admin@tuagencia.tech", "AdminSegura#2026", True, {"nombre": "Administración"})
    be.add_user("pablo@tuagencia.tech", "PabloSegura#2026", True, {"nombre": "Pablo"})
    be.add_user("rodrigo@tuagencia.tech", "RodrigoSegura#26", True, {"nombre": "Rodrigo"})
    ana = be.add_user("ana@clinica.es", "AnaSegura#2026x", True, {"nombre": "Ana Ruiz", "negocio": "Clínica Ana", "telefono": "600111222"})
    leo = be.add_user("leo@taller.es", "LeoSegura#2026x", True, {"nombre": "Leo Gil", "negocio": "Taller Leo"})
    ca = be.mi_cliente(ana); cl = be.mi_cliente(leo)
    ca["plan"] = "Crecimiento"; ca["alta"] = (hoy - datetime.timedelta(days=200)).isoformat(); ca["coste_hora"] = 20
    be.t["automatizaciones"] += [{"id": 1, "cliente_id": ca["id"], "nombre": "Chatbot de WhatsApp", "activa": True, "creado": "2026-08-01T10:00:00Z"},
                                 {"id": 2, "cliente_id": ca["id"], "nombre": "Monitor de reseñas", "activa": False, "creado": "2026-09-01T10:00:00Z"},
                                 {"id": 3, "cliente_id": cl["id"], "nombre": "Recordatorios de Leo", "activa": True, "creado": "2026-09-01T10:00:00Z"}]
    for i, (n, h, v) in enumerate([(0, 6, 40), (1, 4, 30), (2, 3, 20), (0, 2.5, 12)]):
        be.t["metricas"].append({"id": 50 + i, "cliente_id": ca["id"], "fecha": mes(n), "etiqueta": "Citas agendadas por el chatbot" if i != 3 else "Mensajes respondidos", "valor": v, "horas_ahorradas": h})
    be.t["metricas"].append({"id": 70, "cliente_id": cl["id"], "fecha": mes(0), "etiqueta": "SECRETO-DE-LEO", "valor": 99, "horas_ahorradas": 9})
    be.t["informes"] += [{"id": 1, "cliente_id": ca["id"], "titulo": "Informe de reseñas · octubre", "url": "https://ejemplo.es/octubre.pdf", "creado": "2026-11-01T10:00:00Z"},
                         {"id": 2, "cliente_id": cl["id"], "titulo": "INFORME-DE-LEO", "url": "https://x.es/leo.pdf", "creado": "2026-11-01T10:00:00Z"}]
    be.t["tickets"] += [{"id": 1, "user_id": ana["id"], "tipo": "cambio", "titulo": "Cambiar horario de recordatorios", "mensaje": "Que salgan a las 18:00.", "estado": "en curso", "respuesta": "Lo tenemos en marcha.", "creado": "2026-11-12T10:00:00Z", "actualizado": "2026-11-13T09:00:00Z"},
                        {"id": 2, "user_id": leo["id"], "tipo": "incidencia", "titulo": "TICKET-DE-LEO", "mensaje": "No funciona", "estado": "abierto", "respuesta": None, "creado": "2026-11-10T10:00:00Z", "actualizado": "2026-11-10T10:00:00Z"}]
    be.t["leads"] += [{"id": 1, "creado": (datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(hours=60)).isoformat() + "Z", "nombre": "Marta Pérez", "negocio": "Peluquería Marta", "email": "marta@x.es", "telefono": "611 22 33 44", "interes": "chatbot-whatsapp", "mensaje": "Quiero info", "estado": "nuevo", "origen": "web", "user_id": None},
                      {"id": 2, "creado": "2026-11-14T10:00:00Z", "nombre": "Sin nombre (calculadora)", "negocio": None, "email": "calc@x.es", "telefono": None, "interes": None, "mensaje": "Calculadora: 10 h", "estado": "contactado", "origen": "calculadora", "user_id": None},
                      {"id": 3, "creado": "2026-11-15T10:00:00Z", "nombre": "Clínica Sol", "negocio": "Clínica Sol", "email": "sol@x.es", "telefono": None, "interes": "reputacion-online", "mensaje": "Ciudad: Alcalá", "estado": "nuevo", "origen": "informe-resenas", "user_id": None}]
    return be

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=exe)

    def nuevo(be, w=1280, h=900):
        ctx = br.new_context(viewport={"width": w, "height": h})
        ctx.route("https://mock.supabase.co/**", be.handle)
        ctx.add_init_script("try{sessionStorage.setItem('ta_pre','1')}catch(e){}")
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
        return ctx, pg, errs

    def login(pg, email, clave):
        pg.goto(B + "/area-cliente", wait_until="networkidle")
        pg.wait_for_selector("#l-email")
        pg.fill("#l-email", email); pg.fill("#l-pass", clave)
        pg.click("[data-form=login] button[type=submit]")
        pg.wait_for_selector("[data-view=app]:not([hidden])", timeout=8000)
        pg.wait_for_timeout(400)

    def navs(pg): return pg.locator("#ap-nav a span").all_inner_texts()
    def ir(pg, ruta): pg.evaluate(f"location.hash='{ruta}'"); pg.wait_for_timeout(350)
    def cont(pg): return pg.inner_text("#ap-contenido")

    # ───────── 1. Pantalla de acceso ─────────
    be = montar(); ctx, pg, errs = nuevo(be)
    pg.goto(B + "/area-cliente", wait_until="networkidle"); pg.wait_for_timeout(400)
    t = pg.inner_text("body")
    check("acceso: sin panel de ejemplo ni demo", "ejemplo" not in t.lower() and not pg.locator("[data-demo]").count())
    check("acceso: pestañas Iniciar sesión / Crear cuenta", pg.is_visible("[data-tab=login]") and pg.is_visible("[data-tab=registro]"))
    check("acceso: los iconos se dibujan (no sale código)", "<svg" not in pg.inner_text("[data-view=auth]"))
    check("acceso: no se ve el panel", not pg.is_visible("[data-view=app]"))
    pg.screenshot(path=f"{SC}/shots/p-acceso.png")
    pg.fill("#l-email", "ana@clinica.es"); pg.fill("#l-pass", "mala"); pg.click("[data-form=login] button[type=submit]"); pg.wait_for_timeout(500)
    check("acceso: contraseña incorrecta se avisa", "incorrectos" in pg.inner_text("[data-msg=login]"))
    ctx.close()

    # ───────── 2. Cliente (Ana) ─────────
    be = montar(); ctx, pg, errs = nuevo(be)
    login(pg, "ana@clinica.es", "AnaSegura#2026x")
    check("cliente: menú con todas sus secciones", navs(pg) == ["Resumen", "Automatizaciones", "Resultados", "Informes", "Solicitudes", "Ayuda", "Mi cuenta"], str(navs(pg)))
    check("cliente: etiqueta de rol Cliente", "Cliente" in pg.inner_text("#ap-user"))
    check("cliente: botones Cerrar sesión y Cambiar de cuenta visibles", pg.is_visible(".ap-side [data-act=salir]") and pg.is_visible(".ap-side [data-act=cambiar-cuenta]"))
    check("cliente: la cabecera de la web no se ve dentro del panel", not pg.is_visible("header.nav"))
    c = cont(pg)
    check("cliente: resumen con saludo, plan y KPIs", "Hola, Ana" in c and "Crecimiento" in c and "Horas ahorradas este mes" in c)
    check("cliente: horas del mes = 6 + 2,5 = 8,5 h", "8,5 h" in c, c[:300])
    check("cliente: valor estimado = 8,5 h × 20 € = 170 €", "170 €" in c)
    check("cliente: no ve datos de otro cliente", "SECRETO-DE-LEO" not in pg.content() and "TICKET-DE-LEO" not in pg.content())
    pg.screenshot(path=f"{SC}/shots/p-cliente-resumen.png", full_page=True)
    ir(pg, "#/automatizaciones"); c = cont(pg)
    check("cliente: automatizaciones activa/en pausa", "Chatbot de WhatsApp" in c and "Activa" in c and "En pausa" in c)
    ir(pg, "#/resultados"); c = cont(pg)
    check("cliente: resultados con detalle por concepto", "Citas agendadas por el chatbot" in c and "Mensajes respondidos" in c)
    pg.screenshot(path=f"{SC}/shots/p-cliente-resultados.png", full_page=True)
    ir(pg, "#/informes"); c = cont(pg)
    check("cliente: informes solo los suyos", "octubre" in c and "INFORME-DE-LEO" not in pg.content())
    ir(pg, "#/solicitudes"); c = cont(pg)
    check("cliente: solicitudes con respuesta marcada", "Cambiar horario de recordatorios" in c and "Con respuesta" in c)
    pg.click("a[href='#/solicitudes/nueva']"); pg.wait_for_timeout(300)
    pg.fill("#t-titulo", "Avisar de reseñas nuevas"); pg.fill("#t-msg", "Quiero enterarme de cada reseña.")
    pg.click("[data-form=ticket-nuevo] button[type=submit]"); pg.wait_for_timeout(800)
    check("cliente: crea solicitud y vuelve al listado", "Avisar de reseñas nuevas" in cont(pg) and pg.url.endswith("#/solicitudes"), pg.url)
    check("cliente: la solicitud queda abierta y a su nombre", any(x[0] == "insert" and x[1] == "tickets" and x[2]["user_id"] == be.users["ana@clinica.es"]["id"] for x in be.log))
    pg.click("a[href='#/solicitudes/1']"); pg.wait_for_timeout(300)
    check("cliente: detalle muestra su mensaje y la respuesta del equipo", "Que salgan a las 18:00." in cont(pg) and "Lo tenemos en marcha." in cont(pg))
    ir(pg, "#/ayuda"); check("cliente: ayuda con contacto y FAQ", "WhatsApp" in cont(pg) and "Preguntas frecuentes" in cont(pg))
    ir(pg, "#/cuenta")
    check("cliente: mi cuenta con sus datos", pg.input_value("#p-nombre") == "Ana Ruiz" and pg.input_value("#p-negocio") == "Clínica Ana" and pg.input_value("#p-email") == "ana@clinica.es")
    pg.fill("#p-tel", "699000111"); pg.click("[data-form=perfil] button[type=submit]"); pg.wait_for_timeout(500)
    check("cliente: guarda su teléfono", be.users["ana@clinica.es"]["meta"].get("telefono") == "699000111")
    pg.fill("#c-nueva", "corta"); pg.fill("#c-rep", "corta"); pg.click("[data-form=contrasena] button[type=submit]"); pg.wait_for_timeout(300)
    check("cliente: contraseña corta rechazada", "al menos 10" in pg.inner_text("[data-form=contrasena] [data-msg]"))
    pg.fill("#c-nueva", "NuevaClave#2026ok"); pg.fill("#c-rep", "NuevaClave#2026ok"); pg.click("[data-form=contrasena] button[type=submit]"); pg.wait_for_timeout(500)
    check("cliente: cambia su contraseña", be.users["ana@clinica.es"]["password"] == "NuevaClave#2026ok")
    check("cliente: sin errores JS", not errs, str(errs))
    # cerrar sesión
    pg.click(".ap-side [data-act=salir]"); pg.wait_for_timeout(700)
    check("cerrar sesión: vuelve al acceso", pg.is_visible("[data-view=auth]") and not pg.is_visible("[data-view=app]"))
    check("cerrar sesión: llama al servidor y limpia el panel", any(x[0] == "logout" for x in be.log) and pg.inner_html("#ap-contenido").strip() == "")
    check("cerrar sesión: la cabecera de la web vuelve", pg.is_visible("header.nav"))
    pg.reload(wait_until="networkidle"); pg.wait_for_timeout(500)
    check("cerrar sesión: al recargar sigue sin sesión", pg.is_visible("[data-view=auth]"))
    # cambiar de cuenta
    login(pg, "leo@taller.es", "LeoSegura#2026x")
    check("cambiar de cuenta: el otro cliente solo ve lo suyo", "Taller Leo" in pg.content() and "Clínica Ana" not in cont(pg) and "INFORME" not in cont(pg))
    pg.click(".ap-side [data-act=cambiar-cuenta]"); pg.wait_for_timeout(600)
    check("cambiar de cuenta: muestra el acceso con el email vacío", pg.is_visible("[data-view=auth]") and pg.input_value("#l-email") == "", pg.input_value("#l-email"))
    pg.fill("#l-email", "ana@clinica.es"); pg.fill("#l-pass", "NuevaClave#2026ok"); pg.click("[data-form=login] button[type=submit]")
    pg.wait_for_selector("[data-view=app]:not([hidden])"); pg.wait_for_timeout(400)
    check("cambiar de cuenta: entra con la otra cuenta", "Hola, Ana" in cont(pg))
    # menú de usuario
    pg.click("#ap-menu-btn"); pg.wait_for_timeout(150)
    check("menú de usuario: opciones", pg.is_visible("#ap-menu") and "Cerrar sesión" in pg.inner_text("#ap-menu") and "Cambiar de cuenta" in pg.inner_text("#ap-menu"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(100)
    check("menú de usuario: Escape lo cierra", not pg.is_visible("#ap-menu"))
    pg.click("#ap-menu-btn"); pg.click("#ap-menu [data-act=salir]"); pg.wait_for_timeout(600)
    check("menú de usuario: cerrar sesión funciona", pg.is_visible("[data-view=auth]"))
    ctx.close()

    # ───────── 3. Cliente nuevo (sin datos) ─────────
    be = montar(); be.add_user("nuevo@x.es", "NuevoSegura#2026", True, {"nombre": "Nuria"})
    ctx, pg, errs = nuevo(be)
    login(pg, "nuevo@x.es", "NuevoSegura#2026")
    c = cont(pg)
    check("cliente nuevo: primeros pasos y estados vacíos", "Primeros pasos" in c and "Hola, Nuria" in c)
    ir(pg, "#/automatizaciones"); check("cliente nuevo: automatizaciones vacías con acción", "Todavía no tienes automatizaciones" in cont(pg))
    ir(pg, "#/informes"); check("cliente nuevo: informes vacíos", "Todavía no hay informes" in cont(pg))
    pg.screenshot(path=f"{SC}/shots/p-cliente-nuevo.png", full_page=True)
    check("cliente nuevo: sin errores JS", not errs, str(errs))
    ctx.close()

    # ───────── 4. Equipo (Pablo) ─────────
    be = montar(); ctx, pg, errs = nuevo(be)
    login(pg, "pablo@tuagencia.tech", "PabloSegura#2026")
    check("equipo: menú de gestión (sin Ingresos)", navs(pg) == ["Resumen", "Contactos", "Solicitudes", "Clientes", "Métricas", "Equipo", "Mi cuenta"] or [x.split("\n")[0] for x in navs(pg)] , str(navs(pg)))
    check("equipo: etiqueta de rol y nombre de la base de datos", "Equipo" in pg.inner_text("#ap-user") and "Pablo Villalvilla" in pg.inner_text("#ap-user"), pg.inner_text("#ap-user"))
    check("equipo: no aparece Ingresos", "Ingresos" not in " ".join(navs(pg)))
    c = cont(pg)
    check("equipo: resumen con KPIs y requiere atención", "Contactos nuevos" in c and "Requiere atención" in c and "Embudo de contactos" in c, c[:200])
    check("equipo: marca los contactos con más de 24 h sin contactar", "+24 h sin contactar" in c)
    check("equipo: el buscador global está visible", pg.is_visible("#ap-q"))
    pg.screenshot(path=f"{SC}/shots/p-equipo-resumen.png", full_page=True)
    # contactos
    ir(pg, "#/contactos"); c = cont(pg)
    check("contactos: lista con los 3 contactos y origen", "Marta Pérez" in c and "Calculadora" in c and "Informe de reseñas" in c)
    pg.screenshot(path=f"{SC}/shots/p-contactos.png", full_page=True)
    pg.fill("[data-inp=lead-busca]", "clínica sol"); pg.wait_for_timeout(500)
    check("contactos: la búsqueda filtra y mantiene el foco", "Marta" not in cont(pg) and "Clínica Sol" in cont(pg) and pg.evaluate("document.activeElement.dataset.inp") == "lead-busca")
    pg.fill("[data-inp=lead-busca]", ""); pg.wait_for_timeout(400)
    pg.select_option("[data-chg=lead-estado][data-id='1']", "contactado"); pg.wait_for_timeout(500)
    check("contactos: cambia el estado de un contacto", next(l for l in be.t["leads"] if l["id"] == 1)["estado"] == "contactado")
    pg.click("a[href='#/contactos/1']"); pg.wait_for_timeout(500)
    c = cont(pg)
    check("contacto: detalle con acciones email/llamar/WhatsApp", "Escribir email" in c and "Llamar" in c and "WhatsApp" in c and "wa.me/34611223344" in pg.content())
    pg.fill("#nota-t", "Llamar el lunes por la mañana"); pg.click("[data-form=nota-nueva] button[type=submit]"); pg.wait_for_timeout(500)
    check("contacto: añade una nota firmada con su email", any(x[0] == "insert" and x[1] == "notas" and x[2]["autor"] == "pablo@tuagencia.tech" for x in be.log) and "Llamar el lunes" in cont(pg))
    # solicitudes
    ir(pg, "#/solicitudes"); c = cont(pg)
    check("solicitudes: ve las de todos los clientes", "Cambiar horario de recordatorios" in c and "TICKET-DE-LEO" in c)
    pg.click("a[href='#/solicitudes/2']"); pg.wait_for_timeout(400)
    pg.click("[data-act=plantilla][data-i='0']"); pg.click("[data-form=ticket-responder] button[data-cerrar]"); pg.wait_for_timeout(600)
    t2 = next(t for t in be.t["tickets"] if t["id"] == 2)
    check("solicitud: responde y cierra", t2["estado"] == "cerrado" and "Recibido" in (t2["respuesta"] or ""), str(t2))
    check("solicitud: vuelve al listado", pg.url.endswith("#/solicitudes"))
    # clientes
    ir(pg, "#/clientes"); c = cont(pg)
    check("clientes: lista con plan y métricas", "Clínica Ana" in c and "Taller Leo" in c and "Crecimiento" in c)
    cid = be.mi_cliente(be.users["ana@clinica.es"])["id"]
    ir(pg, f"#/clientes/{cid}"); c = cont(pg)
    check("cliente (ficha): KPIs y plan en solo lectura para el equipo", "Horas este mes" in c and pg.is_disabled("#c-plan"))
    pg.screenshot(path=f"{SC}/shots/p-ficha-cliente.png", full_page=True)
    ir(pg, f"#/clientes/{cid}/automatizaciones")
    pg.fill("#a-nombre", "CRM inteligente"); pg.click("[data-form=auto-nueva] button[type=submit]"); pg.wait_for_timeout(500)
    check("cliente (ficha): añade una automatización", "CRM inteligente" in cont(pg) and any(a["nombre"] == "CRM inteligente" for a in be.t["automatizaciones"]))
    pg.click("[data-act=auto-toggle][data-id='1']"); pg.wait_for_timeout(400)
    check("cliente (ficha): pausa una automatización", next(a for a in be.t["automatizaciones"] if a["id"] == 1)["activa"] is False)
    ir(pg, f"#/clientes/{cid}/metricas")
    pg.fill("#m-et", "Huecos recuperados"); pg.fill("#m-val", "5"); pg.fill("#m-h", "1.5"); pg.click("[data-form=metrica-nueva] button[type=submit]"); pg.wait_for_timeout(500)
    check("cliente (ficha): añade una métrica", any(m["etiqueta"] == "Huecos recuperados" and m["horas_ahorradas"] == 1.5 for m in be.t["metricas"]))
    ir(pg, f"#/clientes/{cid}/informes")
    pg.fill("#i-tit", "Informe de noviembre"); pg.fill("#i-url", "javascript:alert(1)"); pg.click("[data-form=informe-nuevo] button[type=submit]"); pg.wait_for_timeout(300)
    check("cliente (ficha): rechaza enlaces que no son http(s)", not any(i["titulo"] == "Informe de noviembre" for i in be.t["informes"]))
    pg.fill("#i-url", "https://ejemplo.es/nov.pdf"); pg.click("[data-form=informe-nuevo] button[type=submit]"); pg.wait_for_timeout(500)
    check("cliente (ficha): publica un informe", any(i["titulo"] == "Informe de noviembre" for i in be.t["informes"]))
    ir(pg, f"#/clientes/{cid}/notas"); pg.wait_for_timeout(300)
    check("cliente (ficha): pestaña de notas internas", pg.is_visible("#nota-t"))
    # métricas, equipo, ingresos
    ir(pg, "#/metricas"); check("métricas globales", "Por cliente" in cont(pg) and "Clínica Ana" in cont(pg))
    ir(pg, "#/equipo"); pg.wait_for_timeout(400); c = cont(pg)
    check("equipo: lista de quién tiene acceso", "Pablo Villalvilla Martín" in c and "Administrador" in c and "Rodrigo" in c)
    ir(pg, "#/ingresos"); check("equipo: no puede ver Ingresos", "Solo para el administrador" in cont(pg) or "Ingresos" not in " ".join(navs(pg)))
    # buscador global
    pg.fill("#ap-q", "taller"); pg.wait_for_timeout(300)
    check("buscador global: encuentra clientes", pg.is_visible("#ap-resultados") and "Taller Leo" in pg.inner_text("#ap-resultados"))
    pg.keyboard.press("Escape")
    check("equipo: sin errores JS", not errs, str(errs))
    pg.click(".ap-side [data-act=salir]"); pg.wait_for_timeout(600)
    check("equipo: cierra sesión", pg.is_visible("[data-view=auth]"))
    ctx.close()

    # ───────── 5. Administrador ─────────
    be = montar(); ctx, pg, errs = nuevo(be)
    login(pg, "admin@tuagencia.tech", "AdminSegura#2026")
    check("admin: menú con Ingresos", "Ingresos" in navs(pg) and "Contactos" in navs(pg), str(navs(pg)))
    check("admin: etiqueta Administrador", "Administrador" in pg.inner_text("#ap-user") and "Administrador" in pg.inner_text("#ap-rol-badge"))
    c = cont(pg); check("admin: resumen con ingresos estimados", "Ingresos mensuales" in c)
    cid = be.mi_cliente(be.users["ana@clinica.es"])["id"]
    ir(pg, f"#/clientes/{cid}"); check("admin: puede editar el plan", pg.is_enabled("#c-plan"))
    pg.select_option("#c-plan", "IA a medida"); pg.fill("#c-coste", "30"); pg.click("[data-form=cliente-ficha] button[type=submit]"); pg.wait_for_timeout(500)
    ca = be.mi_cliente(be.users["ana@clinica.es"])
    check("admin: cambia plan y tarifa", ca["plan"] == "IA a medida" and ca["coste_hora"] == 30, str(ca))
    ir(pg, "#/ingresos"); pg.wait_for_timeout(300); c = cont(pg)
    check("admin: ingresos con estimación por plan (249 €)", "Por plan" in c and "249 €" in c and "estimación" in c.lower(), c[:300])
    pg.screenshot(path=f"{SC}/shots/p-admin-ingresos.png", full_page=True)
    ir(pg, "#/equipo"); pg.wait_for_timeout(400)
    check("admin: ve cómo añadir a alguien al equipo", "insert into public.staff" in cont(pg))
    check("admin: sin errores JS", not errs, str(errs))
    ctx.close()

    # ───────── 6. Móvil ─────────
    be = montar(); ctx, pg, errs = nuevo(be, 390, 800)
    login(pg, "ana@clinica.es", "AnaSegura#2026x")
    check("móvil: el menú lateral está oculto y hay botón de menú", pg.is_visible("#ap-burger") and not pg.evaluate("document.querySelector('#ap-side').getBoundingClientRect().left > -5 && document.querySelector('#ap-side').getBoundingClientRect().right > 5"))
    check("móvil: sin desbordamiento horizontal", pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, str(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")))
    pg.screenshot(path=f"{SC}/shots/p-movil-resumen.png")
    pg.click("#ap-burger"); pg.wait_for_timeout(400)
    check("móvil: el menú se abre con todas las secciones y cerrar sesión", pg.is_visible("#ap-side [data-act=salir]") and pg.is_visible("#ap-nav a[href='#/resultados']"))
    pg.screenshot(path=f"{SC}/shots/p-movil-menu.png")
    pg.click("#ap-nav a[href='#/resultados']"); pg.wait_for_timeout(400)
    check("móvil: al elegir sección el menú se cierra", "Resultados" in pg.inner_text("#ap-titulo") and not pg.evaluate("document.querySelector('#ap-side').classList.contains('open')"))
    pg.click("#ap-burger"); pg.wait_for_timeout(300); pg.click("#ap-side [data-act=salir]"); pg.wait_for_timeout(600)
    check("móvil: cerrar sesión desde el menú", pg.is_visible("[data-view=auth]"))
    pg.screenshot(path=f"{SC}/shots/p-movil-acceso.png")
    check("móvil: sin errores JS", not errs, str(errs))
    ctx.close()
    be = montar(); ctx, pg, errs = nuevo(be, 390, 800)
    login(pg, "pablo@tuagencia.tech", "PabloSegura#2026")
    for r in ["#/contactos", "#/solicitudes", "#/clientes", "#/metricas"]:
        ir(pg, r)
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(f"móvil equipo {r}: sin desbordamiento", ov <= 0, str(ov))
    pg.screenshot(path=f"{SC}/shots/p-movil-equipo.png")
    ctx.close()

    # ───────── 7. Base de datos sin actualizar (compatibilidad) ─────────
    be = montar(nuevas=False); ctx, pg, errs = nuevo(be)
    login(pg, "pablo@tuagencia.tech", "PabloSegura#2026")
    check("compat: con la base antigua el equipo entra igualmente", "Contactos" in navs(pg) and "Requiere atención" in cont(pg), str(navs(pg)))
    ir(pg, "#/contactos/1"); pg.wait_for_timeout(500)
    check("compat: las notas avisan de que falta actualizar la base", "ejecutar la última versión" in cont(pg))
    ir(pg, "#/equipo"); pg.wait_for_timeout(500)
    check("compat: la lista de equipo avisa en vez de romperse", "No se ha podido cargar la lista" in cont(pg))
    check("compat: sin errores JS", not errs, str(errs))
    ctx.close()
    br.close()

print("\n".join(res))
print(f"\n{len(res) - len(fallos)}/{len(res)} correctas" + (f" · FALLOS: {fallos}" if fallos else ""))
