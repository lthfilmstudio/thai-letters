import { verifyAccess } from './_access.js';

// Every page, script and audio clip needs a valid Access login (the textbook CD clips are not public).
async function requireAccess(context) {
  const email = await verifyAccess(context.request, context.env);
  if (!email) return new Response('需要登入', { status: 401, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  const res = await context.next();
  return withRange(context.request, res);
}

// Pages answers Range requests with the whole file (200). Safari will not play <audio>
// without 206 partial responses, so cut the requested bytes here.
async function withRange(request, res) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!m || res.status !== 200) return res;
  const body = await res.arrayBuffer();
  const size = body.byteLength;
  let start = m[1] === '' ? size - Number(m[2]) : Number(m[1]);
  let end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (start < 0) start = 0;
  const headers = new Headers(res.headers);
  headers.set('accept-ranges', 'bytes');
  if (start > end || start >= size) {
    headers.set('content-range', `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  headers.set('content-range', `bytes ${start}-${end}/${size}`);
  headers.set('content-length', String(end - start + 1));
  return new Response(body.slice(start, end + 1), { status: 206, headers });
}

export const onRequest = requireAccess;
