import { Redis } from '@upstash/redis';
import { sendEmail } from '../lib/email.js';
import { confirmLimiter, enforce } from '../lib/ratelimit.js';
import config from '../birthday.config.js';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MAX_EVENT_IDS = 20;

function canSeeEvent(event, code) {
  if (event.visibility === 'public') return true;
  if (event.visibility === 'private') {
    return Array.isArray(event.allowedCodes) && event.allowedCodes.includes(code);
  }
  return false;
}

function escapeIcsText(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function toIcsDateTime(date, time) {
  const [year, month, day] = date.split('-');
  const [hour, minute] = time.split(':');
  return `${year}${month}${day}T${hour}${minute}00`;
}

function addOneDay(date) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildVevent(event) {
  const startDt = toIcsDateTime(event.date, event.time);
  let endDate = event.date;
  let endTime = event.endTime || event.time;
  if (event.endTime && event.endTime < event.time) {
    endDate = addOneDay(event.date);
  }
  const endDt = toIcsDateTime(endDate, endTime);

  return [
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(event.id)}@${config.email.icsDomain}`,
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `LOCATION:${escapeIcsText(event.location || '')}`,
    `DESCRIPTION:${escapeIcsText(event.description || '')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ].join('\r\n');
}

function buildIcs(events) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${config.email.icsOrgName}//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    ...events.map(buildVevent),
    'END:VCALENDAR',
  ].join('\r\n');
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!(await enforce(confirmLimiter, req, res))) return;

    const { code, email, eventIds } = req.body || {};
    if (!code || !Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields: code, eventIds[]' });
    }

    const ids = [...new Set(eventIds.filter(id => typeof id === 'string'))].slice(0, MAX_EVENT_IDS);
    if (ids.length === 0) return res.status(400).json({ error: config.strings.errors.eventIdsEmpty });

    const guest = await redis.get(`guest:${code}`);
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    const finalEmail = email || guest.email;
    if (!finalEmail) return res.status(400).json({ error: 'Email required' });
    if (!EMAIL_RE.test(finalEmail)) return res.status(400).json({ error: config.strings.errors.emailInvalid });

    const allEvents = (await redis.get('events')) || [];
    const selected = [];
    for (const id of ids) {
      const ev = allEvents.find(e => e.id === id);
      if (!ev) return res.status(404).json({ error: `Event not found: ${id}` });
      if (!canSeeEvent(ev, code)) return res.status(403).json({ error: `Not invited to event: ${id}` });
      selected.push(ev);
    }

    if (email && email !== guest.email && guest.email) {
      return res.status(403).json({ error: `${config.strings.errors.emailAlreadySaved} ${config.messages.emailChangeError}` });
    }

    // Optional email second-factor: if the guest has a saved email, any RSVP
    // write must include a matching email. The emailOnFile flow sends no explicit
    // email (body.email is absent) — that path passes because no mismatch exists.
    // Guests with no saved email are unaffected.
    if (config.security?.requireEmailForChanges && guest.email) {
      if (email && email.trim().toLowerCase() !== guest.email.trim().toLowerCase()) {
        return res.status(403).json({ error: config.strings.errors.emailRequiredToChange });
      }
    }

    const now = new Date().toISOString();
    const pipeline = redis.pipeline();
    if (email && !guest.email) {
      pipeline.set(`guest:${code}`, { ...guest, email });
    }
    for (const ev of selected) {
      pipeline.set(`rsvp:${code}:${ev.id}`, { status: 'attending', updatedAt: now });
    }
    await pipeline.exec();

    // The RSVP is intentionally saved BEFORE sending the email. If the email
    // fails, we return 502 but the RSVP persists — a retry is idempotent.
    // Do NOT reorder: sending email first would deliver a calendar for an
    // unsaved RSVP, and a failed pipeline after the email leaves no trace.
    const icsContent = buildIcs(selected);
    const titles = selected.map(e => e.title).join(', ');

    const result = await sendEmail({
      to: finalEmail,
      subject: config.email.calendarSubject,
      text: `${guest.name}! ${config.strings.email.confirmBodyPrefix} ${titles}. ${config.strings.email.confirmBodySuffix}`,
      attachments: [{
        filename: config.email.icsFilename,
        content: Buffer.from(icsContent).toString('base64'),
      }],
      logContext: { code, eventIds: ids },
    });

    if (!result.ok) {
      return res.status(502).json({ error: `${config.strings.errors.calendarSendFailed} ${result.error}` });
    }

    return res.status(200).json({ ok: true, eventsCount: selected.length });
  } catch (err) {
    console.error('confirm handler failed', err?.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
