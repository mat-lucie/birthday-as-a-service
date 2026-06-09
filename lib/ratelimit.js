import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import config from '../birthday.config.js';

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

// /api/admin/* authenticated admin actions — moderate cap.
export const adminLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:admin',
});

// /api/admin/login — tighter cap to slow brute-force password attempts.
export const loginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  prefix: 'rl:login',
});

export function clientIp(req) {
  // On Vercel, x-vercel-forwarded-for is the trustworthy client IP set by
  // the Vercel edge — prefer it over x-forwarded-for, which the client can
  // spoof to bypass rate limits by injecting a fake leftmost entry.
  const vercelIp = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelIp === 'string' && vercelIp.length > 0) return vercelIp.split(',')[0].trim();
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) return realIp.trim();
  // Fall back to the RIGHTMOST entry of x-forwarded-for (the last
  // hop added by a trusted proxy), never the leftmost (client-controlled).
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const parts = xff.split(',');
    return parts[parts.length - 1].trim();
  }
  return 'unknown';
}

export async function enforce(limiter, req, res) {
  const ip = clientIp(req);
  const { success } = await limiter.limit(ip);
  if (!success) {
    res.status(429).json({ error: config.strings.errors.rateLimited });
    return false;
  }
  return true;
}
