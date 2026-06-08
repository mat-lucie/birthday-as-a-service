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

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 40) || `event-${Date.now()}`;
}

function sanitize(event) {
  const out = {
    id: event.id || slugify(event.title),
    title: String(event.title || '').trim().slice(0, 200),
    date: String(event.date || '').trim().slice(0, 10),
    time: String(event.time || '').trim().slice(0, 5),
    endTime: event.endTime ? String(event.endTime).trim().slice(0, 5) : undefined,
    location: String(event.location || '').trim().slice(0, 200),
    mapsUrl: event.mapsUrl ? String(event.mapsUrl).trim().slice(0, 500) : undefined,
    description: String(event.description || '').trim().slice(0, 2000),
    attendees: Number(event.attendees) || 0,
    visibility: event.visibility === 'private' ? 'private' : 'public',
    dressCode: event.dressCode ? String(event.dressCode).trim().slice(0, 80) : undefined,
    allowPlusOne: undefined, // set after visibility below
  };
  // Public events default to allow +1; private events default to off. Either can be toggled.
  out.allowPlusOne = out.visibility === 'private' ? !!event.allowPlusOne : (event.allowPlusOne !== false);
  if (out.visibility === 'private') {
    out.allowedCodes = Array.isArray(event.allowedCodes)
      ? event.allowedCodes.filter(c => typeof c === 'string' && c.length > 0)
      : [];
    if (event.personalNotes && typeof event.personalNotes === 'object') {
      const notes = {};
      Object.entries(event.personalNotes).forEach(([k, v]) => {
        if (typeof v === 'string' && v.trim()) notes[k] = v.trim().slice(0, 500);
      });
      if (Object.keys(notes).length > 0) out.personalNotes = notes;
    }
  }
  Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
  return out;
}

export default async function handler(req, res) {
  const { code } = req.body || {};
  const authErr = await requireHost(code);
  if (authErr) return res.status(authErr.status).json(authErr.body);

  if (req.method === 'POST') {
    const { event } = req.body || {};
    if (!event || !event.title || !event.date || !event.time) {
      return res.status(400).json({ error: 'Missing required fields: title, date, time' });
    }
    const sanitized = sanitize(event);
    const events = (await redis.get('events')) || [];
    const idx = events.findIndex(e => e.id === sanitized.id);
    const isNew = idx < 0;
    if (isNew) events.push(sanitized);
    else events[idx] = sanitized;
    await redis.set('events', events);
    return res.status(200).json({ ok: true, event: sanitized, isNew });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const events = (await redis.get('events')) || [];
    const next = events.filter(e => e.id !== id);
    if (next.length === events.length) return res.status(404).json({ error: 'Event not found' });
    await redis.set('events', next);
    const guestCodes = await redis.smembers('guest-codes');
    await Promise.all(guestCodes.map(c => redis.del(`rsvp:${c}:${id}`)));
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
