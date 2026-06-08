/**
 * api/admin/reset.js — Admin-only demo/data reset endpoint.
 *
 * POST /api/admin/reset
 *
 * Wipes all guest records (guest:* keys + guest-codes set), all RSVP records
 * (rsvp:* keys), and the events list — effectively returning Redis to a
 * pre-seed state so the operator can run `npm run seed` against a clean store.
 *
 * Authorization: requires a valid admin_session cookie (same as all other
 * admin endpoints) + the adminLimiter rate limit.
 *
 * Idempotent: running it against an already-empty store returns { ok: true }
 * with zeroed counts — no error.
 *
 * Returns: { ok: true, deletedGuests: number, deletedEvents: number }
 *
 * USAGE (curl example — the -b flag passes the cookie from a prior login):
 *
 *   # 1. Log in and capture the session cookie
 *   curl -c cookies.txt -X POST https://your-app.vercel.app/api/admin/login \
 *     -H 'Content-Type: application/json' \
 *     -d '{"password":"YOUR_ADMIN_PASSWORD"}'
 *
 *   # 2. Call reset with the saved cookie
 *   curl -b cookies.txt -X POST https://your-app.vercel.app/api/admin/reset
 *
 *   # 3. Re-seed with fresh data
 *   SEED_SECRET=your-secret DEPLOY_URL=https://your-app.vercel.app npm run seed
 *
 * Note: an npm script is not provided for reset because the reset requires
 * an authenticated session cookie that can only be obtained from a running
 * deployment — a script wrapper would not add value over the curl above.
 */

import { Redis } from '@upstash/redis';
import { requireAdmin } from '../../lib/auth.js';
import { adminLimiter, enforce } from '../../lib/ratelimit.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!(await enforce(adminLimiter, req, res))) return;
    const authErr = requireAdmin(req);
    if (authErr) return res.status(authErr.status).json(authErr.body);

    // 1. Collect all guest codes.
    const guestCodes = (await redis.smembers('guest-codes')) || [];

    // 2. Collect all RSVP keys for known guest codes.
    //    We enumerate via the guest-codes set rather than SCAN to avoid a
    //    full-keyspace scan (cheaper on Upstash free tier).
    const allEvents = (await redis.get('events')) || [];
    const rsvpKeys = [];
    for (const code of guestCodes) {
      for (const event of allEvents) {
        rsvpKeys.push(`rsvp:${code}:${event.id}`);
      }
    }

    // 3. Delete everything in parallel batches.
    //    Upstash REST API supports multi-key DEL; we build flat arg lists.
    const guestKeys = guestCodes.map(c => `guest:${c}`);

    const deletePromises = [];

    // Delete all guest:* keys.
    if (guestKeys.length > 0) deletePromises.push(redis.del(...guestKeys));

    // Delete all rsvp:*:* keys.
    if (rsvpKeys.length > 0) deletePromises.push(redis.del(...rsvpKeys));

    // Delete the guest-codes set and the events list.
    deletePromises.push(redis.del('guest-codes'));
    deletePromises.push(redis.del('events'));

    await Promise.all(deletePromises);

    return res.status(200).json({
      ok: true,
      deletedGuests: guestCodes.length,
      deletedEvents: allEvents.length,
    });
  } catch (err) {
    console.error('admin/reset handler failed', err?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
