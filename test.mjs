// Sanity checks on the built site: every page has title, description, canonical, and valid JSON-LD; sitemap matches pages.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const pages = { 'index.html': '/', 'platform/index.html': '/platform/', 'features/index.html': '/features/', 'progress/index.html': '/progress/', 'roadmap/index.html': '/roadmap/', 'demo/index.html': '/demo/', 'contact/index.html': '/contact/' };
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
for (const [file, path] of Object.entries(pages)) {
  const html = await readFile(`dist/${file}`, 'utf8');
  assert.match(html, /<title>[^<]+<\/title>/, `${file}: title`);
  assert.match(html, /<meta name="description" content="[^"]{50,}/, `${file}: description`);
  assert.ok(html.includes(`<link rel="canonical" href="https://portintermodal.com${path}">`), `${file}: canonical`);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${file}: exactly one h1`);
  JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.ok(sitemap.includes(`<loc>https://portintermodal.com${path}</loc>`), `${file}: in sitemap`);
}
console.log('All page checks passed.');
