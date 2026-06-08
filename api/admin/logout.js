/**
 * api/admin/logout.js — Admin session logout endpoint.
 *
 * POST /api/admin/logout
 *
 * Clears the admin_session cookie and returns { ok: true }.
 * No authentication required — logging out an already-logged-out session
 * is always safe and should never block the user.
 */

import { clearSessionCookie } from '../../lib/auth.js';

/**
 * isLocalRequest mirrors the same helper in api/admin/login.js so that the
 * Secure flag on the cleared cookie matches the flag that was set on login.
 * Browsers silently ignore cookie deletions when the Secure attribute differs.
 */
function isLocalRequest(req) {
  const proto = req.headers['x-forwarded-proto'];
  if (proto === 'https') return false;
  if (proto === 'http') return true;
  const host = req.headers['host'] || '';
  return host.startsWith('localhost') || host.startsWith('127.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secure = !isLocalRequest(req);
  res.setHeader('Set-Cookie', clearSessionCookie({ secure }));
  return res.status(200).json({ ok: true });
}
