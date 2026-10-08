import { verifyAccess } from './_access.js';

// Every page, script and audio clip needs a valid Access login (the textbook CD clips are not public).
async function requireAccess(context) {
  const email = await verifyAccess(context.request, context.env);
  if (!email) return new Response('需要登入', { status: 401, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  return context.next();
}

export const onRequest = requireAccess;
