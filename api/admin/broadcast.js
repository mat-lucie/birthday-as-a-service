import { Redis } from '@upstash/redis';
import { sendEmail } from '../../lib/email.js';
import config from '../../birthday.config.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const BASE_URL = config.site.domain;

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplate(template, { name, link }) {
  return String(template || '')
    .replaceAll('{name}', name)
    .replaceAll('{link}', link);
}

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

async function pickRecipients(segment) {
  const guestCodes = await redis.smembers('guest-codes');
  const allGuests = await Promise.all(guestCodes.map(c => redis.get(`guest:${c}`)));
  const withEmail = allGuests.filter(g => g && !g.isHost && g.email);

  if (segment === 'all') return withEmail;

  const allEvents = (await redis.get('events')) || [];

  if (segment === 'confirmed-any') {
    const result = [];
    for (const g of withEmail) {
      const invited = allEvents.filter(e => isInvited(e, g.code));
      const rsvps = await Promise.all(invited.map(e => redis.get(`rsvp:${g.code}:${e.id}`)));
      if (rsvps.some(r => r?.status === 'attending')) result.push(g);
    }
    return result;
  }

  if (segment.startsWith('confirmed-event:')) {
    const eventId = segment.slice('confirmed-event:'.length);
    const result = [];
    for (const g of withEmail) {
      const r = await redis.get(`rsvp:${g.code}:${eventId}`);
      if (r?.status === 'attending') result.push(g);
    }
    return result;
  }

  return [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { code, segment, subject, body, preview } = req.body || {};
  const authErr = await requireHost(code);
  if (authErr) return res.status(authErr.status).json(authErr.body);
  if (!segment) return res.status(400).json({ error: 'Missing segment' });

  const recipients = await pickRecipients(segment);

  if (preview) {
    return res.status(200).json({ ok: true, count: recipients.length });
  }

  if (!subject || !body) return res.status(400).json({ error: 'Missing subject or body' });
  if (recipients.length === 0) return res.status(200).json({ ok: true, sent: 0, total: 0 });

  const results = await Promise.all(
    recipients.map(g => {
      const link = `${BASE_URL}/?code=${g.code}`;
      const personalBody = renderTemplate(body, { name: g.name, link });
      const bodyHtml = personalBody.split('\n\n')
        .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
        .join('');
      return sendEmail({
        to: g.email,
        subject: renderTemplate(subject, { name: g.name, link }),
        html: `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#1c1c16;max-width:560px;">
          <p>${escapeHtml(config.strings.email.broadcastGreeting)} ${escapeHtml(g.name)},</p>
          ${bodyHtml}
          <p style="margin-top:32px;color:#7a8a85;">${escapeHtml(config.strings.email.broadcastSignoff)} ${escapeHtml(config.host.name)}</p>
        </div>`,
        logContext: { broadcast: segment, recipient: g.code },
      });
    })
  );

  const sent = results.filter(r => r.ok).length;
  const failed = results.length - sent;
  return res.status(200).json({ ok: sent > 0, sent, failed, total: recipients.length });
}
