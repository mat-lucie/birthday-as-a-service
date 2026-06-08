import { Redis } from '@upstash/redis';
import { rsvpLimiter, enforce } from '../lib/ratelimit.js';
import config from '../birthday.config.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function canSeeEvent(event, code) {
  if (event.visibility === 'public') return true;
  if (event.visibility === 'private') {
    return Array.isArray(event.allowedCodes) && event.allowedCodes.includes(code);
  }
  return false;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!(await enforce(rsvpLimiter, req, res))) return;

    const { code, eventId, status, note, plusOne } = req.body || {};

    if (!code || !eventId) return res.status(400).json({ error: 'Missing required fields: code, eventId' });
    if (!['attending', 'not-attending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "attending" or "not-attending"' });
    }

    const guest = await redis.get(`guest:${code}`);
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    // Optional email second-factor: if the guest has a saved email, any write
    // must include a matching email — so a leaked invite code alone can't
    // modify an established RSVP. Guests with no saved email are unaffected.
    if (config.security?.requireEmailForChanges && guest.email) {
      const provided = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : null;
      if (provided !== guest.email.trim().toLowerCase()) {
        return res.status(403).json({ error: config.strings.errors.emailRequiredToChange });
      }
    }

    const allEvents = (await redis.get('events')) || [];
    const event = allEvents.find(e => e.id === eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!canSeeEvent(event, code)) {
      return res.status(403).json({ error: 'Guest is not invited to this event' });
    }

    // Preserve existing plus-one when the caller doesn't mention it.
    // Explicit `plusOne: null` clears it. Object form sets/updates it.
    const existing = await redis.get(`rsvp:${code}:${eventId}`);
    const eventAllowsPlusOne = event.allowPlusOne !== false;

    const rsvp = {
      status,
      updatedAt: new Date().toISOString(),
      ...(note !== undefined && { note }),
    };

    if (status === 'attending') {
      if (plusOne === undefined) {
        if (existing?.plusOne) rsvp.plusOne = existing.plusOne;
      } else if (plusOne === null) {
        // explicit clear
      } else if (typeof plusOne === 'object') {
        if (!eventAllowsPlusOne) {
          return res.status(400).json({ error: config.strings.errors.plusOneNotAllowed });
        }
        const stored = {};
        if (plusOne.name && typeof plusOne.name === 'string' && plusOne.name.trim()) {
          stored.name = plusOne.name.trim().slice(0, 60);
        }
        rsvp.plusOne = stored;
      }
    }
    // status === 'not-attending' → plusOne is dropped (not copied from existing)

    await redis.set(`rsvp:${code}:${eventId}`, rsvp);

    return res.status(200).json({
      ok: true,
      rsvp: { status: rsvp.status, updatedAt: rsvp.updatedAt, plusOne: rsvp.plusOne || null },
    });
  } catch (err) {
    console.error('rsvp handler failed', err?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
