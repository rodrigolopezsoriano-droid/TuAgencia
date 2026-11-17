/* SPACEVERONA · Demo privada de TuAgencia
   Movimiento: hero, revelados, contadores, parallax, cursor, banda. Sin librerías. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const reduce = html.classList.contains("rm");
  const fine = window.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const onReady = f => {
    if (html.classList.contains("ready")) return f();
    new MutationObserver((m, o) => { if (html.classList.contains("ready")) { o.disconnect(); f(); } }).observe(html, { attributes: true, attributeFilter: ["class"] });
  };

  /* ---------- interruptor de movimiento (barra demo) ---------- */
  const mt = $("#mtog");
  if (mt) {
    mt.textContent = reduce ? "Movimiento: reducido" : "Movimiento: completo";
    mt.setAttribute("aria-pressed", String(!reduce));
    mt.addEventListener("click", () => { try { localStorage.setItem("svm", reduce ? "full" : "reduced"); } catch (e) {} try { sessionStorage.removeItem("svl"); } catch (e) {} location.reload(); });
  }

  /* ---------- altura exacta del hero según lo que hay encima ---------- */
  function heroTop() {
    const t = ["demo-bar", "announce", "tricolor"].reduce((a, c) => { const e = document.querySelector("." + c); return a + (e ? e.offsetHeight : 0); }, 0);
    if (t) html.style.setProperty("--hero-top", t + "px");
  }
  heroTop();

  /* ---------- títulos palabra a palabra ---------- */
  function splitHeading(el) {
    let i = 0;
    el.setAttribute("aria-label", el.textContent.trim());
    $$("*", el).length || [...el.childNodes].forEach(n => {
      if (n.nodeType !== 3) return;
      const f = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(p => {
        if (!p) return;
        if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(" ")); return; }
        const w = document.createElement("span"); w.className = "sw"; w.setAttribute("aria-hidden", "true");
        const s = document.createElement("span"); s.style.setProperty("--i", i++); s.textContent = p;
        w.appendChild(s); f.appendChild(w);
      });
      n.replaceWith(f);
    });
  }
  $$("[data-split]").forEach(splitHeading);

  /* ---------- revelados al hacer scroll ---------- */
  const SEL = ".rv:not(.in),.rv-clip:not(.in),[data-split]:not(.in)";
  let io = null;
  if ("IntersectionObserver" in window && !reduce) {
    io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  }
  function reveal() {
    $$(SEL).forEach(el => {
      if (!io) { el.classList.add("in"); return; }
      if (!el._o) { el._o = 1; io.observe(el); }
    });
  }
  window.svReveal = reveal;
  reveal();
  /* si alguien salta con un ancla, lo que quedó por encima se muestra igualmente */
  let st;
  addEventListener("scroll", () => {
    clearTimeout(st);
    st = setTimeout(() => $$(SEL).forEach(el => { if (el.getBoundingClientRect().bottom < 0) el.classList.add("in"); }), 160);
  }, { passive: true });

  /* ---------- contadores ---------- */
  function count(el) {
    const to = +el.dataset.count, dec = +(el.dataset.dec || 0), suf = el.dataset.suf || "";
    const fmt = v => (dec ? v.toFixed(dec).replace(".", ",") : Math.round(v)) + suf;
    if (reduce) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), D = 1900;
    (function f(n) {
      const x = clamp((n - t0) / D, 0, 1);
      el.textContent = fmt(to * (1 - Math.pow(1 - x, 4)));
      if (x < 1) requestAnimationFrame(f);
    })(t0);
  }
  if ("IntersectionObserver" in window) {
    const co = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { count(e.target); co.unobserve(e.target); } }), { threshold: 0.6 });
    $$("[data-count]").forEach(el => co.observe(el));
  } else $$("[data-count]").forEach(count);

  /* ---------- manifiesto: las palabras se iluminan al leer ---------- */
  const mani = $("#mani"), mw = [];
  if (mani) {
    (function walk(node) {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const f = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(" ")); return; }
            const s = document.createElement("span"); s.className = "w"; s.textContent = p; mw.push(s); f.appendChild(s);
          });
          n.replaceWith(f);
        } else if (n.nodeType === 1) walk(n);
      });
    })(mani);
  }
  let lastP = -1;
  function maniUpdate() {
    if (!mani) return;
    const r = mani.getBoundingClientRect(), vh = innerHeight;
    const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.1), 0, 1), n = mw.length;
    if (p === lastP) return; lastP = p;
    mw.forEach((w, i) => w.style.setProperty("--t", clamp((p * (n + 4) - i) / 3, 0, 1).toFixed(2)));
  }

  /* ---------- hero: escenas, autoplay, hotspots ---------- */
  const hero = $("#hero"), slides = $$(".slide"), navs = $$("#hnav button");
  let cur = 0, hoverPause = false, offPause = false, hidPause = false, loadedAll = false;
  const loadSlide = i => $$("img[data-src]", slides[i]).forEach(img => {
    img.addEventListener("load", place, { once: true });
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src; img.removeAttribute("data-src");
  });
  function place() {
    slides.forEach(s => {
      const wrap = $(".bgw", s), img = $("img", s);
      if (!img || !img.naturalWidth) return;
      const cw = wrap.clientWidth, ch = wrap.clientHeight, iw = img.naturalWidth, ih = img.naturalHeight;
      const sc = Math.max(cw / iw, ch / ih), w = iw * sc, h = ih * sc;
      const pos = (getComputedStyle(img).objectPosition || "50% 50%").split(" ").map(v => parseFloat(v) / 100);
      const ox = (cw - w) * pos[0], oy = (ch - h) * (isNaN(pos[1]) ? 0.5 : pos[1]);
      $$(".hs", s).forEach(b => {
        const x = ox + (+b.dataset.x) * w, y = oy + (+b.dataset.y) * h;
        b.style.left = x + "px"; b.style.top = y + "px";
        b.style.display = (x < 20 || x > cw - 20 || y < 90 || y > ch - 20) ? "none" : "";
      });
    });
  }
  function go(i) {
    i = (i + slides.length) % slides.length;
    if (i === cur) return;
    slides[cur].classList.remove("on"); navs[cur].classList.remove("on");
    cur = i; loadSlide(i);
    slides[i].classList.add("on"); navs[i].classList.add("on");
    place();
  }
  function pauseState() { hero.classList.toggle("paused", hoverPause || offPause || hidPause); }
  if (hero) {
    const first = $("#heroImg");
    if (first.complete) place(); else first.addEventListener("load", place, { once: true });
    addEventListener("resize", () => { heroTop(); place(); });
    navs.forEach((b, i) => {
      b.addEventListener("click", () => go(i));
      $("b", b).addEventListener("animationend", () => go(cur + 1));
    });
    hero.addEventListener("keydown", e => { if (e.key === "ArrowRight") go(cur + 1); if (e.key === "ArrowLeft") go(cur - 1); });
    if (fine) {
      $$(".hs,#hnav", hero).forEach(el => { el.addEventListener("mouseenter", () => { hoverPause = true; pauseState(); }); el.addEventListener("mouseleave", () => { hoverPause = false; pauseState(); }); });
    }
    let tx = 0, ty = 0;
    hero.addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    hero.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { offPause = !e.isIntersecting; pauseState(); }, { threshold: 0.2 }).observe(hero);
    document.addEventListener("visibilitychange", () => { hidPause = document.hidden; pauseState(); });
    onReady(() => {
      hero.classList.add("go");
      setTimeout(() => { if (!loadedAll) { loadedAll = true; slides.forEach((_, i) => loadSlide(i)); } }, 700);
    });
  }

  /* ---------- scroll: cabecera, progreso, parallax, banda ---------- */
  const hd = $(".site-header"), prog = $("#prog"), slidesEl = $("#slides");
  const par = $$("[data-par]");
  const duoImg = $(".duo-pic img"); if (duoImg) { duoImg.dataset.par = ".07"; par.push(duoImg); }
  let lastY = scrollY, vel = 0, bandAnim = null;
  const tr = $("#bandTr");
  if (tr && tr.animate && !reduce) bandAnim = tr.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], { duration: 60000, iterations: Infinity });

  let lastScroll = -1;
  function frame() {
    const y = scrollY, hh = hero ? hero.offsetHeight : 700;
    if (y !== lastScroll) {
      lastScroll = y;
    if (hd) {
      hd.classList.toggle("over", y < 60);
      hd.classList.toggle("hide", y > lastY + 2 && y > hh * 0.8);
      if (y < lastY - 2) hd.classList.remove("hide");
    }
    if (prog) prog.style.transform = "scaleX(" + clamp(y / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1).toFixed(4) + ")";
    if (slidesEl && !reduce && y < hh * 1.2) slidesEl.style.transform = "translate3d(0," + Math.min(y * 0.3, hh * 0.085).toFixed(1) + "px,0)";
    if (!reduce) par.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const off = (r.top + r.height / 2 - innerHeight / 2) * (+el.dataset.par);
      el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0) scale(1.14)";
    });
      maniUpdate();
    }
    vel += (Math.abs(y - lastY) - vel) * 0.12;
    if (bandAnim && (vel > 0.02 || bandAnim.playbackRate !== 1)) bandAnim.playbackRate = vel > 0.02 ? 1 + clamp(vel * 0.3, 0, 9) : 1;
    lastY = y;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- botones magnéticos ---------- */
  if (fine && !reduce) $$(".mag").forEach(el => {
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      el.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + "px)";
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });

  /* ---------- carril «La Famiglia»: arrastrar con el ratón ---------- */
  const rail = $(".rail");
  if (rail && fine) {
    let down = false, sx = 0, sl = 0;
    rail.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add("drag"); });
    addEventListener("pointermove", e => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
    addEventListener("pointerup", () => { down = false; rail.classList.remove("drag"); });
  }

  /* ---------- cursor propio ---------- */
  if (fine && !reduce) {
    const dot = document.createElement("div"), ring = document.createElement("div");
    dot.className = "cur"; ring.className = "cur-r"; dot.setAttribute("aria-hidden", "true"); ring.setAttribute("aria-hidden", "true");
    document.body.append(dot, ring);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, seen = false;
    addEventListener("mousemove", e => {
      mx = e.clientX; my = e.clientY;
      if (!seen) { seen = true; rx = mx; ry = my; html.classList.add("has-cur"); }
    }, { passive: true });
    document.addEventListener("mouseleave", () => { dot.style.opacity = 0; ring.style.opacity = 0; });
    document.addEventListener("mouseenter", () => { dot.style.opacity = ""; ring.style.opacity = ""; });
    document.addEventListener("mouseover", e => ring.classList.toggle("hov", !!e.target.closest("a,button,.card-img,.coll,.chip,label,.rail figure,.hs")));
    addEventListener("mousedown", () => ring.classList.add("dn"));
    addEventListener("mouseup", () => ring.classList.remove("dn"));
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      requestAnimationFrame(loop);
    })();
  }
})();
