import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://tuagencia.tech',
  trailingSlash: 'ignore',
  integrations: [sitemap({ filter: (page) => !page.includes('/area-cliente') })],
});
