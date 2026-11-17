// Animaciones sutiles de toda la web (sin librerías). Todo se desactiva si la persona ha pedido "reducir movimiento".
//  · barra de progreso de lectura arriba del todo
//  · parallax suave de los fondos de la portada ([data-parallax])
//  · foco de luz que sigue al ratón en las tarjetas
//  · inclinación 3D del móvil de la portada ([data-tilt])
const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
const raton = matchMedia('(hover: hover) and (pointer: fine)').matches;

if (!reducir) {
  // ── Barra de progreso + parallax (un solo "scroll" optimizado con requestAnimationFrame) ──
  const barra = document.getElementById('progreso');
  const parallax = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  let esperando = false;
  const actualizar = () => {
    esperando = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (barra) barra.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    if (scrollY < 1400) parallax.forEach((p) => { p.style.transform = `translate3d(0, ${(scrollY * Number(p.dataset.parallax)).toFixed(1)}px, 0)`; });
  };
  addEventListener('scroll', () => { if (!esperando) { esperando = true; requestAnimationFrame(actualizar); } }, { passive: true });
  actualizar();

  if (raton) {
    // ── Foco de luz en tarjetas: la variable --mx/--my la usa el CSS (.card-link::after y .plan::after) ──
    document.addEventListener('pointermove', (e) => {
      const t = (e.target as Element | null)?.closest?.<HTMLElement>('.card-link, .plan');
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${e.clientX - r.left}px`);
      t.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });

    // ── Inclinación 3D (p. ej. el móvil de la portada) ──
    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
      const max = Number(el.dataset.tilt) || 6;
      let raf = 0;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transition = 'transform 0.12s ease-out';
          el.style.transform = `perspective(900px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
        });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.transform = '';
      });
    });
  }
}
