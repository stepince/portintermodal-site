// Sanity checks on the built site: every page has title, description, canonical, and valid JSON-LD; sitemap matches pages.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const pages = { 'index.html': '/', 'platform/index.html': '/platform/', 'features/index.html': '/features/', 'progress/index.html': '/progress/', 'roadmap/index.html': '/roadmap/', 'demo/index.html': '/demo/', 'contact/index.html': '/contact/', 'reduce-trucking-software-costs/index.html': '/reduce-trucking-software-costs/' };
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

// New page: structured data, internal links, nav, calculator
const cost = await readFile('dist/reduce-trucking-software-costs/index.html', 'utf8');
const ld = JSON.parse(cost.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].map(n => n['@type']);
assert.deepEqual(ld, ['WebPage', 'BreadcrumbList', 'FAQPage']);
assert.ok(cost.includes('<title>Reduce Trucking Software Costs | Intermodal TMS – PortIntermodal</title>'), 'cost: title');
assert.ok(cost.includes('property="og:url"') && cost.includes('name="twitter:title"'), 'cost: social tags');
assert.ok(!/aggregateRating|"Offer"|"price"/.test(cost), 'cost: no rating or price markup');
for (const file of Object.keys(pages)) {
  const html = await readFile(`dist/${file}`, 'utf8');
  assert.ok(html.includes('href="/reduce-trucking-software-costs/"'), `${file}: links to cost page`);
}
// Every internal link and fragment resolves
const known = new Set(Object.values(pages)); const htmls = {};
for (const [file, path] of Object.entries(pages)) htmls[path] = await readFile(`dist/${file}`, 'utf8');
for (const [path, html] of Object.entries(htmls)) for (const m of html.matchAll(/href="(\/[^"#]*)(?:#([^"]+))?"/g)) {
  const [, p, frag] = m;
  if (/\.\w+$/.test(p)) continue;
  assert.ok(known.has(p), `${path}: broken link ${p}`);
  if (frag) assert.ok(htmls[p].includes(`id="${frag}"`), `${path}: missing anchor ${p}#${frag}`);
}
// Calculator formulas
const { calculate } = await import('./calculator.js');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
let r = calculate({ currentTms: 1500, currentVisibility: 800, newTms: 1000, newVisibility: 500, implementation: 2000 });
near(r.monthlySavings, 800); near(r.annualSavings, 9600); near(r.firstYearNet, 7600); near(r.percent, 800 / 2300 * 100);
r = calculate({}); assert.equal(r.monthlySavings, 0); assert.equal(r.percent, null); near(r.firstYearNet, 0);
r = calculate({ currentTms: 0, newTms: 500 }); near(r.monthlySavings, -500); near(r.firstYearNet, -6000); assert.equal(r.percent, null);
r = calculate({ currentTms: 1000, newTms: 1500, implementation: 1000 }); near(r.monthlySavings, -500); near(r.percent, -50); near(r.firstYearNet, -7000);
r = calculate({ currentTms: '1,000', newTms: 'abc', implementation: '' }); near(r.monthlySavings, 1000);
r = calculate({ currentTms: 5e9, newTms: 1e9, implementation: 1e6 }); near(r.firstYearNet, 4e9 * 12 - 1e6);
r = calculate({ currentTms: 100, newTms: 50, implementation: 5000 }); assert.ok(r.annualSavings > 0 && r.firstYearNet < 0);
console.log('All page checks passed.');
