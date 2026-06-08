/**
 * birthday.config.js — single source of truth for all host-specific identity.
 *
 * FORKER GUIDE
 * ────────────
 * Edit ONLY this file to personalise your copy. Then run:
 *
 *   node scripts/apply-config.mjs
 *   # or: npm run config
 *
 * That regenerates public/index.html, public/calendar.html, and
 * public/config.js from the template files in public/*.template.html.
 * Commit all four generated files alongside this config.
 *
 * KEY SECTIONS
 *
 *   host     — who is the birthday person
 *   site     — page title, OG meta, domain
 *   event    — date range strings used in UI copy
 *   email    — Resend "from" identity, calendar email subject, ICS metadata
 *   locale   — <html lang> and language code
 *   calendar — calendar.html-specific overrides
 *   messages — user-visible error/UI strings
 *   strings  — all user-visible UI strings (see birthday.strings.js)
 *
 * All values here are public-facing copy — none are secrets.
 * Keep secrets in Vercel environment variables, never here.
 */

import strings from './birthday.strings.js';

export default {
  host: {
    /** Short name used inline in copy ("Sam invited you…") */
    name: 'Sam',
    /** Full/formal name for headers and subject lines */
    fullName: 'Sam Rivera',
    /** Contact email shown to guests when they need help */
    email: 'host@example.com',
    /** One-liner blurb, e.g. "turns 30" */
    shortIntro: 'turns 30',
    /** Numeric age — used in loading screen and hero copy */
    age: 30,
  },

  site: {
    /** Browser tab / <title> for index.html */
    title: "Sam's Birthday Week",
    /** Main headline on the hero ("I'm turning 30 —") */
    headline: "I'm turning 30 —",
    /** Hero subheadline / tagline */
    tagline: 'come celebrate (even for one).',
    /** og:title */
    ogTitle: "Sam's Birthday Week",
    /** og:description */
    ogDescription: "I'm turning 30 — come celebrate (even for one).",
    /** Absolute URL to your OG image (1200×630 recommended) */
    ogImageUrl: '/og-image.png',
    /** og:image:alt text */
    ogImageAlt: "Sam's Birthday Week — turning 30. Come celebrate.",
    /** Canonical domain — used in og:url and invite links */
    domain: 'https://your-birthday.example.com',
    /** City/location shown in subheadlines */
    location: 'Your City',
    /** Text shown inside the shimmer loading screen */
    loadingHeadline: 'Preparing your invitation',
  },

  event: {
    /** ISO date of the first day of the birthday week */
    startDate: '2026-06-01',
    /** ISO date of the last day of the birthday week */
    endDate: '2026-06-07',
    /** Human-readable range — used in hero and loading screen */
    dateRange: 'Jun 1 – 7, 2026',
    /** Compact variant used in tight spaces */
    dateRangeShort: 'Jun 1–7',
    /** Long em-dash variant for display headings */
    dateRangeFull: 'June 1 — 7, 2026',
    /** Month + year label */
    monthYear: 'Jun 2026',
  },

  email: {
    /** "From" display name in sent emails */
    fromName: "Sam's Birthday",
    /** "From" email address — must be verified in Resend */
    fromAddress: 'host@example.com',
    /** Subject line for calendar emails */
    calendarSubject: "Your calendar for Sam's Birthday Week",
    /** Filename for the .ics attachment */
    icsFilename: 'birthday-week.ics',
    /** Domain used inside ICS UID fields (no protocol, no trailing slash) */
    icsDomain: 'example.com',
    /** Organizer display name in ICS ORGANIZER property */
    icsOrgName: 'BirthdayWeek',
  },

  locale: {
    /** Value for the <html lang="…"> attribute */
    htmlLang: 'en',
    /** Two-letter language code used in JS locale formatting */
    language: 'en',
  },

  calendar: {
    /** <title> for calendar.html */
    title: "Sam's Birthday Week · the calendar",
    /** og:title for calendar.html */
    ogTitle: "Sam's Birthday Week · the calendar",
  },

  messages: {
    /**
     * Shown in the "change email" error state.
     * Should tell guests who to contact — replace with the host name.
     */
    emailChangeError: 'Ask the host to change it.',
  },

  strings,
};
