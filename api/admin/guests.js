import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

async function requireHost(code) {
  if (!code) return { status: 400, body: { error: 'Missing code' } };
  const guest = await redis.get(`guest:${code}`);
  if (!guest) return { status: 404, body: { error: 'Guest not found' } };
  if (!guest.isHost) return { status: 403, body: { error: 'Not authorized' } };
  return null;
}

function isInvited(event, code) {
  if (event.visibility === 'public') return true;
  return Array.isArray(event.allowedCodes) && event.allowedCodes.includes(code);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.query;
  const authErr = await requireHost(code);
  if (authErr) return res.status(authErr.status).json(authErr.body);

  const guestCodes = await redis.smembers('guest-codes');
  const allGuests = await Promise.all(guestCodes.map(c => redis.get(`guest:${c}`)));
  const nonHosts = allGuests.filter(g => g && !g.isHost);
  const allEvents = (await redis.get('events')) || [];

  // Fan out one RSVP lookup per (guest, invited-event) pair, in parallel
  const lookups = [];
  nonHosts.forEach(g => {
    allEvents.forEach(e => {
      if (isInvited(e, g.code)) lookups.push({ code: g.code, eventId: e.id });
    });
  });
  const rsvpValues = await Promise.all(
    lookups.map(l => redis.get(`rsvp:${l.code}:${l.eventId}`))
  );
  const rsvpByPair = new Map();
  lookups.forEach((l, i) => rsvpByPair.set(`${l.code}:${l.eventId}`, rsvpValues[i]));

  const enriched = nonHosts.map(g => {
    const invitedEvents = allEvents.filter(e => isInvited(e, g.code));
    let yes = 0, no = 0, pending = 0;
    invitedEvents.forEach(e => {
      const r = rsvpByPair.get(`${g.code}:${e.id}`);
      if (r?.status === 'attending') yes++;
      else if (r?.status === 'not-attending') no++;
      else pending++;
    });
    const privateCount = invitedEvents.filter(e => e.visibility === 'private').length;
    return {
      code: g.code,
      name: g.name,
      gender: g.gender || null,
      hasEmail: !!g.email,
      email: g.email || null,
      invitedCount: invitedEvents.length,
      privateCount,
      yes, no, pending,
    };
  });

  return res.status(200).json({ guests: enriched });
}
