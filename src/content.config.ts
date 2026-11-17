// Colección del blog: los artículos son archivos .md en src/content/blog/
// Con `draft: true` NO se publican (solo se ven con `npm run dev`).
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(110),
    description: z.string().min(50).max(170),
    fecha: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
    autor: z.enum(['Pablo Villalvilla Martín', 'Jorge Jiménez Gutiérrez', 'Rodrigo López Soriano']),
    draft: z.boolean().default(false),
    solucion: z.string().optional(), // slug de src/data/soluciones.ts
    sector: z.string().optional(), // slug de src/data/sectores.ts
    cta: z.enum(['reservar', 'informe']).default('reservar'),
    faq: z.array(z.object({ p: z.string(), r: z.string() })).optional(),
  }),
});

export const collections = { blog };
