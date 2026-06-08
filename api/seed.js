import { Redis } from '@upstash/redis';
import { timingSafeEqual } from 'node:crypto';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Constant-time comparison to guard against timing attacks.
  // Guards against missing header or missing env var (both treated as unauthorized).
  const provided = req.headers['x-seed-secret'];
  const expected = process.env.SEED_SECRET;
  const authorized = (() => {
    if (!provided || !expected) return false;
    try {
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch { return false; }
  })();
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { events, guests } = req.body || {};

  if (!events || !guests) {
    return res.status(400).json({ error: 'Missing required fields: events, guests' });
  }

  // Events are admin-managed once Redis is initialized. The seed only
  // populates events on the very first run (when Redis has zero events) —
  // re-seeds never touch the events list. data.json's events array
  // becomes documentation / disaster-recovery backup after that, NOT a
  // source of truth. This kills the "deleted event resurrects on re-seed"
  // footgun.
  const existingEvents = (await redis.get('events')) || [];
  const firstRun = existingEvents.length === 0;
  if (firstRun) await redis.set('events', events);

  // Merge with existing guest records so user-submitted fields (email)
  // survive re-seeds. data.json wins for fields it specifies; email is
  // preserved from Redis when present.
  let emailsPreserved = 0;
  await Promise.all(
    guests.map(async guest => {
      const existing = await redis.get(`guest:${guest.code}`);
      const merged = { ...guest };
      if (existing?.email && !merged.email) {
        merged.email = existing.email;
        emailsPreserved++;
      }
      await Promise.all([
        redis.set(`guest:${guest.code}`, merged),
        redis.sadd('guest-codes', guest.code),
      ]);
    })
  );

  return res.status(200).json({
    ok: true,
    eventsSeeded: firstRun ? events.length : 0,
    eventsUntouched: firstRun ? 0 : existingEvents.length,
    guestsCount: guests.length,
    emailsPreserved,
  });
}
