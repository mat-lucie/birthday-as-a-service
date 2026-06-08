import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// /api/confirm sends real emails — strictest limit.
export const confirmLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'rl:confirm',
});

// /api/rsvp is write-heavy but cheap; allow steady use.
export const rsvpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:rsvp',
});

// /api/guest is called on every page load.
export const guestLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'rl:guest',
});

export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'unknown';
}

export async function enforce(limiter, req, res) {
  const ip = clientIp(req);
  const { success } = await limiter.limit(ip);
  if (!success) {
    res.status(429).json({ error: 'Demasiados intentos. Espera un minuto.' });
    return false;
  }
  return true;
}
