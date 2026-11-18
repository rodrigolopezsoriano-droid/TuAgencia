# Prueba de la pantalla de carga: solo en la primera visita y al pulsar «Inicio» (logotipo).
# Uso: npx astro dev --port 4323   y en otra terminal:   python tests/e2e/carga.py <carpeta_para_capturas>
import sys, glob, os, re
from playwright.sync_api import sync_playwright
SC = sys.argv[1] if len(sys.argv) > 1 else "."; B = "http://localhost:4323"
os.makedirs(f"{SC}/shots", exist_ok=True)
exe = (glob.glob(os.path.expanduser("~/AppData/Local/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell.exe")) or [None])[0]
res = []
def check(n, c, extra=""): res.append(("OK " if c else "FALLO ") + n + (f"  → {extra}" if (extra and not c) else ""))
vis = lambda pg: pg.evaluate("(()=>{const e=document.getElementById('carga');const s=getComputedStyle(e);return s.display!=='none'&&s.visibility==='visible'&&parseFloat(s.opacity)>0.5})()")
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=exe)
    ctx = br.new_context(viewport={"width": 1280, "height": 800}); pg = ctx.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(B + "/", wait_until="commit"); pg.wait_for_timeout(600)
    fondo = pg.evaluate("getComputedStyle(document.getElementById('carga')).backgroundColor"); r, g, b = [int(x) for x in re.findall(r"\d+", fondo)[:3]]
    check("fondo claro (como la web), sin contraste fuerte", min(r, g, b) >= 245, fondo)
    check("primera visita: se ve la pantalla de carga", vis(pg)); pg.screenshot(path=f"{SC}/shots/carga-intro.png")
    pg.wait_for_timeout(2200)
    check("primera visita: se retira sola", not vis(pg))
    check("primera visita: queda marcada como vista", pg.evaluate("sessionStorage.getItem('ta_pre')") == "1")
    pg.click("header a[href='/precios']"); pg.wait_for_timeout(150)
    check("enlace normal: NO muestra pantalla de carga", not vis(pg))
    pg.wait_for_url(re.compile(r".*/precios/?$")); pg.wait_for_timeout(300)
    check("enlace normal: tampoco al llegar", not vis(pg))
    pg.click("header a[data-inicio]"); pg.wait_for_timeout(150)
    check("Inicio desde otra página: aparece", vis(pg))
    pg.wait_for_url(B + "/"); pg.wait_for_timeout(300)
    check("Inicio: sigue al llegar a la portada", vis(pg))
    pg.wait_for_timeout(1700)
    check("Inicio: se retira sola", not vis(pg))
    pg.evaluate("scrollTo(0, 1500)"); pg.wait_for_timeout(100)
    pg.click("header a[data-inicio]"); pg.wait_for_timeout(200)
    check("Inicio estando en la portada: aparece", vis(pg))
    pg.wait_for_timeout(1600)
    check("Inicio estando en la portada: se retira y sube arriba", not vis(pg) and pg.evaluate("scrollY") == 0)
    pg.reload(); pg.wait_for_timeout(400)
    check("recargar en la misma visita: no repite", not vis(pg))
    check("sin errores JS", not errs, str(errs)); ctx.close()
    rm = br.new_context(reduced_motion="reduce"); q = rm.new_page(); q.goto(B + "/"); q.wait_for_timeout(300)
    check("reducir movimiento: se ve la versión tranquila (logo quieto)", vis(q) and q.evaluate("getComputedStyle(document.querySelector('.c-logo')).transform") in ("none", "matrix(1, 0, 0, 1, 0, 0)"))
    q.wait_for_timeout(2600); check("reducir movimiento: se retira sola", not vis(q)); rm.close(); br.close()
print("\n".join(res)); sys.exit(0 if all(r.startswith("OK") for r in res) else 1)
