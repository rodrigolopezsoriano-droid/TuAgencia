// Utilidades del blog (listado, tiempo de lectura…)
import { getCollection, type CollectionEntry } from 'astro:content';

export type Articulo = CollectionEntry<'blog'>;

/** Artículos publicados, del más reciente al más antiguo. Los borradores solo salen con `npm run dev`. */
export async function articulosPublicados(): Promise<Articulo[]> {
  const todos = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return todos.sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime());
}

/** Minutos de lectura (≈ 200 palabras por minuto, mínimo 1). */
export const minutosLectura = (texto = '') => Math.max(1, Math.round(texto.split(/\s+/).filter(Boolean).length / 200));

export const fechaLarga = (d: Date) =>
  new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
