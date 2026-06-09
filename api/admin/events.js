import { Redis } from '@upstash/redis';
import { requireAdmin } from '../../lib/auth.js';
import { adminLimiter, enforce } from '../../lib/ratelimit.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    if (!(await enforce(adminLimiter, req, res))) return;
    const authErr = requireAdmin(req); // synchronous
    if (authErr) return res.status(authErr.status).json(authErr.body);

    const events = (await redis.get('events')) || [];
    return res.status(200).json({ events });
  } catch (err) {
    console.error('admin/events handler failed', err?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
