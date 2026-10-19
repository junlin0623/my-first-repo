// Single-user login for step 1: one password from .env.local, one signed cookie.
// Uses Web Crypto so it runs both in the proxy and in server actions.
export const SESSION_COOKIE = 'wb_session';

async function hmac(message: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set (see .env.example)');
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Changing APP_PASSWORD logs everyone out.
export function sessionToken() {
  return hmac(`session:${process.env.APP_PASSWORD ?? ''}`);
}

export async function isValidSession(token: string | undefined) {
  return !!token && token === (await sessionToken());
}
