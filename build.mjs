import { mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { minify as minifyHtml } from 'html-minifier-terser';
import { minify as minifyJs } from 'terser';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });

export const pages = ['index.html', 'platform/index.html', 'features/index.html', 'progress/index.html', 'roadmap/index.html', 'demo/index.html', 'contact/index.html'];

for (const file of pages) {
  const source = await readFile(file, 'utf8');
  const minified = await minifyHtml(source, { collapseWhitespace: true, removeComments: true, minifyCSS: true, minifyJS: true });
  await mkdir(`dist/${file.slice(0, file.lastIndexOf('/') + 1)}`, { recursive: true });
  await writeFile(`dist/${file}`, minified);
}

await writeFile('dist/script.js', (await minifyJs(await readFile('script.js', 'utf8'))).code);
for (const f of ['styles.css', 'robots.txt', 'sitemap.xml', 'favicon.svg', 'CNAME']) await cp(f, `dist/${f}`);
// Optional folder for screenshots and other media
await cp('assets', 'dist/assets', { recursive: true }).catch(() => {});

console.log('Built static website in dist/');
