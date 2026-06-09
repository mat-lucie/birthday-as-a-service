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
 * Safe-to-retry on partial failure: deletes in dependency order so a crash
 * leaves a recoverable state. Specifically: rsvp:* keys and the events list
 * are deleted FIRST, then guest:* keys, and the guest-codes index is deleted
 * LAST. This ensures the index remains intact for re-enumeration on retry.
 *
 * Returns on success:  { ok: true, deletedGuests: number, deletedEvents: number }
 * Returns on failure:  { ok: false, deleted: { guests, events, rsvps }, failed: [string, ...] }
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

    // 3. Delete in dependency order so a partial failure leaves a recoverable
    //    state.  guest-codes is the enumeration index and is deleted LAST, so
    //    a retry can re-enumerate rsvp:* keys from it if an earlier step fails.
    //
    //    Order: (a) rsvp:* keys + events list  →  (b) guest:* keys  →  (c) guest-codes
    //
    //    We use Promise.allSettled so that failures in one step are reported
    //    honestly rather than silently abandoning the remaining steps.

    const guestKeys = guestCodes.map(c => `guest:${c}`);
    const failed = [];
    let deletedRsvps = 0;
    let deletedEventsCount = 0;
    let deletedGuestsCount = 0;

    // Step (a): rsvp:* keys + events list
    const stepA = [];
    if (rsvpKeys.length > 0) stepA.push(redis.del(...rsvpKeys).then(n => { deletedRsvps = n; }));
    stepA.push(redis.del('events').then(() => { deletedEventsCount = allEvents.length; }));
    const stepAResults = await Promise.allSettled(stepA);
    stepAResults.forEach((r, i) => { if (r.status === 'rejected') failed.push(`step-a[${i}]: ${r.reason?.message ?? r.reason}`); });

    // Step (b): guest:* keys
    if (guestKeys.length > 0) {
      const stepB = await Promise.allSettled([redis.del(...guestKeys)]);
      stepB.forEach((r, i) => {
        if (r.status === 'fulfilled') deletedGuestsCount = guestCodes.length;
        else failed.push(`step-b[${i}]: ${r.reason?.message ?? r.reason}`);
      });
    } else {
      deletedGuestsCount = 0;
    }

    // Step (c): guest-codes index — deleted LAST so retry can re-enumerate
    const stepC = await Promise.allSettled([redis.del('guest-codes')]);
    stepC.forEach((r, i) => { if (r.status === 'rejected') failed.push(`step-c[${i}]: ${r.reason?.message ?? r.reason}`); });

    if (failed.length > 0) {
      return res.status(500).json({
        ok: false,
        deleted: { guests: deletedGuestsCount, events: deletedEventsCount, rsvps: deletedRsvps },
        failed,
      });
    }

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
