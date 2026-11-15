/* SPACEVERONA · Demo privada de TuAgencia
   Todo el estado vive en el navegador (localStorage). No se envía nada a ningún servidor. */
(function () {
  "use strict";

  /* ---------- utilidades ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const eur = n => n.toFixed(2).replace(".", ",") + " €";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: la demo sigue funcionando */ } }
  };
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const FREE_FROM = 60, SHIP_ES = 3.5;

  /* ---------- catálogo (nombres y precios de spaceverona.com) ---------- */
  const COLLS = [
    { id: "all", name: "Todo" },
    { id: "heritage", name: "Héritage" },
    { id: "borgia", name: "Borgia" },
    { id: "amore", name: "Amore Eterno" },
    { id: "archivio", name: "Archivio" }
  ];
  const TOP = ["S", "M", "L", "XL"];
  const P = [
    { id: "waffle-longsleeve-heritage", name: "Waffle Longsleeve Héritage", price: 39.99, coll: "heritage", img: "waffle", w: 678, h: 534, badge: "Nuevo", sizes: TOP, desc: "Longsleeve de tejido waffle de la colección Héritage, con el escudo de los dos caballos y la firma SpaceVerona en el puño." },
    { id: "polo-heritage", name: "Polo Héritage", price: 37.99, coll: "heritage", img: "polo", w: 848, h: 644, badge: "Nuevo", sizes: TOP, desc: "Polo de corte cropped con cuello crema de rayas tricolor y el escudo de Italia en el pecho." },
    { id: "borgia-iii", name: "Camiseta Negra Italian private club", price: 29.99, coll: "borgia", img: "camiseta-negra", w: 900, h: 900, sizes: TOP, desc: "Camiseta de la colección Borgia con el escudo tricolor en el pecho. Corte amplio." },
    { id: "borgia-ii", name: "Camiseta Beige Italian private club", price: 29.99, coll: "borgia", img: "camiseta-beige", w: 900, h: 900, sizes: TOP, desc: "La misma camiseta Italian private club en beige. Corte amplio." },
    { id: "borgia-iv", name: "Camiseta pistacchio", price: 29.99, coll: "borgia", img: "camiseta-pistacchio", w: 900, h: 900, sizes: TOP, desc: "Camiseta de la colección Borgia en color pistacchio. Corte amplio." },
    { id: "borgia-i", name: "SV Venice shirt", price: 29.99, coll: "borgia", img: "venice-shirt", w: 900, h: 900, sold: true, sizes: TOP, desc: "Camiseta SV Venice de la colección Borgia." },
    { id: "sudadera-beige-rojo", name: "Sudadera cropped fit beige y rojo", price: 44.99, coll: "amore", img: "sudadera-beige-rojo", w: 900, h: 900, sizes: TOP, desc: "Sudadera cropped fit de Amore Eterno: corazón desgastado en rojo y firma SpaceVerona." },
    { id: "sudadera-marron-rosa", name: "Sudadera cropped fit marrón chocolate y rosa", price: 44.99, coll: "amore", img: "sudadera-marron-rosa", w: 900, h: 900, sizes: TOP, desc: "Sudadera cropped fit de Amore Eterno: corazón desgastado en rosa sobre marrón chocolate." },
    { id: "pack-duoo", name: "Pack “Dúo” Sudaderas cropped fit beige y marrón chocolate", short: "Pack “Dúo” sudaderas", price: 79.99, was: 90, coll: "amore", img: "pack-duo", w: 900, h: 900, badge: "Oferta", sizes: TOP, pack: true, desc: "Las dos sudaderas cropped fit de Amore Eterno, beige y marrón chocolate, en un solo pack. La talla elegida se aplica a las dos." },
    { id: "longsleeve-vespa-classica", name: "Longsleeve Vespa Classica", price: 24.99, coll: "archivio", img: "vespa", w: 900, h: 900, sold: true, sizes: TOP, desc: "Longsleeve de un drop anterior, con la Vespa en la espalda." },
    { id: "gorra-venice", name: "Gorra Venice Verde", price: 19.99, coll: "archivio", img: "gorra", w: 900, h: 900, sizes: ["Única"], desc: "Gorra Venice en verde, de un drop anterior." }
  ];
  const byId = id => P.find(p => p.id === id);
  const label = p => p.short || p.name;
  const HOODIES = ["sudadera-beige-rojo", "sudadera-marron-rosa"];

  /* ---------- toast ---------- */
  let tT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(tT); tT = setTimeout(() => t.classList.remove("on"), 3200);
  }

  /* ---------- overlays ---------- */
  const OV = { cart: "#cart", tour: "#tour", menu: "#mnav", prod: "#mProd", wait: "#mWait", check: "#mCheck", search: "#mSearch" };
  const opened = []; let lastFocus = null;
  function sync() {
    const scrim = $("#scrim");
    const need = opened.some(n => n !== "menu");
    scrim.classList.toggle("on", need);
    document.body.style.overflow = opened.length ? "hidden" : "";
  }
  function openOv(name) {
    if (name === "tour") renderTour();
    if (name === "cart") renderCart();
    if (name !== "check" && name !== "wait") closeAll(name);
    lastFocus = document.activeElement;
    const el = $(OV[name]);
    el.classList.add(name === "menu" ? "open" : "on");
    el.setAttribute("aria-hidden", "false");
    if (!opened.includes(name)) opened.push(name);
    sync();
    setTimeout(() => { const f = el.querySelector("input,button,a"); if (f && name !== "menu") f.focus({ preventScroll: true }); }, 60);
  }
  function closeOv(name) {
    const el = $(OV[name]); if (!el) return;
    el.classList.remove("on", "open"); el.setAttribute("aria-hidden", "true");
    const i = opened.indexOf(name); if (i > -1) opened.splice(i, 1);
    sync();
    if (lastFocus && lastFocus.focus && !opened.length) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function closeAll(except) { opened.slice().forEach(n => { if (n !== except) closeOv(n); }); }

  /* ---------- filtros y rejilla ---------- */
  let filter = "all";
  function renderFilters() {
    $("#filters").innerHTML = COLLS.map(c => `<button class="chip" type="button" data-f="${c.id}" aria-pressed="${c.id === filter}">${c.name}</button>`).join("");
  }
  const COLL_NAME = { heritage: "Héritage", borgia: "Borgia", amore: "Amore Eterno", archivio: "Archivio" };
  function renderGrid() {
    const list = filter === "all" ? P : P.filter(p => p.coll === filter);
    $("#grid").innerHTML = list.map((p, i) => {
      const badge = p.sold ? `<span class="badge out">Agotado</span>` : p.was ? `<span class="badge sale">Oferta</span>` : p.badge ? `<span class="badge">${p.badge}</span>` : "";
      const price = p.was ? `<s>${eur(p.was)}</s>${eur(p.price)}` : eur(p.price);
      const q = p.sold
        ? `<button type="button" data-wait="${p.id}">Avísame cuando vuelva</button>`
        : `<button type="button" data-product="${p.id}">Elegir talla</button>`;
      return `<article class="card rv ${p.sold ? "sold" : ""}" style="--d:${(Math.min(i, 7) * 0.06).toFixed(2)}s">
        <div class="card-img">${badge}
          <a href="#" data-product="${p.id}" aria-label="Ver ${label(p)}" style="display:block;width:100%;height:100%"><img src="assets/img/${p.img}-s.webp" alt="${label(p)}" width="${p.w}" height="${p.h}" loading="lazy" decoding="async"></a>
          <div class="quick">${q}</div></div>
        <div class="card-coll">${COLL_NAME[p.coll]}</div>
        <div class="card-info"><h3><a href="#" data-product="${p.id}">${label(p)}</a></h3><span class="price">${price}</span></div>
      </article>`;
    }).join("");
  }
  function setFilter(f) { filter = f; renderFilters(); renderGrid(); if (window.svReveal) window.svReveal(); }

  /* ---------- guía de tallas orientativa ---------- */
  function recommend(h, w, pref) {
    let i = w < 58 ? 0 : w < 70 ? 1 : w < 82 ? 2 : 3;
    if (h >= 186) i++; else if (h <= 165) i--;
    if (pref === "slim") i--; if (pref === "loose") i++;
    i = Math.max(0, Math.min(3, i));
    return TOP[i];
  }

  /* ---------- carrito ---------- */
  let cart = store.get("sv_cart", []);
  const saveCart = () => store.set("sv_cart", cart);
  const subtotal = () => cart.reduce((a, l) => a + byId(l.id).price * l.qty, 0);
  const count = () => cart.reduce((a, l) => a + l.qty, 0);
  function updCount() {
    const c = $("#cartCnt"), n = count();
    const up = n > +c.textContent; c.textContent = n; c.classList.toggle("on", n > 0);
    if (up) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); }
    const b = $("#cartLbl"); if (b) b.textContent = n ? "Abrir carrito, " + n + (n === 1 ? " artículo" : " artículos") : "Abrir carrito";
  }
  function addToCart(id, size, qty = 1) {
    const l = cart.find(x => x.id === id && x.size === size);
    if (l) l.qty += qty; else cart.push({ id, size, qty });
    saveCart(); updCount();
  }
  function renderCart() {
    const body = $("#cartBody"), foot = $("#cartFoot");
    if (!cart.length) {
      body.innerHTML = `<div class="empty"><p class="serif">Tu carrito está vacío</p><p>Cuando elijas algo, aquí verás cuánto te falta para el envío gratis.</p><p style="margin-top:20px"><button class="btn btn-dark" type="button" data-close="cart" data-goto="#tienda">Seguir comprando</button></p></div>`;
      foot.innerHTML = ""; foot.style.display = "none"; return;
    }
    foot.style.display = "";
    const sub = subtotal(), left = FREE_FROM - sub, pct = Math.min(100, (sub / FREE_FROM) * 100);
    let shipHtml = `<div class="ship"><div>${left > 0 ? `Te faltan <b>${eur(left)}</b> para el <b>envío gratis</b>` : `<b>¡Envío gratis conseguido!</b> Lo preparamos a mano para ti.`}</div><div class="bar"><i style="width:${pct}%"></i></div>`;
    if (left > 0 && left <= 20 && !cart.some(l => l.id === "gorra-venice")) {
      shipHtml += `<p style="margin-top:10px;font-size:13px;color:var(--suave)">Con la <b>Gorra Venice Verde</b> (19,99 €) casi llegas. <button class="link" type="button" data-addgorra>Añadir</button></p>`;
    }
    shipHtml += `</div>`;

    const lines = cart.map((l, i) => {
      const p = byId(l.id);
      return `<div class="line"><img src="assets/img/${p.img}-s.webp" alt="" width="78" height="78" loading="lazy">
        <div><h4>${label(p)}</h4><small>Talla ${l.size}</small>
          <div class="qty"><button type="button" data-q="${i}:-1" aria-label="Menos">−</button><span>${l.qty}</span><button type="button" data-q="${i}:1" aria-label="Más">+</button></div></div>
        <div style="text-align:right"><b>${eur(p.price * l.qty)}</b><button class="rm" type="button" data-rm="${i}">Quitar</button></div></div>`;
    }).join("");

    /* sugerencia del pack Dúo */
    let up = "";
    const hi = cart.findIndex(l => HOODIES.includes(l.id));
    if (hi > -1 && !cart.some(l => l.id === "pack-duoo")) {
      const pk = byId("pack-duoo"), one = byId(cart[hi].id), extra = pk.price - one.price;
      up = `<div class="upsell"><img src="assets/img/pack-duo-s.webp" alt="" width="72" height="72"><div><b>Llévate el pack “Dúo”</b><p>Añade la segunda sudadera por solo <b>${eur(extra)}</b> en vez de ${eur(one.price)}. Ahorras ${eur(pk.was - pk.price)} sobre el precio habitual.</p><button class="btn btn-dark" type="button" data-duo="${hi}">Cambiar a pack Dúo · ${eur(pk.price)}</button></div></div>`;
    }
    body.innerHTML = shipHtml + lines + up;

    const ship = left <= 0 ? 0 : SHIP_ES;
    foot.innerHTML = `<div class="sum"><span>Subtotal</span><span>${eur(sub)}</span></div>
      <div class="sum"><span>Envío (España peninsular)</span><span>${ship === 0 ? "Gratis" : eur(ship)}</span></div>
      <div class="sum t"><span>Total</span><span>${eur(sub + ship)}</span></div>
      <button class="btn btn-dark btn-full" type="button" data-checkout>Finalizar compra</button>
      <p class="tiny" style="text-align:center;margin-top:10px">Pago seguro con el checkout de Shopify</p>`;
  }

  /* ---------- ficha de producto ---------- */
  function openProduct(id) {
    const p = byId(id); if (!p) return;
    if (p.sold) { openWait(id); return; }
    let size = p.sizes.length === 1 ? p.sizes[0] : null;
    const box = $("#mProdBox");
    const price = p.was ? `<s>${eur(p.was)}</s>${eur(p.price)}` : eur(p.price);
    const finder = p.sizes.length > 1 ? `<div class="finder"><b>Descubre tu talla</b><div class="row"><input id="fh" type="number" inputmode="numeric" placeholder="Altura (cm)" aria-label="Altura en centímetros"><input id="fw" type="number" inputmode="numeric" placeholder="Peso (kg)" aria-label="Peso en kilos"></div><div class="res" id="fres" aria-live="polite">Orientativo. Prenda de corte amplio.</div></div>` : "";
    box.innerHTML = `<button class="ibtn mclose" type="button" aria-label="Cerrar" data-close="prod"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg></button>
      <div class="pdp"><div class="pdp-img"><img src="assets/img/${p.img}.webp" alt="${label(p)}" width="${p.w}" height="${p.h}"></div>
      <div class="pdp-info"><span class="card-coll">${COLL_NAME[p.coll]}</span><h2>${label(p)}</h2><div class="price">${price}</div><p style="color:var(--suave)">${p.desc}</p>
      <div><div class="lab"><span>Talla${p.pack ? " (para las dos)" : ""}</span><span id="sizeMsg" style="color:var(--rojo);text-transform:none;letter-spacing:0"></span></div>
      <div class="sizes" role="group" aria-label="Talla" style="margin-top:8px">${p.sizes.map(s => `<button type="button" data-size="${s}" aria-pressed="${s === size}">${s}</button>`).join("")}</div></div>
      ${finder}
      <button class="btn btn-dark btn-full" type="button" id="addBtn">Añadir al carrito · ${eur(p.price)}</button>
      <ul class="facts"><li><b>Envío gratis</b> a partir de 60 €</li><li><b>14 días</b> para devoluciones</li><li>Fatto in Spagna</li></ul></div></div>`;
    openOv("prod");
    const sizeBtns = $$("[data-size]", box);
    sizeBtns.forEach(b => b.addEventListener("click", () => {
      size = b.dataset.size; sizeBtns.forEach(x => x.setAttribute("aria-pressed", x === b)); $("#sizeMsg").textContent = "";
    }));
    const calc = () => {
      const h = +($("#fh") || {}).value, w = +($("#fw") || {}).value, r = $("#fres"); if (!r) return;
      if (h >= 140 && h <= 220 && w >= 35 && w <= 180) {
        const s = recommend(h, w); r.textContent = `Te recomendamos la talla ${s}`;
        sizeBtns.forEach(x => { if (x.dataset.size === s) { size = s; sizeBtns.forEach(y => y.setAttribute("aria-pressed", y === x)); } });
      }
    };
    ["fh", "fw"].forEach(i => { const e = $("#" + i); if (e) e.addEventListener("input", calc); });
    $("#addBtn").addEventListener("click", () => {
      if (!size) { $("#sizeMsg").textContent = "Elige tu talla"; return; }
      addToCart(p.id, size); closeOv("prod"); openOv("cart");
    });
  }

  /* ---------- avísame cuando vuelva ---------- */
  function openWait(id, size) {
    const p = byId(id), box = $("#mWaitBox");
    box.innerHTML = `<button class="ibtn mclose" type="button" aria-label="Cerrar" data-close="wait"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg></button>
      <div style="display:grid;grid-template-columns:84px 1fr;gap:14px;align-items:center;margin-bottom:14px"><img src="assets/img/${p.img}-s.webp" alt="" width="84" height="84" style="background:var(--papel-2);border-radius:12px;padding:6px"><div><span class="badge out" style="position:static;display:inline-block;margin-bottom:6px">Agotado</span><h2 class="serif" style="font-weight:500;font-size:26px;line-height:1.05">${label(p)}</h2></div></div>
      <p style="color:var(--suave);margin-bottom:16px">Déjanos tu email y te avisamos <b>en cuanto vuelva</b>. Los miembros del Honor Club reciben el aviso antes que nadie.</p>
      <form id="waitF" novalidate><div class="f"><label for="we">Email</label><input id="we" type="email" placeholder="tu@email.com" autocomplete="email"><div class="err" id="weE"></div></div>
      <div class="f"><label for="ws">Talla</label><select id="ws">${p.sizes.map(s => `<option ${s === size ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <label class="check"><input type="checkbox" id="wc"><span>Acepto recibir este aviso por email.</span></label><div class="err" id="wcE" style="margin:-8px 0 10px"></div>
      <button class="btn btn-dark btn-full" type="submit">Avísame</button></form>`;
    openOv("wait");
    $("#waitF").addEventListener("submit", e => {
      e.preventDefault();
      const em = $("#we").value.trim(), ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em);
      $("#weE").textContent = ok ? "" : "Escribe un email válido"; $("#we").classList.toggle("bad", !ok);
      $("#wcE").textContent = $("#wc").checked ? "" : "Necesitamos tu permiso para avisarte";
      if (!ok || !$("#wc").checked) return;
      const w = store.get("sv_wait", []); w.push({ id, size: $("#ws").value, email: em, t: Date.now() }); store.set("sv_wait", w);
      box.innerHTML = `<div class="ok"><div class="tick"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></div><h2 class="serif" style="font-weight:500;font-size:30px">Apuntado</h2><p style="color:var(--suave);margin:8px 0 18px">Te escribiremos a <b>${em.replace(/[<>&"]/g, "")}</b> cuando vuelva la ${label(p)}.</p><button class="btn btn-dark" type="button" data-close="wait">Perfecto</button><p class="tiny" style="margin-top:14px">En la versión real el aviso se guarda en Shopify y el email sale solo cuando hay stock.</p></div>`;
    });
  }

  /* ---------- checkout (simulado) ---------- */
  function openCheckout() {
    const sub = subtotal(), ship = sub >= FREE_FROM ? 0 : SHIP_ES;
    $("#mCheckBox").innerHTML = `<button class="ibtn mclose" type="button" aria-label="Cerrar" data-close="check"><svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5 5 19"/></svg></button>
      <span class="eyebrow">Demo</span><h2 class="serif" style="font-weight:500;font-size:34px;line-height:1.05;margin:8px 0 12px">Aquí empieza el pago seguro</h2>
      <p style="color:var(--suave)">En la versión real, este botón lleva al <b>checkout de Shopify</b> (tarjeta, Bizum, Apple Pay…), tal y como funciona hoy. Así los pedidos y los pagos siguen igual de estables mientras mejoramos todo lo demás.</p>
      <div class="sum t" style="margin-top:18px"><span>Total del pedido</span><span>${eur(sub + ship)}</span></div>
      <button class="btn btn-dark btn-full" type="button" data-close="check">Entendido, no se cobra nada</button>`;
    openOv("check");
  }

  /* ---------- búsqueda ---------- */
  function renderSearch() {
    const q = norm($("#q").value.trim());
    const list = q ? P.filter(p => norm(p.name + " " + COLL_NAME[p.coll]).includes(q)) : P.slice(0, 5);
    $("#sres").innerHTML = list.length ? list.map(p => `<li><button type="button" data-product="${p.id}"><img src="assets/img/${p.img}-s.webp" alt="" width="54" height="54"><span>${label(p)}</span><b>${eur(p.price)}</b></button></li>`).join("") : `<li style="padding:18px 8px;color:var(--suave)">No encontramos nada con “${$("#q").value.replace(/[<>&"]/g, "")}”. Prueba con “polo”, “sudadera” o “Borgia”.</li>`;
  }

  /* ---------- Honor Club ---------- */
  function initHonor() {
    const f = $("#hc");
    f.addEventListener("submit", e => {
      e.preventDefault();
      const n = $("#hcn").value.trim(), em = $("#hce").value.trim(), c = $("#hcc").checked;
      const okN = n.split(/\s+/).filter(Boolean).length >= 2, okE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em);
      $("#hcnE").textContent = okN ? "" : "Escribe tu nombre y apellidos"; $("#hcn").classList.toggle("bad", !okN);
      $("#hceE").textContent = okE ? "" : "Escribe un email válido"; $("#hce").classList.toggle("bad", !okE);
      $("#hccE").textContent = c ? "" : "Para unirte tienes que aceptar recibir nuestros emails.";
      if (!okN || !okE || !c) return;
      const m = store.get("sv_honor", []); m.push({ n, em, t: Date.now() }); store.set("sv_honor", m);
      const first = n.split(/\s+/)[0].replace(/[<>&"]/g, "");
      $("#hcForm").innerHTML = `<div class="ok"><div class="tick"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></div><h3 class="serif" style="font-weight:500;font-size:34px;line-height:1.05">Ya estás dentro, ${first}</h3><p style="color:var(--suave);margin:10px 0">Cuando alcances un nivel, te llegará un email de bienvenida. Y antes de cada drop, tu aviso con acceso anticipado.</p><p class="tiny">¿Ya has comprado? Inicia sesión para ver cuánto te falta.</p></div>`;
    });
    /* cuenta atrás de ejemplo: próximo viernes a las 19:00 */
    const t = new Date(); t.setHours(19, 0, 0, 0);
    t.setDate(t.getDate() + ((5 - t.getDay() + 7) % 7 || (new Date() > t ? 7 : 0)));
    const cd = $$("#cd b");
    const tick = () => {
      let s = Math.max(0, Math.floor((t - new Date()) / 1000));
      const v = [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
      cd.forEach((b, i) => b.textContent = String(v[i]).padStart(2, "0"));
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- panel «qué hemos mejorado» ---------- */
  let lcp = null;
  try { new PerformanceObserver(l => { const e = l.getEntries(); lcp = e[e.length - 1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch (e) {}
  function perfStats() {
    try {
      const r = performance.getEntriesByType("resource"), n = performance.getEntriesByType("navigation")[0];
      const bytes = r.reduce((a, e) => a + (e.encodedBodySize || 0), 0) + (n ? n.encodedBodySize || 0 : 0);
      if (bytes > 0) return { req: r.length + 1, kb: Math.round(bytes / 1024) };
    } catch (e) {}
    return null;
  }
  function renderTour() {
    const ps = perfStats(), l = lcp ? (lcp / 1000).toFixed(1).replace(".", ",") + " s" : "—";
    const live = ps ? `${ps.req} peticiones · ${ps.kb >= 1024 ? (ps.kb / 1024).toFixed(1).replace(".", ",") + " MB" : ps.kb + " KB"}` : "—";
    $("#tourBody").innerHTML = `
      <p class="tour-intro">Lo que ves es una <b>demo privada</b>: nada se ha publicado en spaceverona.com. Estas son las mejoras que hemos detectado y cómo quedarían.</p>
      <div class="perf">
        <div class="old"><small>Web actual · móvil</small><b>5,9–6,3 s</b><em>carga de la foto principal · 233 peticiones · 2,5 MB · Lighthouse 70/100</em></div>
        <div><small>Esta demo · tu equipo</small><b>${l}</b><em>${live} cargados hasta ahora (las escenas del hero y las fotos de más abajo se piden después)</em></div>
      </div>

      <div class="tour-item"><div class="top"><h4>Imagen de marca grande</h4><span class="pill live">En la demo</span></div>
        <p>Pantalla de carga con vuestra firma, hero a pantalla completa con cuatro escenas de vuestras propias fotos y prendas pinchables («shop the look»), manifiesto, banda en movimiento y animaciones al hacer scroll. El interruptor «Movimiento» de la barra superior permite reducirlo, como pide la accesibilidad.</p></div>

      <div class="tour-item"><div class="top"><h4>Carga rápida en móvil</h4><span class="pill live">En la demo</span></div>
        <p>Imágenes en WebP a su tamaño real, carga diferida, tipografías propias sin pedirlas a Google y cero apps de terceros. Hoy la portada lanza 67 scripts.</p></div>

      <div class="tour-item"><div class="top"><h4>Nombres y textos cuidados</h4><span class="pill live">En la demo</span></div>
        <div class="old">Antes: HERITÁGE · HÉRITAGE · Heritáge · L´arte</div>
        <p>Ahora: <b>Héritage</b> en todas partes y <b>L’arte</b> con apóstrofo. (Confirmaremos con vosotros la grafía definitiva.)</p></div>

      <div class="tour-item"><div class="top"><h4>Pack “Dúo” sugerido en el carrito</h4><span class="pill live">En la demo</span></div>
        <p>Si alguien añade una sola sudadera cropped fit, el carrito le propone completar el pack y le muestra lo que ahorra.</p>
        <button class="link" type="button" data-tour="duo">Pruébalo →</button></div>

      <div class="tour-item"><div class="top"><h4>“Avísame cuando vuelva”</h4><span class="pill live">En la demo</span></div>
        <p>Una talla agotada deja de ser una venta perdida: el cliente se apunta y, en la versión real, le llega el aviso en cuanto hay stock. Además, sabéis qué prendas del Archivio piden más.</p>
        <button class="link" type="button" data-tour="wait">Pruébalo con la SV Venice shirt →</button></div>

      <div class="tour-item"><div class="top"><h4>Asistente de IA 24/7</h4><span class="pill live">En la demo</span></div>
        <p>Contesta tallas, envíos, devoluciones y reposiciones al momento, con vuestra política real, y pasa la conversación a una persona cuando no sabe algo.</p>
        <button class="link" type="button" data-tour="chat">Habla con él →</button></div>

      <div class="tour-item"><div class="top"><h4>QR para el evento del 21 de noviembre</h4><span class="pill live">En la demo</span></div>
        <p>Cada asistente de Etnia se apunta al Honor Club en 20 segundos, recibe su código personal y a las 24 h le llega el email. Vosotros veis cuánto vendió el evento.</p>
        <a class="link" href="evento.html">Ver el piloto →</a></div>

      <div class="tour-item"><div class="top"><h4>Lanzamientos y Honor Club</h4><span class="pill plan">Fase 2</span></div>
        <p>Aviso automático con acceso anticipado antes de cada drop (mira la cuenta atrás del Honor Club), alerta interna de stock bajo e informe semanal de ventas y lanzamientos.</p></div>

      <div class="tour-item"><div class="top"><h4>Correo y dominio</h4><span class="pill dns">Fase 1</span></div>
        <div class="old">Hoy: info.spaceverona@gmail.com · DMARC en p=none y sin buzón de informes</div>
        <p>Correo profesional <b>info@spaceverona.com</b>, SPF y DKIM ajustados, y DMARC endurecido en dos pasos:</p>
        <code>_dmarc  TXT  v=DMARC1; p=none; rua=mailto:dmarc@spaceverona.com</code>
        <code>_dmarc  TXT  v=DMARC1; p=quarantine; rua=mailto:dmarc@spaceverona.com</code>
        <p>Primero 2–4 semanas vigilando los informes y luego se endurece. Evita que alguien suplante vuestro dominio y mejora que los correos lleguen a la bandeja principal.</p></div>

      <div class="tour-item"><div class="top"><h4>Cómo se despliega</h4><span class="pill plan">Plan</span></div>
        <p>Hoy, Shopify como base para pasarela de pago y pedidos. Cuando el proyecto escale, migración a un servidor propio y arquitectura a medida. Mientras tanto, esta demo vive aparte: <b>no se publica nada en vuestra web</b>.</p></div>

      <p class="tour-note">Las cifras de “Web actual” son de Lighthouse móvil sobre spaceverona.com (10/11/2026). Las de la demo se miden ahora mismo en tu navegador, sin simular móvil ni 4G. El stock, los pedidos de ejemplo y la guía de tallas son orientativos hasta conectar Shopify.</p>`;
  }

  /* ---------- asistente ---------- */
  const SHIP = {
    pen: { n: "España peninsular", c: "3,50 €", d: "3–7 días laborables" },
    bal: { n: "Islas Baleares", c: "5,95 €", d: "5–10 días laborables" },
    can: { n: "Canarias, Ceuta y Melilla", c: "9,95 €", d: "5–10 días laborables" },
    ue: { n: "Unión Europea", c: "9,95 €", d: "5–10 días laborables" },
    us: { n: "Estados Unidos", c: "19,95 €", d: "3–7 días laborables" }
  };
  const ORDERS = {
    "1042": "Tu pedido SV-1042 está **preparado** y sale con el transportista mañana. Te mandamos el número de seguimiento por email.",
    "1038": "Tu pedido SV-1038 ya está **en reparto**. Debería llegarte en 1–2 días laborables."
  };
  const SUGG = ["¿Qué talla me pido?", "Gastos y plazos de envío", "Quiero devolver un pedido", "¿Puedo cambiar de talla?", "Estado de mi pedido", "¿Reponéis la SV Venice shirt?"];
  let chatInit = false;

  function cartNudge() {
    const s = subtotal();
    return s > 0 && s < FREE_FROM ? `\n\nPor cierto: llevas ${eur(s)} en el carrito, te faltan ${eur(FREE_FROM - s)} para el envío gratis.` : "";
  }
  function findProducts(t) {
    const map = [["waffle", "waffle-longsleeve-heritage"], ["manga larga", "waffle-longsleeve-heritage"], ["polo", "polo-heritage"], ["negra", "borgia-iii"], ["beige", "borgia-ii"], ["pistach", "borgia-iv"], ["venice", "borgia-i"], ["venecia", "borgia-i"], ["vespa", "longsleeve-vespa-classica"], ["gorra", "gorra-venice"], ["duo", "pack-duoo"], ["pack", "pack-duoo"], ["sudadera", "sudadera-beige-rojo"]];
    const ids = [];
    map.forEach(([k, id]) => { if (t.includes(k) && !ids.includes(id)) ids.push(id); });
    return ids.map(byId);
  }
  function answer(raw) {
    const t = norm(raw);
    const code = raw.match(/sv[-\s]?(\d{3,5})/i);
    if (code) {
      const r = ORDERS[code[1]];
      return r ? { t: r + "\n\n(Pedido de ejemplo: en la versión real lo consulto directamente en Shopify.)", a: [{ l: "Hablar con una persona", q: "hablar con una persona" }] }
        : { t: `No encuentro el pedido SV-${code[1]}. Revisa el número que aparece en tu email de confirmación, o te paso con el equipo.`, a: [{ l: "Hablar con una persona", q: "hablar con una persona" }] };
    }
    if (/^(hola|buenas|hey|buenos|buenas tardes)/.test(t)) return { t: "¡Hola! Soy el asistente de SpaceVerona. Te ayudo con tallas, envíos, devoluciones y el estado de tu pedido. ¿Qué necesitas?" };
    if (/gracias|perfecto|genial|vale/.test(t) && t.length < 40) return { t: "¡A ti! Si necesitas algo más, aquí estoy. Fatto in Spagna, sognato in Italia." };
    if (/(persona|humano|agente|equipo|contacto|queja|reclam|hablar con)/.test(t)) return { t: "Claro, te paso con el equipo. Escríbenos a **info@spaceverona.com** o por Instagram (@spaceverona) y te responden lo antes posible. Ya tienen el resumen de esta conversación para no repetirte nada.", a: [{ l: "Abrir Instagram", url: "https://www.instagram.com/spaceverona" }] };
    if (/(devol|reembols)/.test(t)) return { t: "Tienes **14 días naturales** desde que recibes el pedido, sin dar ningún motivo.\n\n1. Escríbenos a info@spaceverona.com con tu nombre, número de pedido y las prendas.\n2. Las prendas deben estar sin usar ni lavar, con etiquetas y en perfecto estado.\n3. El envío de vuelta lo pagas tú (mejor con seguimiento).\n4. Te reembolsamos en 14 días naturales por el mismo método de pago, incluyendo el envío estándar original.\n\nSi la prenda llega defectuosa o equivocada, el envío corre por nuestra cuenta.", a: [{ l: "Hablar con una persona", q: "hablar con una persona" }] };
    if (/(pedido|seguimiento|tracking|donde esta|estado)/.test(t)) return { t: "Con mucho gusto lo miro. Dime tu **número de pedido** (aparece en el email de confirmación, por ejemplo SV-1042).", a: [{ l: "Probar con SV-1042", q: "SV-1042" }] };
    if (/(cambi)/.test(t)) return { t: "Actualmente **no hacemos cambios directos** de talla o producto. Lo que puedes hacer es solicitar la devolución (tienes 14 días naturales desde que lo recibes) y hacer una nueva compra de la talla que necesites.\n\nSi te da miedo equivocarte de talla, dime tu altura y peso y te oriento." + cartNudge(), a: [{ l: "Quiero devolver", q: "devoluciones" }, { l: "Orientarme con la talla", q: "¿Qué talla me pido?" }] };
    if (/(talla|medida|mido|peso|altura|ajustad|holgad|oversize|me queda|kilos|kg)/.test(t)) {
      const nums = (raw.replace(/,/g, ".").match(/\d+(\.\d+)?/g) || []).map(Number);
      let h = nums.find(n => (n >= 1.45 && n <= 2.2) || (n >= 145 && n <= 220)); if (h && h < 3) h = Math.round(h * 100);
      const w = nums.find(n => n >= 35 && n <= 180 && n !== h && !(n >= 1.45 && n <= 2.2));
      if (h && w) {
        const pref = /ajustad|pegad/.test(t) ? "slim" : /holgad|oversize|amplio|suelto/.test(t) ? "loose" : null;
        const s = recommend(h, w, pref);
        const ps = findProducts(t).filter(p => !p.pack);
        return { t: `Para ${h} cm y ${w} kg te recomiendo la talla **${s}**${pref === "slim" ? " (la has pedido ajustada)" : pref === "loose" ? " (la has pedido más holgada)" : ""}. Nuestras prendas tienen un corte amplio; si la prefieres más ajustada, baja una talla.\n\nEs una orientación. Si dudas entre dos, te paso con el equipo.` + (ps.length ? `\n\n${label(ps[0])}: ${ps[0].sold ? "ahora mismo está agotada." : "disponible en tu talla."}` : ""), a: ps.length && !ps[0].sold ? [{ l: "Ver " + label(ps[0]), p: ps[0].id }] : [] };
      }
      return { t: "Te oriento encantado. Dime tu **altura y peso** (por ejemplo: «mido 1,78 y peso 75») y si prefieres la prenda ajustada o holgada." };
    }
    if (/(agotad|repon|reposicion|volver|stock|disponible|queda|quedan)/.test(t) || (findProducts(t).length && /(hay|tenei|teneis|tienes)/.test(t))) {
      const ps = findProducts(t);
      if (ps.length) {
        const p = ps[0];
        return p.sold ? { t: `La ${label(p)} está agotada ahora mismo y no tengo una fecha de reposición confirmada. Si quieres, te apunto para que te avisemos **en cuanto vuelva**; los miembros del Honor Club se enteran antes.`, a: [{ l: "Avísame cuando vuelva", w: p.id }] }
          : { t: `Sí, la ${label(p)} está disponible ahora mismo.` + cartNudge(), a: [{ l: "Ver " + label(p), p: p.id }] };
      }
      return { t: "Dime qué prenda buscas y te digo si está disponible. Si algo está agotado, puedo avisarte cuando vuelva." };
    }
    if (/(duo|pack)/.test(t)) return { t: "El **pack “Dúo”** incluye las dos sudaderas cropped fit de Amore Eterno (beige y marrón chocolate) por **79,99 €** en vez de 90 €: ahorras 10,01 €. La talla que elijas se aplica a las dos.", a: [{ l: "Ver el pack", p: "pack-duoo" }] };
    if (/(honor|club|socio|acceso anticipado)/.test(t)) return { t: "El **Honor Club** te da acceso anticipado a los drops y ventajas exclusivas. Tiene dos niveles, Cliente de honor y Socio de honor, y cuando alcances uno te llega un email de bienvenida. Apuntarse es gratis y te da de baja cuando quieras.", a: [{ l: "Unirme", goto: "#honor" }] };
    if (/(codigo|descuento|cupon|promo)/.test(t)) return { t: "Los códigos de descuento llegan por email: a quien se apunta al Honor Club en un evento, por ejemplo, le enviamos un código personal. Si has perdido el tuyo, te paso con el equipo.", a: [{ l: "Hablar con una persona", q: "hablar con una persona" }] };
    if (/(envio|enviar|enviais|gastos|cuanto tarda|entrega|llega|plazo|canarias|baleares|estados unidos|eeuu|internacional|europa|aduana)/.test(t)) {
      let z = null;
      if (/canarias|ceuta|melilla/.test(t)) z = "can"; else if (/baleares|mallorca|ibiza|menorca/.test(t)) z = "bal"; else if (/estados unidos|eeuu|usa/.test(t)) z = "us"; else if (/europa|union europea|francia|italia|alemania|portugal/.test(t)) z = "ue";
      const prep = "Preparamos cada pedido a mano en **1–3 días laborables** (en lanzamientos puede tardar un poco más).";
      if (z) { const s = SHIP[z]; return { t: `${s.n}: **${s.c}** y entre ${s.d} desde que sale del almacén.\n${prep}${z === "can" || z === "us" ? "\nOjo: a ese destino pueden aplicarse aranceles o impuestos que paga el cliente." : ""}` + cartNudge() }; }
      return { t: `Envío **gratis a partir de 60 €** (España peninsular).\n\n` + Object.values(SHIP).map(s => `• ${s.n}: ${s.c} · ${s.d}`).join("\n") + `\n\n${prep}` + cartNudge(), a: [{ l: "Ver mi carrito", cart: 1 }] };
    }
    return { t: "Eso no lo tengo claro y prefiero no inventármelo. Te paso con el equipo para que te respondan bien: **info@spaceverona.com** o por Instagram (@spaceverona).", a: [{ l: "Abrir Instagram", url: "https://www.instagram.com/spaceverona" }, { l: "Ver preguntas frecuentes", q: "Gastos y plazos de envío" }] };
  }
  function bubble(who, text, acts) {
    const b = $("#chBody"), d = document.createElement("div");
    d.className = "msg " + who;
    /* **negrita** sin innerHTML con texto del usuario */
    text.split(/(\*\*[^*]+\*\*)/g).forEach(part => {
      if (part.startsWith("**")) { const s = document.createElement("b"); s.textContent = part.slice(2, -2); d.appendChild(s); }
      else d.appendChild(document.createTextNode(part));
    });
    if (acts && acts.length) {
      const w = document.createElement("div"); w.className = "acts";
      acts.forEach(a => {
        const btn = document.createElement("button"); btn.type = "button"; btn.textContent = a.l;
        btn.addEventListener("click", () => {
          if (a.q) ask(a.q); else if (a.p) { closeChat(); openProduct(a.p); } else if (a.w) { closeChat(); openWait(a.w); }
          else if (a.cart) { closeChat(); openOv("cart"); } else if (a.goto) { closeChat(); location.hash = a.goto; } else if (a.url) window.open(a.url, "_blank", "noopener");
        });
        w.appendChild(btn);
      });
      d.appendChild(w);
    }
    b.appendChild(d); b.scrollTop = b.scrollHeight;
  }
  function ask(text) {
    text = text.trim(); if (!text) return;
    bubble("me", text);
    const b = $("#chBody"), ty = document.createElement("div"); ty.className = "typing"; ty.innerHTML = "<i></i><i></i><i></i>";
    b.appendChild(ty); b.scrollTop = b.scrollHeight;
    const r = answer(text);
    setTimeout(() => { ty.remove(); bubble("bot", r.t, r.a); }, 550 + Math.min(r.t.length * 3, 650));
  }
  function openChat(first) {
    const c = $("#chat"); c.classList.add("on"); c.setAttribute("aria-hidden", "false"); $("#chatOpen").style.display = "none";
    if (!chatInit) {
      chatInit = true;
      bubble("bot", "¡Hola! Soy el asistente de SpaceVerona. Te contesto al momento sobre tallas, envíos, devoluciones y pedidos. Si no sé algo, te paso con el equipo.");
      $("#sugg").innerHTML = SUGG.map(s => `<button type="button">${s}</button>`).join("");
      $$("#sugg button").forEach(b => b.addEventListener("click", () => ask(b.textContent)));
    }
    if (first) ask(first); else setTimeout(() => $("#chIn").focus({ preventScroll: true }), 300);
  }
  function closeChat() { const c = $("#chat"); c.classList.remove("on"); c.setAttribute("aria-hidden", "true"); $("#chatOpen").style.display = ""; }

  /* ---------- eventos globales ---------- */
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-open],[data-close],[data-filter],[data-product],[data-wait],[data-f],[data-q],[data-rm],[data-duo],[data-checkout],[data-addgorra],[data-tour],[data-ask],[data-goto]");
    if (!t) return;
    const d = t.dataset;
    if (d.open) { e.preventDefault(); openOv(d.open); return; }
    if (d.close) { closeOv(d.close); if (d.goto) { location.hash = d.goto; } if (d.filter) setFilter(d.filter); if (t.tagName === "A") { /* el ancla navega sola */ } return; }
    if (d.f) { setFilter(d.f); return; }
    if (d.filter) { setFilter(d.filter); return; }
    if (d.product) { e.preventDefault(); closeOv("search"); openProduct(d.product); return; }
    if (d.wait) { e.preventDefault(); openWait(d.wait); return; }
    if (d.q) { const [i, dl] = d.q.split(":").map(Number), l = cart[i]; l.qty += dl; if (l.qty <= 0) cart.splice(i, 1); saveCart(); updCount(); renderCart(); return; }
    if (d.rm !== undefined) { cart.splice(+d.rm, 1); saveCart(); updCount(); renderCart(); return; }
    if (d.duo !== undefined) { const l = cart[+d.duo]; const s = l.size; l.qty -= 1; if (l.qty <= 0) cart.splice(+d.duo, 1); addToCart("pack-duoo", s); renderCart(); toast("Pack Dúo añadido. ¡Ahorras 10,01 €!"); return; }
    if (d.addgorra !== undefined) { addToCart("gorra-venice", "Única"); renderCart(); toast("Gorra Venice Verde añadida"); return; }
    if (d.checkout !== undefined) { openCheckout(); return; }
    if (d.ask) { e.preventDefault(); openChat(d.ask === "hablar con una persona" ? "Quiero hablar con una persona" : d.ask === "cambio de talla" ? "¿Puedo cambiar de talla?" : d.ask === "devoluciones" ? "¿Cómo hago una devolución?" : "Gastos y plazos de envío"); return; }
    if (d.tour) {
      closeOv("tour");
      if (d.tour === "duo") { cart = cart.filter(l => l.id !== "pack-duoo" && !HOODIES.includes(l.id)); addToCart("sudadera-beige-rojo", "M"); updCount(); setTimeout(() => openOv("cart"), 350); }
      if (d.tour === "wait") setTimeout(() => openWait("borgia-i"), 350);
      if (d.tour === "chat") setTimeout(() => openChat(), 350);
    }
  });
  $("#scrim").addEventListener("click", () => closeAll());
  $$(".modal").forEach(m => m.addEventListener("click", e => { if (e.target === m) { const n = Object.keys(OV).find(k => OV[k] === "#" + m.id); if (n) closeOv(n); } }));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") { if ($("#chat").classList.contains("on") && !opened.length) closeChat(); else if (opened.length) closeOv(opened[opened.length - 1]); }
  });
  $("#chatOpen").addEventListener("click", () => openChat());
  $("#chatClose").addEventListener("click", closeChat);
  $("#chForm").addEventListener("submit", e => { e.preventDefault(); const i = $("#chIn"); const v = i.value; i.value = ""; ask(v); });
  $("#q").addEventListener("input", renderSearch);
  new MutationObserver(() => { if ($("#mSearch").classList.contains("on")) { $("#q").value = ""; renderSearch(); } }).observe($("#mSearch"), { attributes: true, attributeFilter: ["class"] });

  /* ---------- arranque ---------- */
  renderFilters(); renderGrid(); updCount(); initHonor();
  if (location.hash === "#asistente") setTimeout(() => openChat(), 600); /* enlace directo al asistente (lo usa la página de diagnóstico) */
})();
