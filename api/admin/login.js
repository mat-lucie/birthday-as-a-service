/**
 * api/admin/login.js — Admin password login endpoint.
 *
 * POST /api/admin/login
 * Body: { password: string }
 *
 * On success: issues an HMAC-signed session cookie and returns { ok: true }.
 * On failure: returns a generic error — no detail about which part failed.
 *
 * Rate-limited by loginLimiter (5/min per IP) — tight to slow brute-force.
 * Password comparison is constant-time (both sides hashed to equal length
 * before timingSafeEqual so unequal inputs don't leak via length check).
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { loginLimiter, enforce } from '../../lib/ratelimit.js';
import { issueAdminToken, serializeSessionCookie } from '../../lib/auth.js';
import config from '../../birthday.config.js';

/**
 * constantTimePasswordCheck(provided, expected) → boolean
 *
 * Hash both sides with SHA-256 before comparing so the buffers are always
 * equal length (32 bytes) — timingSafeEqual throws on mismatched lengths.
 * The hash step does NOT weaken security here because we are not deriving a
 * key; we are just normalising buffer lengths for the constant-time compare.
 */
function constantTimePasswordCheck(provided, expected) {
  // Always hash both sides so comparison time doesn't vary with input length,
  // even when the caller passes an empty string or a very long string.
  const a = createHash('sha256').update(String(provided)).digest();
  const b = createHash('sha256').update(String(expected)).digest();
  return timingSafeEqual(a, b);
}

/**
 * isLocalRequest(req) → boolean
 *
 * Returns true when the request comes over plain HTTP on localhost so the
 * session cookie can omit the Secure flag during local development.
 * On Vercel (production) x-forwarded-proto is set to 'https' and
 * x-vercel-forwarded-for is non-empty, so this always returns false there.
 */
function isLocalRequest(req) {
  const proto = req.headers['x-forwarded-proto'];
  if (proto === 'https') return false;
  if (proto === 'http') return true;
  // No x-forwarded-proto: likely a direct local request.
  const host = req.headers['host'] || '';
  return host.startsWith('localhost') || host.startsWith('127.');
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate-limit first — before any body processing.
    if (!(await enforce(loginLimiter, req, res))) return;

    // Auth configured? Check before reading the body.
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || expected.length === 0) {
      console.error('[login] ADMIN_PASSWORD is not set');
      return res.status(500).json({ error: config.strings.errors.adminNotConfigured });
    }

    const { password } = req.body || {};

    // Constant-time compare — always run even when password is missing so we
    // don't leak timing information about whether the env var is set.
    const ok = constantTimePasswordCheck(password ?? '', expected);

    if (!ok) {
      return res.status(401).json({ error: config.strings.errors.loginIncorrect });
    }

    // Issue token and set cookie.
    const token = issueAdminToken();
    const secure = !isLocalRequest(req);
    res.setHeader('Set-Cookie', serializeSessionCookie(token, { secure }));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[login] handler failed', err?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
