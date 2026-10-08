import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAccess, resetKeyCache, TEAM_DOMAIN, DEFAULT_AUD, ALLOWED_EMAIL } from '../functions/_access.js';
import { onRequest } from '../functions/_middleware.js';

// Tests pass the AUD through env so they hold before and after the real AUD is filled in.
const AUD = 'test-aud';

const NOW = Date.UTC(2026, 8, 13, 16, 0, 0);
const sec = Math.floor(NOW / 1000);
const b64url = (data) => Buffer.from(data).toString('base64url');

async function makeKey(kid) {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  return { kid, privateKey: pair.privateKey, jwk: { kty: jwk.kty, n: jwk.n, e: jwk.e, kid, alg: 'RS256' } };
}

async function sign(key, payload, header = { alg: 'RS256', kid: key.kid, typ: 'JWT' }) {
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(new Uint8Array(sig))}`;
}

const claims = (over = {}) => ({
  iss: TEAM_DOMAIN, aud: [AUD], email: ALLOWED_EMAIL, exp: sec + 3600, iat: sec - 60, nbf: sec - 60, ...over,
});

function request(token, { host = 'thai-letters.pages.dev', headers = {} } = {}) {
  const h = new Headers(headers);
  if (token) h.set('cookie', `theme=dark; CF_Authorization=${token}`);
  return new Request(`https://${host}/audio/book/ก.mp3`, { headers: h });
}

let key;
let impostor;
let fetchCalls;
const fetchImpl = async (url) => {
  fetchCalls.push(url);
  return new Response(JSON.stringify({ keys: [key.jwk] }), { status: 200 });
};
const verify = (req, env = { ACCESS_AUD: AUD }) => verifyAccess(req, env, { fetchImpl, now: NOW });

test.before(async () => {
  key = await makeKey('k1');
  impostor = await makeKey('k1'); // 同 kid、不同私鑰
});

test.beforeEach(() => {
  resetKeyCache();
  fetchCalls = [];
});

test('合法 token 通過，公鑰從寫死的網址抓', async () => {
  assert.equal(await verify(request(await sign(key, claims()))), ALLOWED_EMAIL);
  assert.deepEqual(fetchCalls, [`${TEAM_DOMAIN}/cdn-cgi/access/certs`]);
});

test('cf-access-jwt-assertion header 也要驗簽才算數', async () => {
  const token = await sign(key, claims());
  assert.equal(await verify(request(null, { headers: { 'cf-access-jwt-assertion': token } })), ALLOWED_EMAIL);
  assert.equal(await verify(request(null, { headers: { 'cf-access-jwt-assertion': 'x.y.z' } })), null);
});

test('沒有 cookie → 拒絕', async () => {
  assert.equal(await verify(request(null)), null);
});

test('只帶偽造的 email header → 拒絕', async () => {
  const req = request(null, { headers: { 'cf-access-authenticated-user-email': ALLOWED_EMAIL } });
  assert.equal(await verify(req), null);
});

test('亂填的 token → 拒絕', async () => {
  assert.equal(await verify(request('abc.def')), null);
  assert.equal(await verify(request('a.b.c')), null);
});

test('iss 指向別的網域 → 拒絕，而且不會去那個網域抓公鑰', async () => {
  const token = await sign(key, claims({ iss: 'https://evil.example.com' }));
  assert.equal(await verify(request(token)), null);
  assert.deepEqual(fetchCalls, []);
});

test('aud 不對 → 拒絕', async () => {
  assert.equal(await verify(request(await sign(key, claims({ aud: ['other-app'] })))), null);
});

test('沒設定 AUD（還沒建立 Access）→ 一律拒絕', async () => {
  const token = await sign(key, claims({ aud: [DEFAULT_AUD] }));
  if (!DEFAULT_AUD) assert.equal(await verify(request(token), {}), null);
});

test('過期 → 拒絕', async () => {
  assert.equal(await verify(request(await sign(key, claims({ exp: sec - 1 })))), null);
});

test('email 不對 → 拒絕', async () => {
  assert.equal(await verify(request(await sign(key, claims({ email: 'someone@gmail.com' })))), null);
});

test('同 kid 但別把私鑰簽的 → 拒絕', async () => {
  assert.equal(await verify(request(await sign(impostor, claims()))), null);
});

test('alg none → 拒絕', async () => {
  const h = b64url(JSON.stringify({ alg: 'none', kid: 'k1' }));
  const p = b64url(JSON.stringify(claims()));
  assert.equal(await verify(request(`${h}.${p}.`)), null);
});

test('找不到 kid → 拒絕', async () => {
  const token = await sign(key, claims(), { alg: 'RS256', kid: 'unknown' });
  assert.equal(await verify(request(token)), null);
});

test('middleware：沒登入回 401，不會執行後面的回應', async () => {
  let called = false;
  const res = await onRequest({ request: request(null), env: { ACCESS_AUD: AUD }, next: async () => { called = true; } });
  assert.equal(res.status, 401);
  assert.equal(called, false);
});

test('middleware：登入後照常回應', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    const res = await onRequest({ request: request(await sign(key, claims({ exp: Math.floor(Date.now() / 1000) + 3600, nbf: undefined }))), env: { ACCESS_AUD: AUD }, next: async () => new Response('ok') });
    assert.equal(await res.text(), 'ok');
  } finally {
    globalThis.fetch = realFetch;
  }
});
