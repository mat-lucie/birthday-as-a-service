import { Redis } from '@upstash/redis';
import { randomBytes } from 'node:crypto';
import { requireAdmin } from '../../lib/auth.js';
import { adminLimiter, enforce } from '../../lib/ratelimit.js';
import config from '../../birthday.config.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

function slugifyCode(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

// New guests get a random hex suffix so codes aren't guessable from the name.
// Existing guests being updated keep their stored code (we never re-suffix on edit).
// The regex matches BOTH old (4–8 hex) and new (16 hex / 64-bit) suffixes as "already-rotated"
// so editing a guest doesn't add a second suffix.
const ROTATED_RE = /-[0-9a-f]{4,16}$/;

function sanitizeGuest(g, { addRandomSuffix = false } = {}) {
  let code = slugifyCode(g.code || g.name);
  if (addRandomSuffix && code && !ROTATED_RE.test(code)) {
    // 8 bytes = 16 hex chars = 64 bits of entropy (up from 24-bit / 3-byte suffix)
    code = `${code}-${randomBytes(8).toString('hex')}`;
  }
  const out = {
    code,
    name: String(g.name || '').trim().slice(0, 80),
    gender: g.gender === 'f' ? 'f' : g.gender === 'm' ? 'm' : undefined,
    email: g.email ? String(g.email).trim().slice(0, 254) : undefined,
  };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === '') && delete out[k]);
  return out;
}

export default async function handler(req, res) {
  try {
    if (!(await enforce(adminLimiter, req, res))) return;
    const authErr = requireAdmin(req); // synchronous
    if (authErr) return res.status(authErr.status).json(authErr.body);

    if (req.method === 'POST') {
      const { guest, originalCode } = req.body || {};
      if (!guest || !guest.name) return res.status(400).json({ error: config.strings.errors.adminGuestNameRequired });
      if (guest.gender !== 'f' && guest.gender !== 'm') {
        return res.status(400).json({ error: config.strings.errors.adminGuestGenderRequired });
      }
      const isNewGuest = !originalCode;
      const sanitized = sanitizeGuest(guest, { addRandomSuffix: isNewGuest });
      if (!sanitized.code) return res.status(400).json({ error: config.strings.errors.adminGuestInvalidName });

      const isRename = !!originalCode && originalCode !== sanitized.code;
      const isUpdate = !!originalCode && !isRename;

      if (!isUpdate) {
        const existing = await redis.get(`guest:${sanitized.code}`);
        if (existing) return res.status(409).json({ error: `${config.strings.errors.adminGuestDuplicateCode} "${sanitized.code}".` });
      }

      // Preserve flags (isHost, etc.) on update
      let prior = null;
      if (originalCode) prior = await redis.get(`guest:${originalCode}`);
      const merged = { ...(prior || {}), ...sanitized };

      if (isRename) {
        const events = (await redis.get('events')) || [];
        const updatedEvents = events.map(e => {
          const out = { ...e };
          if (Array.isArray(out.allowedCodes) && out.allowedCodes.includes(originalCode)) {
            out.allowedCodes = out.allowedCodes.map(c => (c === originalCode ? sanitized.code : c));
          }
          if (out.personalNotes && out.personalNotes[originalCode]) {
            out.personalNotes = { ...out.personalNotes, [sanitized.code]: out.personalNotes[originalCode] };
            delete out.personalNotes[originalCode];
          }
          return out;
        });
        await redis.set('events', updatedEvents);

        const allEventIds = updatedEvents.map(e => e.id);
        const oldRsvps = await Promise.all(allEventIds.map(id => redis.get(`rsvp:${originalCode}:${id}`)));
        await Promise.all(allEventIds.map((id, i) => {
          if (oldRsvps[i]) return redis.set(`rsvp:${sanitized.code}:${id}`, oldRsvps[i]);
          return null;
        }));
        await Promise.all(allEventIds.map(id => redis.del(`rsvp:${originalCode}:${id}`)));

        await redis.srem('guest-codes', originalCode);
        await redis.del(`guest:${originalCode}`);
      }

      await redis.set(`guest:${sanitized.code}`, merged);
      await redis.sadd('guest-codes', sanitized.code);

      return res.status(200).json({ ok: true, guest: merged, isNew: !originalCode });
    }

    if (req.method === 'DELETE') {
      const { targetCode } = req.body || {};
      if (!targetCode) return res.status(400).json({ error: 'Missing targetCode' });
      const target = await redis.get(`guest:${targetCode}`);
      if (!target) return res.status(404).json({ error: 'Guest not found.' });
      if (target.isHost) return res.status(400).json({ error: config.strings.errors.adminGuestCannotDeleteHost });

      const events = (await redis.get('events')) || [];
      const updatedEvents = events.map(e => {
        const out = { ...e };
        if (Array.isArray(out.allowedCodes)) {
          out.allowedCodes = out.allowedCodes.filter(c => c !== targetCode);
        }
        if (out.personalNotes && out.personalNotes[targetCode]) {
          out.personalNotes = { ...out.personalNotes };
          delete out.personalNotes[targetCode];
        }
        return out;
      });
      await redis.set('events', updatedEvents);
      await Promise.all(events.map(e => redis.del(`rsvp:${targetCode}:${e.id}`)));

      await redis.srem('guest-codes', targetCode);
      await redis.del(`guest:${targetCode}`);

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('admin/guest handler failed', err?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
