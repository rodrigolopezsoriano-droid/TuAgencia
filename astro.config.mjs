import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

// El listado /blog solo entra en el sitemap si hay algún artículo publicado (sin `draft: true`)
const BLOG = './src/content/blog';
const hayArticulos =
  existsSync(BLOG) &&
  readdirSync(BLOG).some((f) => f.endsWith('.md') && !/^draft: *true *$/m.test(readFileSync(`${BLOG}/${f}`, 'utf8')));
const esListadoBlog = (url) => url.endsWith('/blog') || url.endsWith('/blog/');

export default defineConfig({
  site: 'https://tuagencia.tech',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/area-cliente') && (hayArticulos || !esListadoBlog(page)) })],
});
