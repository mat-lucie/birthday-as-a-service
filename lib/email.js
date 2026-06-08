import { Resend } from 'resend';
import config from '../birthday.config.js';

const FROM = `${config.email.fromName} <${config.email.fromAddress}>`;

const resend = new Resend(process.env.RESEND_API_KEY);

function redact(email) {
  if (!email || typeof email !== 'string') return '(none)';
  const [user, domain] = email.split('@');
  if (!domain) return '(invalid)';
  return `${user.slice(0, 3)}***@${domain}`;
}

export async function sendEmail({ to, subject, text, html, attachments, logContext }) {
  const payload = { from: FROM, to, subject };
  if (text) payload.text = text;
  if (html) payload.html = html;
  if (attachments) payload.attachments = attachments;

  const { error } = await resend.emails.send(payload);
  if (error) {
    console.error('Email send failed', { to: redact(to), ...logContext, error: { message: error.message, name: error.name } });
    return { ok: false, error: error.message || 'unknown' };
  }
  return { ok: true };
}
