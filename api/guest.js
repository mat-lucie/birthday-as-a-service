import { Redis } from '@upstash/redis';
import { guestLimiter, enforce } from '../lib/ratelimit.js';
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
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!(await enforce(guestLimiter, req, res))) return;

    const { code } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing code parameter' });

    const guest = await redis.get(`guest:${code}`);
    if (!guest) return res.status(404).json({ error: 'Guest not found. Check your invitation link.' });

    const allEvents = (await redis.get('events')) || [];
    const visibleEvents = allEvents.filter(ev => canSeeEvent(ev, code));

    // Strip allowedCodes & personalNotes from response (don't leak who else is invited).
    // Inject forYou flag + this guest's personal note.
    const sanitized = visibleEvents.map(ev => {
      const { allowedCodes, personalNotes, ...rest } = ev;
      return {
        ...rest,
        // Public events default to +1 on; private events default off. Host toggle wins either way.
        allowPlusOne: ev.visibility === 'private' ? !!ev.allowPlusOne : (ev.allowPlusOne !== false),
        forYou: ev.visibility === 'private',
        personalNote: ev.visibility === 'private' && personalNotes ? personalNotes[code] || null : null,
      };
    });

    const rsvpKeys = sanitized.map(e => `rsvp:${code}:${e.id}`);
    const rsvps = rsvpKeys.length > 0
      ? await Promise.all(rsvpKeys.map(key => redis.get(key)))
      : [];

    const eventsWithRsvp = sanitized.map((event, i) => ({
      ...event,
      rsvp: rsvps[i] || { status: null }
    }));

    return res.status(200).json({
      guest: { name: guest.name, code: guest.code, gender: guest.gender || null, hasEmail: !!guest.email, isHost: !!guest.isHost },
      events: eventsWithRsvp,
      birthdayWeek: {
        startDate: config.event.startDate,
        endDate: config.event.endDate,
        person: config.host.name,
        turningAge: config.host.age
      }
    });
  } catch (err) {
    console.error('guest handler failed', err?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
