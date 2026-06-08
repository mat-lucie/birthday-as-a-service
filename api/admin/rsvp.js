import { Redis } from '@upstash/redis';
import { requireAdmin } from '../../lib/auth.js';
import { adminLimiter, enforce } from '../../lib/ratelimit.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
    if (!(await enforce(adminLimiter, req, res))) return;
    const authErr = requireAdmin(req); // synchronous
    if (authErr) return res.status(authErr.status).json(authErr.body);

    const { targetCode, eventId } = req.body || {};
    if (!targetCode || !eventId) {
      return res.status(400).json({ error: 'Missing targetCode or eventId' });
    }

    const key = `rsvp:${targetCode}:${eventId}`;
    const existed = await redis.get(key);
    await redis.del(key);

    return res.status(200).json({ ok: true, deleted: !!existed });
  } catch (err) {
    console.error('admin/rsvp handler failed', err?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
