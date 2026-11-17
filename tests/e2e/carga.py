import sys, glob, os, time
from playwright.sync_api import sync_playwright
SC = sys.argv[1]; B = "http://localhost:4323"  # npx astro dev --port 4323
exe = (glob.glob(os.path.expanduser("~/AppData/Local/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell.exe")) or [None])[0]
res = []
def check(n, c, extra=""): res.append(("OK " if c else "FALLO ") + n + (f"  → {extra}" if (extra and not c) else ""))
vis = lambda pg: pg.evaluate("(()=>{const e=document.getElementById('carga');const s=getComputedStyle(e);return s.visibility==='visible'&&parseFloat(s.opacity)>0.5})()")
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=exe)
    # 1. Primera visita: intro 3D
    ctx = br.new_context(viewport={"width": 1280, "height": 800}); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B + "/", wait_until="commit"); pg.wait_for_timeout(700)
    check("intro: se ve la pantalla de carga en la primera visita", vis(pg))
    check("intro: el logo 3D tiene capas", pg.evaluate("document.querySelectorAll('#c-logo .c-capa').length") == 18)
    pg.screenshot(path=f"{SC}/shots/carga-intro-1.png"); pg.wait_for_timeout(500); pg.screenshot(path=f"{SC}/shots/carga-intro-2.png")
    pg.wait_for_timeout(2600)
    check("intro: se retira sola", not vis(pg))
    check("intro: marca la visita como vista", pg.evaluate("sessionStorage.getItem('ta_pre')") == "1")
    pg.screenshot(path=f"{SC}/shots/carga-home.png")
    # 2. Cambio de página: pantalla de carga corta
    pg.click("a[href='/precios']", no_wait_after=True); pg.wait_for_timeout(120)
    check("navegación: al pulsar un enlace aparece la pantalla de carga", vis(pg))
    pg.screenshot(path=f"{SC}/shots/carga-nav-salida.png")
    pg.wait_for_url("**/precios"); pg.wait_for_timeout(80)
    check("navegación: llega a la página nueva", pg.url.endswith("/precios"))
    estado_llegada = vis(pg)
    pg.wait_for_timeout(1600)
    check("navegación: tras cargar, se retira sola", not vis(pg))
    check("navegación: el aviso de transición se consume", pg.evaluate("sessionStorage.getItem('ta_nav')") is None)
    # anclas del propio sitio y enlaces externos no disparan nada
    pg.goto(B + "/", wait_until="networkidle"); pg.wait_for_timeout(2300)
    pg.click("a[href='#soluciones']"); pg.wait_for_timeout(200)
    check("anclas (#): no muestran pantalla de carga", not vis(pg))
    # botón atrás
    pg.click("a[href='/precios']", no_wait_after=True); pg.wait_for_url("**/precios"); pg.wait_for_timeout(1500)
    pg.go_back(); pg.wait_for_timeout(1500)
    check("botón atrás: no se queda la pantalla de carga encima", not vis(pg))
    check("sin errores JS", not errs, str(errs)); ctx.close()
    # 3. Misma visita (ya vista la intro): no vuelve la intro
    ctx = br.new_context(viewport={"width": 1280, "height": 800}); ctx.add_init_script("try{sessionStorage.setItem('ta_pre','1')}catch(e){}")
    pg = ctx.new_page(); pg.goto(B + "/", wait_until="commit"); pg.wait_for_timeout(300)
    check("visita repetida: no hay intro", not vis(pg)); ctx.close()
    # 4. Movimiento reducido: sin pantalla de carga y navegación directa
    ctx = br.new_context(viewport={"width": 1280, "height": 800}, reduced_motion="reduce"); pg = ctx.new_page()
    pg.goto(B + "/", wait_until="commit"); pg.wait_for_timeout(500)
    check("movimiento reducido: no hay pantalla de carga", pg.evaluate("getComputedStyle(document.getElementById('carga')).display") == "none")
    t = time.time(); pg.click("a[href='/precios']"); pg.wait_for_url("**/precios")
    check("movimiento reducido: la navegación no se retrasa", time.time() - t < 1.2, f"{time.time()-t:.2f}s"); ctx.close()
    # 5. Móvil
    ctx = br.new_context(viewport={"width": 390, "height": 800}); pg = ctx.new_page(); pg.goto(B + "/", wait_until="commit"); pg.wait_for_timeout(900)
    pg.screenshot(path=f"{SC}/shots/carga-movil.png"); check("móvil: sin desbordamiento", pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0)
    ctx.close()
    # 6. Animaciones de la web (barra de progreso, tilt)
    ctx = br.new_context(viewport={"width": 1280, "height": 800}); ctx.add_init_script("try{sessionStorage.setItem('ta_pre','1')}catch(e){}")
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B + "/", wait_until="networkidle"); pg.wait_for_timeout(500)
    pg.mouse.wheel(0, 1500); pg.wait_for_timeout(500)
    sx = pg.evaluate("document.getElementById('progreso').style.transform")
    check("barra de progreso de lectura avanza al hacer scroll", sx.startswith("scaleX(") and sx != "scaleX(0)", sx)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(400)
    box = pg.locator(".phone").bounding_box(); pg.mouse.move(box["x"] + box["width"] * 0.85, box["y"] + box["height"] * 0.2); pg.wait_for_timeout(300)
    tr = pg.evaluate("document.querySelector('.phone').style.transform")
    check("el móvil de la portada se inclina en 3D con el ratón", "rotateY" in tr, tr)
    pg.screenshot(path=f"{SC}/shots/anim-hero.png")
    pg.mouse.move(5, 5); pg.wait_for_timeout(800)
    check("el móvil vuelve a su sitio al soltar", pg.evaluate("document.querySelector('.phone').style.transform") == "")
    cl = pg.locator(".card-link").first; cl.scroll_into_view_if_needed(); pg.wait_for_timeout(900); b2 = cl.bounding_box()
    pg.mouse.move(b2["x"] + 40, b2["y"] + 40); pg.wait_for_timeout(300)
    check("tarjetas: foco de luz sigue al ratón", pg.evaluate("document.querySelector('.card-link').style.getPropertyValue('--mx')") != "")
    check("animaciones: sin errores JS", not errs, str(errs)); ctx.close()
    br.close()
print("\n".join(res)); print(f"\n{sum(r.startswith('OK') for r in res)}/{len(res)} correctas")
