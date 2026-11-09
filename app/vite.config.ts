import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const venuesDir = join(root, 'src/data/venues');
const outDir = join(root, 'dist');

interface SiteFile {
  artistName: string;
  pagesOrigin: string;
}

interface VenueFile {
  id: string;
  name: string;
  shareImage?: string;
  walls?: { photo?: string }[];
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

function resolveShareImagePath(venue: VenueFile): string {
  if (venue.shareImage) return venue.shareImage.replace(/^\//, '');
  const wallPhoto = venue.walls?.find((w) => w.photo)?.photo;
  if (wallPhoto) return wallPhoto.replace(/^\//, '');
  return 'art/harbor-dusk.svg';
}

function injectShareMeta(
  html: string,
  opts: { title: string; description: string; imageUrl: string; pageUrl: string },
): string {
  const block = `
    <meta name="description" content="${escapeHtml(opts.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(opts.title)}" />
    <meta property="og:description" content="${escapeHtml(opts.description)}" />
    <meta property="og:image" content="${escapeHtml(opts.imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(opts.pageUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(opts.title)}" />
    <meta name="twitter:description" content="${escapeHtml(opts.description)}" />
    <meta name="twitter:image" content="${escapeHtml(opts.imageUrl)}" />
`;
  if (html.includes('property="og:title"')) return html;
  return html.replace('</head>', `${block}</head>`);
}

function shareDescription(venueName: string): string {
  return `See how each piece fits on the walls at ${venueName}, at real size.`;
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

      const origin = site.pagesOrigin.replace(/\/?$/, '/');
      for (const file of readdirSync(venuesDir)) {
        if (!file.endsWith('.json') || file.startsWith('_')) continue;
        const id = file.slice(0, -'.json'.length);
        const venue = readJson<VenueFile>(join(venuesDir, file));
        const title = `Artwork by ${site.artistName} for ${venue.name}`;
        const description = shareDescription(venue.name);
        const imageUrl = `${origin}${resolveShareImagePath(venue)}`;
        const pageUrl = `${origin}v/${id}/`;
        let page = withTitle(html, title);
        page = injectShareMeta(page, { title, description, imageUrl, pageUrl });
        const pageDir = join(outDir, 'v', id);
        mkdirSync(pageDir, { recursive: true });
        writeFileSync(join(pageDir, 'index.html'), page);
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
