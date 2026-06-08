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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.query;
  const authErr = await requireHost(code);
  if (authErr) return res.status(authErr.status).json(authErr.body);

  const events = (await redis.get('events')) || [];
  return res.status(200).json({ events });
}
