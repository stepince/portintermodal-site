import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('.');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml' };
const pages = new Set(['index.html', 'platform/index.html', 'features/index.html', 'progress/index.html', 'roadmap/index.html', 'demo/index.html', 'contact/index.html', 'reduce-trucking-software-costs/index.html']);
const files = new Set(['styles.css', 'script.js', 'robots.txt', 'sitemap.xml', 'favicon.svg', 'calculator.js']);

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    else if (!extname(path)) { res.writeHead(301, { Location: path + '/' }).end(); return; }
    const file = resolve(root, '.' + path);
    const rel = file.slice(root.length + 1);
    if (!file.startsWith(root + sep) || !(pages.has(rel) || files.has(rel) || file.startsWith(resolve(root, 'assets') + sep))) {
      res.writeHead(404).end('Not found'); return;
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(await readFile(file));
  } catch { res.writeHead(404).end('Not found'); }
}).listen(process.env.PORT || 3000, '127.0.0.1', () => console.log(`PortIntermodal website: http://localhost:${process.env.PORT || 3000}`));
