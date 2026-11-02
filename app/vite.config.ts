import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const venuesDir = join(root, 'src/data/venues');
const outDir = join(root, 'dist');

interface SiteFile {
  artistName: string;
}

interface VenueFile {
  name: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function withTitle(html: string, title: string): string {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
}

/**
 * GitHub Pages only serves real files, so every venue gets its own
 * `v/<id>/index.html` (deep links survive refresh) plus a `404.html`.
 */
function venuePages(): Plugin {
  return {
    name: 'venue-pages',
    transformIndexHtml(html) {
      const site = readJson<SiteFile>(join(root, 'src/data/site.json'));
      return withTitle(html, `Artwork by ${site.artistName}`);
    },
    closeBundle() {
      const site = readJson<SiteFile>(join(root, 'src/data/site.json'));
      const html = readFileSync(join(outDir, 'index.html'), 'utf8');

      for (const file of readdirSync(venuesDir)) {
        if (!file.endsWith('.json') || file.startsWith('_')) continue;
        const id = file.slice(0, -'.json'.length);
        const venue = readJson<VenueFile>(join(venuesDir, file));
        const pageDir = join(outDir, 'v', id);
        mkdirSync(pageDir, { recursive: true });
        writeFileSync(
          join(pageDir, 'index.html'),
          withTitle(html, `Artwork by ${site.artistName} for ${venue.name}`),
        );
      }

      writeFileSync(join(outDir, '404.html'), html);
    },
  };
}

export default defineConfig({
  base: '/3d-gallery/',
  plugins: [venuePages()],
  server: { host: true },
  build: {
    // Three.js alone is ~550 kB minified. The real budget is 500 kB gzip (FEAT-07 REQ-07-03).
    chunkSizeWarningLimit: 800,
  },
});
