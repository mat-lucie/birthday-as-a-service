/**
 * lib/auth.js — Stateless HMAC-signed session-cookie auth for admin routes.
 *
 * TOKEN FORMAT
 * ────────────
 * Two base64url segments joined by a dot:
 *   <payloadB64url>.<signatureB64url>
 *
 * Payload (JSON):  { role: 'admin', iat: <unix-sec>, exp: <unix-sec> }
 * Signature:       HMAC-SHA256( payloadB64url, secret )
 *
 * No JWT library is used — we own the full implementation so there is no
 * surface for algorithm confusion (alg:none, RS→HS swap, etc.).
 *
 * SECRET DERIVATION
 * ─────────────────
 * Preferred:  ADMIN_SESSION_SECRET  (random 32+ byte string; set this in prod)
 * Fallback:   SHA-256("admin-session:" + ADMIN_PASSWORD)
 *   — deterministic so existing sessions survive process restarts, but
 *     rotating ADMIN_PASSWORD also rotates the derived secret and
 *     invalidates all live sessions.  Document this clearly to operators.
 * Neither set:  every admin call fails with 500. This is fail-closed behaviour;
 *   the app is misconfigured and must not silently allow access.
 *
 * CSRF DEFENCE
 * ────────────
 * State-changing methods (POST/PUT/PATCH/DELETE) verify that the request
 * Origin (or Referer host) matches the server Host.  GET is excluded because
 * it carries no side effects and browsers send cross-origin GETs freely.
 * This is a same-origin check implemented inside requireAdmin; H2 callers
 * can also call checkSameOrigin(req) directly if they need it independently.
 */

import { createHmac, createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import config from '../birthday.config.js';

// ── Constants ────────────────────────────────────────────────────────────────

/** Session lifetime in seconds (7 days). */
const TOKEN_TTL_SEC = 7 * 24 * 60 * 60;

/** Cookie name used across auth, login, and logout. */
const COOKIE_NAME = 'admin_session';

// ── Secret derivation ────────────────────────────────────────────────────────

/**
 * getSecret() → Buffer | null
 *
 * Returns the signing secret as a Buffer.
 * Returns null when neither ADMIN_SESSION_SECRET nor ADMIN_PASSWORD is set —
 * callers MUST treat null as a fatal misconfiguration and return 500.
 */
export function getSecret() {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit && explicit.length > 0) {
    return Buffer.from(explicit, 'utf8');
  }
  const password = process.env.ADMIN_PASSWORD;
  if (password && password.length > 0) {
    // Derive a stable secret so sessions survive server restarts without
    // requiring a separate env var.  The "admin-session:" prefix domain-
    // separates this digest from any other uses of ADMIN_PASSWORD.
    return createHash('sha256').update('admin-session:' + password).digest();
  }
  return null;
}

// ── base64url helpers ────────────────────────────────────────────────────────

function toB64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromB64url(str) {
  // Restore standard base64 padding before decoding.
  const pad = 4 - (str.length % 4);
  const padded = pad < 4 ? str + '='.repeat(pad) : str;
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

// ── Token issuance ────────────────────────────────────────────────────────────

/**
 * issueAdminToken() → string
 *
 * Creates a signed session token.  Throws if auth is not configured
 * (callers should check getSecret() !== null beforehand or catch here).
 */
export function issueAdminToken() {
  const secret = getSecret();
  if (!secret) throw new Error('Admin auth not configured (set ADMIN_PASSWORD).');

  const now = Math.floor(Date.now() / 1000);
  const payload = { role: 'admin', iat: now, exp: now + TOKEN_TTL_SEC };
  const payloadPart = toB64url(Buffer.from(JSON.stringify(payload), 'utf8'));

  const sig = createHmac('sha256', secret).update(payloadPart).digest();
  return `${payloadPart}.${toB64url(sig)}`;
}

// ── Token verification ────────────────────────────────────────────────────────

/**
 * verifyAdminToken(token) → { valid: true, payload } | { valid: false, reason }
 *
 * Verifies signature constant-time, checks role and expiry.
 * Never throws — all error paths return { valid: false, reason }.
 */
export function verifyAdminToken(token) {
  if (typeof token !== 'string' || !token) {
    return { valid: false, reason: 'missing token' };
  }

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return { valid: false, reason: 'malformed token' };

  const payloadPart = token.slice(0, dot);
  const sigPart     = token.slice(dot + 1);

  const secret = getSecret();
  if (!secret) return { valid: false, reason: 'auth not configured' };

  // Recompute the expected signature.
  const expectedSig = createHmac('sha256', secret).update(payloadPart).digest();
  let providedSig;
  try {
    providedSig = fromB64url(sigPart);
  } catch {
    return { valid: false, reason: 'malformed signature' };
  }

  // Constant-time comparison — guard length mismatch first so
  // timingSafeEqual never throws (it requires equal-length buffers).
  // We compare lengths before the timing-safe check; the length
  // comparison itself leaks whether lengths differ, but that leaks
  // nothing exploitable because the expected length is constant.
  if (providedSig.length !== expectedSig.length) {
    return { valid: false, reason: 'invalid signature' };
  }
  if (!timingSafeEqual(providedSig, expectedSig)) {
    return { valid: false, reason: 'invalid signature' };
  }

  // Decode payload.
  let payload;
  try {
    payload = JSON.parse(fromB64url(payloadPart).toString('utf8'));
  } catch {
    return { valid: false, reason: 'malformed payload' };
  }

  // Role check.
  if (payload.role !== 'admin') {
    return { valid: false, reason: 'wrong role' };
  }

  // Expiry check.
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    return { valid: false, reason: 'token expired' };
  }

  return { valid: true, payload };
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/**
 * serializeSessionCookie(token, opts?)
 *
 * Returns the Set-Cookie header string.
 * opts.secure (default true) — set to false in local http dev to omit Secure.
 * The login handler should pass secure=false when host is localhost or the
 * x-forwarded-proto header is not 'https'.
 */
export function serializeSessionCookie(token, opts = {}) {
  const secure = opts.secure !== false;
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'HttpOnly',
    ...(secure ? ['Secure'] : []),
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${TOKEN_TTL_SEC}`,
  ];
  return parts.join('; ');
}

/**
 * clearSessionCookie()
 *
 * Returns the Set-Cookie header string that expires the session cookie.
 * Always includes Secure so that browsers that stored a Secure cookie will
 * accept the deletion.  Max-Age=0 is the reliable cross-browser way to
 * delete a cookie (Expires in the past is less portable in serverless envs).
 */
export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/**
 * readCookie(req, name) → string | undefined
 *
 * Minimalist, safe cookie parser.  No dependency.
 * Splits on '; ', takes the first '=' as the key/value delimiter,
 * and returns the URL-decoded value for the matching name.
 */
export function readCookie(req, name) {
  const raw = req?.headers?.cookie;
  if (!raw) return undefined;
  for (const part of raw.split('; ')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1));
      } catch {
        return part.slice(eq + 1); // return raw if decode fails
      }
    }
  }
  return undefined;
}

// ── Same-origin check ─────────────────────────────────────────────────────────

/**
 * checkSameOrigin(req) → true | false
 *
 * Returns true when the request originates from the same host, or when
 * the check cannot be performed (e.g. Origin header absent and we cannot
 * infer it — conservative: allow, let requireAdmin decide).
 *
 * Returns false when the Origin or Referer clearly comes from a different
 * host — this is the cross-origin / CSRF-attempt case.
 *
 * Design: browsers always send Origin on cross-origin state-changing
 * requests (POST/PUT/PATCH/DELETE) per the Fetch spec.  Absent Origin we
 * fall back to the Referer host.  Absent both we allow the request because
 * same-origin browser requests in non-CORS contexts may omit both (e.g.
 * form POST with no referrer policy sending no Referer, CLI tools).
 * If you need a stricter policy, require the X-Requested-With header.
 */
export function checkSameOrigin(req) {
  // Extract the "expected" host: x-forwarded-host takes precedence on Vercel.
  const serverHost = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  if (!serverHost) return true; // can't determine — allow

  // Try Origin first.
  const origin = req.headers['origin'];
  if (origin) {
    try {
      const { host } = new URL(origin);
      return host === serverHost;
    } catch {
      return false; // malformed Origin → block
    }
  }

  // Fall back to Referer host.
  const referer = req.headers['referer'];
  if (referer) {
    try {
      const { host } = new URL(referer);
      return host === serverHost;
    } catch {
      return false; // malformed Referer → block
    }
  }

  // Neither header present — allow (see design note above).
  return true;
}

// ── requireAdmin ──────────────────────────────────────────────────────────────

/**
 * requireAdmin(req) → null | { status, body: { error } }
 *
 * Mirrors the requireHost(code) contract used by existing admin routes so
 * H2 can swap the auth mechanism with minimal diff:
 *   const authErr = requireAdmin(req);
 *   if (authErr) return res.status(authErr.status).json(authErr.body);
 *
 * This function is synchronous — no async needed (no DB lookup).
 *
 * Checks (in order):
 *   1. Auth is configured (ADMIN_PASSWORD or ADMIN_SESSION_SECRET is set).
 *   2. admin_session cookie is present and the token is valid.
 *   3. For state-changing methods: Origin/Referer is same-origin.
 */
export function requireAdmin(req) {
  // 1. Misconfiguration guard — fail closed.
  if (!getSecret()) {
    return {
      status: 500,
      body: { error: config.strings.errors.adminNotConfigured },
    };
  }

  // 2. Session cookie check.
  const token = readCookie(req, COOKIE_NAME);
  if (!token) {
    return {
      status: 401,
      body: { error: config.strings.errors.notAuthenticated },
    };
  }

  const { valid, reason } = verifyAdminToken(token);
  if (!valid) {
    // Log the reason server-side; don't leak it to the client.
    console.warn('[auth] token rejected:', reason);
    return {
      status: 401,
      body: { error: config.strings.errors.notAuthenticated },
    };
  }

  // 3. CSRF defence for state-changing methods.
  const method = (req.method || '').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    if (!checkSameOrigin(req)) {
      return {
        status: 403,
        body: { error: config.strings.errors.crossOriginBlocked },
      };
    }
  }

  return null; // authorized
}
