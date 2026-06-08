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

  // Fan out all (event, invitedGuest) RSVP lookups in parallel
  const lookups = [];
  allEvents.forEach(e => {
    nonHosts.forEach(g => {
      if (isInvited(e, g.code)) lookups.push({ eventId: e.id, code: g.code, name: g.name });
    });
  });
  const rsvpValues = await Promise.all(
    lookups.map(l => redis.get(`rsvp:${l.code}:${l.eventId}`))
  );

  const rsvps = {};
  allEvents.forEach(e => { rsvps[e.id] = { yes: [], no: [], pending: [], plusOnes: [], total: 0 }; });
  lookups.forEach((l, i) => {
    const r = rsvpValues[i];
    const bucket = rsvps[l.eventId];
    bucket.total++;
    const person = { code: l.code, name: l.name };
    if (r?.updatedAt) person.updatedAt = r.updatedAt;
    if (r?.status === 'attending') {
      if (r.plusOne) {
        person.plusOne = { name: r.plusOne.name || null };
        bucket.plusOnes.push({ inviterCode: l.code, inviterName: l.name, name: r.plusOne.name || null });
      }
      bucket.yes.push(person);
    }
    else if (r?.status === 'not-attending') bucket.no.push(person);
    else bucket.pending.push(person);
  });

  return res.status(200).json({ rsvps });
}
