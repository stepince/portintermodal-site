// Runs the contact API against a fake Resend server. No real mail is sent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from './server.mjs';

const listen = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(`http://127.0.0.1:${s.address().port}`)));
const sent = [];
let resendStatus = 200;
const fake = createServer(async (req, res) => {
  let b = ''; for await (const c of req) b += c;
  sent.push({ auth: req.headers.authorization, body: JSON.parse(b) });
  res.writeHead(resendStatus).end('{}');
});
const fakeUrl = await listen(fake);
Object.assign(process.env, { RESEND_API_KEY: 'test-key', RESEND_API_URL: fakeUrl, RATE_LIMIT_PER_IP_HOUR: '3' });
const api = await listen(createApp());

const good = { name: 'Ada', email: 'ada@example.com', company: 'Acme', topic: 'Demo request', message: 'Hello, I would like a demo.' };
const post = (body, headers = {}) => fetch(`${api}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://portintermodal.com', ...headers }, body: JSON.stringify(body) });

test('valid submission is emailed to contact@portintermodal.com', async () => {
  const r = await post(good);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), 'https://portintermodal.com');
  const m = sent.at(-1);
  assert.equal(m.auth, 'Bearer test-key');
  assert.deepEqual(m.body.to, ['contact@portintermodal.com']);
  assert.equal(m.body.reply_to, 'ada@example.com');
  assert.match(m.body.text, /Hello, I would like a demo\./);
});
test('honeypot sends nothing', async () => {
  const n = sent.length;
  assert.equal((await post({ ...good, website: 'http://spam' })).status, 200);
  assert.equal(sent.length, n);
});
test('validation rejects bad input and header injection', async () => {
  for (const bad of [{ ...good, email: 'nope' }, { ...good, email: 'a@b.com\nBcc: x@y.com' }, { ...good, name: '' }, { ...good, topic: 'Free money' }, { ...good, message: 'hi' }]) {
    const r = await post(bad); assert.equal(r.status, 422);
  }
});
test('disallowed origin is refused', async () => {
  assert.equal((await post(good, { Origin: 'https://evil.example' })).status, 403);
});
test('upstream failure gives 502', async () => {
  resendStatus = 500;
  assert.equal((await post(good, { 'Fly-Client-IP': '9.9.9.9' })).status, 502);
  resendStatus = 200;
});
test('rate limit per IP', async () => {
  const h = { 'Fly-Client-IP': '1.2.3.4' };
  const codes = []; for (let i = 0; i < 4; i++) codes.push((await post(good, h)).status);
  assert.deepEqual(codes, [200, 200, 200, 429]);
});
test('done', () => setImmediate(() => process.exit(0)));
