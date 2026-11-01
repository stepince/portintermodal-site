// Contact form backend: validates a JSON POST and emails it to the contact address through Resend.
import { createServer } from 'node:http';

const env = process.env;
const config = () => ({
  apiKey: env.RESEND_API_KEY,
  apiUrl: env.RESEND_API_URL || 'https://api.resend.com/emails',
  to: env.CONTACT_TO || 'contact@portintermodal.com',
  from: env.CONTACT_FROM || 'PortIntermodal Website <website@portintermodal.com>',
  origins: (env.ALLOWED_ORIGINS || 'https://portintermodal.com,https://www.portintermodal.com').split(','),
  perIpPerHour: Number(env.RATE_LIMIT_PER_IP_HOUR || 5),
  perDay: Number(env.RATE_LIMIT_PER_DAY || 100),
});

const TOPICS = ['Demo request', 'Early access inquiry', 'Product feedback', 'Development collaboration'];
const HOUR = 3600e3, DAY = 24 * HOUR;
const hits = new Map(); // ip -> timestamps (ms)
let daily = [];

function rateLimited(ip, cfg, now = Date.now()) {
  daily = daily.filter(t => now - t < DAY);
  const recent = (hits.get(ip) || []).filter(t => now - t < HOUR);
  if (recent.length >= cfg.perIpPerHour || daily.length >= cfg.perDay) { hits.set(ip, recent); return true; }
  recent.push(now); hits.set(ip, recent); daily.push(now);
  return false;
}
setInterval(() => { const now = Date.now(); for (const [ip, ts] of hits) if (!ts.some(t => now - t < HOUR)) hits.delete(ip); }, HOUR).unref();

const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');

export function validate(body) {
  const d = { name: clean(body.name, 100), email: clean(body.email, 254), company: clean(body.company, 150), topic: clean(body.topic, 50), message: clean(body.message, 5000) };
  const errors = {};
  if (!d.name) errors.name = 'Enter your name.';
  if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(d.email)) errors.email = 'Enter a valid email address.';
  if (!TOPICS.includes(d.topic)) errors.topic = 'Choose a topic.';
  if (d.message.length < 10) errors.message = 'Enter a message of at least 10 characters.';
  return { data: d, errors };
}

const send = (res, status, obj, headers = {}) => res.writeHead(status, { 'Content-Type': 'application/json', ...headers }).end(JSON.stringify(obj));

async function readJson(req, limit = 16 * 1024) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('too large'), { status: 413 }); chunks.push(c); }
  try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (v && typeof v === 'object' && !Array.isArray(v)) return v; } catch {}
  throw Object.assign(new Error('bad json'), { status: 400 });
}

export function createApp() {
  return createServer(async (req, res) => {
    const cfg = config();
    const origin = req.headers.origin;
    const cors = origin && cfg.origins.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } : { Vary: 'Origin' };
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/healthz') return send(res, 200, { ok: true });
    if (path !== '/api/contact') return send(res, 404, { error: 'Not found' });
    if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, cors);
    if (origin && !cfg.origins.includes(origin)) return send(res, 403, { error: 'Forbidden' }, cors);
    try {
      const body = await readJson(req);
      if (clean(body.website, 200)) return send(res, 200, { ok: true }, cors); // honeypot: pretend success, send nothing
      const { data, errors } = validate(body);
      if (Object.keys(errors).length) return send(res, 422, { error: 'Please check the form.', errors }, cors);
      const ip = req.headers['fly-client-ip'] || req.socket.remoteAddress || 'unknown';
      if (rateLimited(ip, cfg)) return send(res, 429, { error: 'Too many messages. Please try again later.' }, { ...cors, 'Retry-After': '3600' });
      if (!cfg.apiKey) { console.error('RESEND_API_KEY is not set'); return send(res, 503, { error: 'Email is not configured.' }, cors); }
      const text = `${data.message}\n\n--\n${data.name}${data.company ? `, ${data.company}` : ''}\n${data.email}\nTopic: ${data.topic}\nIP: ${ip}\n`;
      const r = await fetch(cfg.apiUrl, {
        method: 'POST', headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ from: cfg.from, to: [cfg.to], reply_to: data.email, subject: `${data.topic} — PortIntermodal website`, text }),
      });
      if (!r.ok) { console.error('Resend error', r.status, (await r.text()).slice(0, 300)); return send(res, 502, { error: 'Could not send your message.' }, cors); }
      return send(res, 200, { ok: true }, cors);
    } catch (e) {
      if (e.status) return send(res, e.status, { error: e.status === 413 ? 'Message too large.' : 'Invalid request.' }, cors);
      console.error(e); return send(res, 500, { error: 'Server error.' }, cors);
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(env.PORT || 8080);
  createApp().listen(port, '0.0.0.0', () => console.log(`email-api listening on ${port}`));
}
