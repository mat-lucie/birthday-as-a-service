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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', clearSessionCookie());
  return res.status(200).json({ ok: true });
}
