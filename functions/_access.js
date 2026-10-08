// 驗證 Cloudflare Access 發的 JWT（範本：lth-life-portal functions/api/_access.js）。
// 每次部署的專屬網址（xxxx.thai-letters.pages.dev）沒有被 Access 擋，課本音檔不能公開，
// 所以整個網站每個請求都過這裡：公鑰網址、iss、aud、email 全部寫死比對，不信任 token 自己說的來源。

export const TEAM_DOMAIN = 'https://lthfilmstudio.cloudflareaccess.com';
export const ALLOWED_EMAIL = 'lthfilmstudio@gmail.com';
// thai-letters.pages.dev 的 Access 應用程式 AUD（不是機密）；空字串會一律拒絕
export const DEFAULT_AUD = '358fd0aced9b0dd1b0e2dfdf53ff7f6243004c591d022594e42a39771d15e2fe';

const CERTS_URL = `${TEAM_DOMAIN}/cdn-cgi/access/certs`;
const KEY_TTL_MS = 60 * 60 * 1000;
const REFETCH_GAP_MS = 60 * 1000;

let keyCache = null;

export function resetKeyCache() {
  keyCache = null;
}

function b64urlBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function b64urlJson(s) {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(s)));
}

function readCookie(request, name) {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

async function getKeys(fetchImpl, force) {
  const fresh = keyCache && Date.now() - keyCache.at < (force ? REFETCH_GAP_MS : KEY_TTL_MS);
  if (fresh) return keyCache.keys;
  const res = await fetchImpl(CERTS_URL);
  if (!res.ok) return null;
  const data = await res.json();
  keyCache = { at: Date.now(), keys: Array.isArray(data.keys) ? data.keys : [] };
  return keyCache.keys;
}

// 通過回傳 email，不通過回傳 null
export async function verifyAccess(request, env, { fetchImpl = fetch, now = Date.now() } = {}) {
  const token = readCookie(request, 'CF_Authorization') || request.headers.get('cf-access-jwt-assertion');
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  let header;
  let payload;
  try {
    header = b64urlJson(parts[0]);
    payload = b64urlJson(parts[1]);
  } catch {
    return null;
  }

  const nowSec = Math.floor(now / 1000);
  const expectedAud = env.ACCESS_AUD || DEFAULT_AUD;
  if (!expectedAud) return null;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (header.alg !== 'RS256' || !header.kid) return null;
  if (payload.iss !== TEAM_DOMAIN) return null;
  if (!aud.includes(expectedAud)) return null;
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return null;
  if (typeof payload.nbf === 'number' && payload.nbf > nowSec + 60) return null;
  if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== ALLOWED_EMAIL) return null;

  try {
    let keys = await getKeys(fetchImpl, false);
    let jwk = keys && keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      keys = await getKeys(fetchImpl, true);
      jwk = keys && keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
    return ok ? ALLOWED_EMAIL : null;
  } catch {
    return null;
  }
}
