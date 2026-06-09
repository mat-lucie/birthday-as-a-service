/**
 * scripts/apply-config.mjs
 *
 * Reads birthday.config.js and generates five files:
 *
 *   public/index.html        — from public/index.template.html
 *   public/calendar.html     — from public/calendar.template.html
 *   public/config.js         — window.BIRTHDAY_CONFIG for runtime JS
 *   public/app.js            — extracted inline app script from index.template.html
 *   public/calendar-app.js   — extracted inline app script from calendar.template.html
 *
 * PLACEHOLDER CONVENTION
 * ──────────────────────
 * Templates use {{section.key}} tokens that match the dot-path into the
 * config object, e.g. {{site.title}}, {{locale.htmlLang}}.
 *
 * The template files (*.template.html) are the edited source. The generated
 * *.html files are outputs — do not edit them directly; they will be
 * overwritten on the next run.
 *
 * IDEMPOTENCY
 * ───────────
 * Because we always render from the template source (not from a previously
 * generated file), running this script twice produces identical output.
 * Vercel runs the buildCommand on every deploy, so this property is required.
 *
 * USAGE
 *   node scripts/apply-config.mjs
 *   npm run config
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Load config ────────────────────────────────────────────────────────────
const { default: config } = await import(`${ROOT}/birthday.config.js`);

// ── Derive prose date strings from ISO dates + locale ──────────────────────
/**
 * Derives the four prose date-range strings from ISO start/end dates and a
 * BCP-47 language tag. Uses Intl.DateTimeFormat.formatToParts() so month
 * names localise automatically (e.g. 'es' → 'jun'/'junio') while we control
 * the exact punctuation (en-dash –, em-dash —).
 *
 * ISO dates are parsed as local-noon (T12:00:00) to avoid UTC midnight
 * rolling back one day in negative-offset time zones.
 *
 * Returns an object with keys: dateRange, dateRangeShort, dateRangeFull, monthYear.
 * Returns null (with a warning logged) if the dates are invalid.
 */
function deriveDateStrings(startISO, endISO, language) {
  if (!startISO || !endISO) {
    console.warn('  [WARN] deriveDateStrings: startDate or endDate is empty — skipping derivation, manual values will be used.');
    return null;
  }

  const start = new Date(`${startISO}T12:00:00`);
  const end   = new Date(`${endISO}T12:00:00`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.warn(`  [WARN] deriveDateStrings: could not parse dates ("${startISO}", "${endISO}") — skipping derivation, manual values will be used.`);
    return null;
  }

  const lang = language || 'en';

  // Helper: extract a named part from formatToParts output
  function part(parts, type) {
    return (parts.find(p => p.type === type) || { value: '' }).value;
  }

  // Formatters
  const fmtShortMonth = new Intl.DateTimeFormat(lang, { month: 'short' });
  const fmtLongMonth  = new Intl.DateTimeFormat(lang, { month: 'long' });
  const fmtYear       = new Intl.DateTimeFormat(lang, { year: 'numeric' });

  const startShortMonth = fmtShortMonth.format(start);
  const endShortMonth   = fmtShortMonth.format(end);
  const startLongMonth  = fmtLongMonth.format(start);
  const endLongMonth    = fmtLongMonth.format(end);
  const startDay        = start.getDate();
  const endDay          = end.getDate();
  const startYear       = start.getFullYear();
  const endYear         = end.getFullYear();

  const sameMonth = (start.getMonth() === end.getMonth() && startYear === endYear);
  const sameYear  = (startYear === endYear);

  // ── dateRange: "Jun 1 – 7, 2026"  /  cross-month: "May 31 – Jun 7, 2026"
  //               cross-year: "Dec 31, 2025 – Jan 2, 2026"
  let dateRange;
  if (sameMonth) {
    dateRange = `${startShortMonth} ${startDay} – ${endDay}, ${startYear}`;
  } else if (sameYear) {
    dateRange = `${startShortMonth} ${startDay} – ${endShortMonth} ${endDay}, ${startYear}`;
  } else {
    dateRange = `${startShortMonth} ${startDay}, ${startYear} – ${endShortMonth} ${endDay}, ${endYear}`;
  }

  // ── dateRangeShort: "Jun 1–7"  /  cross-month: "May 31 – Jun 7"  (no year)
  let dateRangeShort;
  if (sameMonth) {
    dateRangeShort = `${startShortMonth} ${startDay}–${endDay}`;
  } else {
    dateRangeShort = `${startShortMonth} ${startDay} – ${endShortMonth} ${endDay}`;
  }

  // ── dateRangeFull: "June 1 — 7, 2026"  /  cross-month: "May 31 — June 7, 2026"
  //                  cross-year: "December 31, 2025 — January 2, 2026"
  let dateRangeFull;
  if (sameMonth) {
    dateRangeFull = `${startLongMonth} ${startDay} — ${endDay}, ${startYear}`;
  } else if (sameYear) {
    dateRangeFull = `${startLongMonth} ${startDay} — ${endLongMonth} ${endDay}, ${startYear}`;
  } else {
    dateRangeFull = `${startLongMonth} ${startDay}, ${startYear} — ${endLongMonth} ${endDay}, ${endYear}`;
  }

  // ── monthYear: "Jun 2026" (short month + year of start date)
  const monthYear = `${startShortMonth} ${startYear}`;

  return { dateRange, dateRangeShort, dateRangeFull, monthYear };
}

// ── Apply derived date strings (manual overrides win if non-empty) ──────────
const derivedDates = deriveDateStrings(
  config.event.startDate,
  config.event.endDate,
  config.locale.language,
);

const DATE_PROSE_FIELDS = ['dateRange', 'dateRangeShort', 'dateRangeFull', 'monthYear'];

// Track which fields are using a manual override (for logging).
const dateFieldSources = {};
if (derivedDates) {
  for (const field of DATE_PROSE_FIELDS) {
    const manual = config.event[field];
    const isOverride = manual && typeof manual === 'string' && manual.trim() !== '';
    // Manual value wins if non-empty string; otherwise use derived.
    config.event[field] = isOverride ? manual : derivedDates[field];
    dateFieldSources[field] = isOverride ? 'override' : 'derived';
  }
}

// ── Flatten config into a token map { 'site.title': "Sam's Birthday Week", … } ───
function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}
const tokens = flatten(config);

// ── Replace all {{key}} occurrences in a string ────────────────────────────
function applyTokens(src) {
  return src.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(tokens, key)) {
      return tokens[key];
    }
    // Unknown placeholder — leave it intact and warn so the operator notices.
    console.warn(`  [WARN] Unknown placeholder: {{${key}}} — left as-is`);
    return match;
  });
}

// ── HTML-attribute-quote safety check ─────────────────────────────────────
// Detects a `"` inside a config value that is destined for a double-quoted
// HTML attribute (e.g. <meta content="…">). Such a value would silently
// break attribute quoting and the JS-parse self-test would NOT catch it.
// We check the token map at build time, before rendering, so the error
// names the offending key rather than pointing at broken HTML.
function checkAttributeQuoteSafety() {
  // These token keys are rendered into double-quoted HTML attribute values.
  const attributeKeys = [
    'site.ogTitle',
    'site.ogDescription',
    'site.ogImageAlt',
    'site.ogImageUrl',
    'site.domain',
    'calendar.ogTitle',
  ];
  const offending = [];
  for (const key of attributeKeys) {
    const val = tokens[key];
    if (val !== undefined && val.includes('"')) {
      offending.push(`  ${key}: ${JSON.stringify(val)}`);
    }
  }
  if (offending.length > 0) {
    console.error('  [FAIL] Attribute-quote safety: the following config values contain an unescaped `"` and would break HTML attribute quoting:');
    offending.forEach(line => console.error(line));
    console.error('  Fix: remove or escape the `"` in birthday.config.js for those keys.');
    process.exit(1);
  }
}
checkAttributeQuoteSafety();

// ── Auto-generated HTML banner ─────────────────────────────────────────────
const HTML_BANNER_INDEX    = '<!-- AUTO-GENERATED by scripts/apply-config.mjs — edit public/index.template.html, not this file. -->\n';
const HTML_BANNER_CALENDAR = '<!-- AUTO-GENERATED by scripts/apply-config.mjs — edit public/calendar.template.html, not this file. -->\n';

// ── JS banner for extracted external script files ──────────────────────────
function jsScriptBanner(templateName) {
  return `// AUTO-GENERATED by scripts/apply-config.mjs — edit public/${templateName}, not this file.\n`;
}

// ── Extract the single large inline <script> (no src=) from an HTML string ──
// Finds the first <script> tag with no src= attribute, extracts its inner JS
// body, and replaces the whole block with a <script src="…"> reference.
// Returns { html, scriptBody } where scriptBody is the raw JS (without tags).
// Assumption (verified): neither template contains a literal </script> inside
// the JS body, so a straightforward split on the closing tag is safe.
function extractInlineScript(html, srcRef) {
  // Match an opening <script> that has NO src= attribute, capturing the body.
  // We use a two-step approach: find the opening tag, then scan for </script>.
  const openTagRe = /<script(?![^>]*\bsrc\s*=)[^>]*>/i;
  const openMatch = openTagRe.exec(html);
  if (!openMatch) {
    throw new Error(`extractInlineScript: no inline <script> (without src=) found; cannot extract to ${srcRef}`);
  }
  const openTagEnd = openMatch.index + openMatch[0].length;
  const closeTag = '</script>';
  const closeIndex = html.indexOf(closeTag, openTagEnd);
  if (closeIndex === -1) {
    throw new Error(`extractInlineScript: found opening <script> but no matching </script> for ${srcRef}`);
  }
  const scriptBody = html.slice(openTagEnd, closeIndex);
  const before = html.slice(0, openMatch.index);
  const after  = html.slice(closeIndex + closeTag.length);
  const replacement = `<script src="${srcRef}"></script>`;
  return { html: before + replacement + after, scriptBody };
}

// ── Process one template → output pair ────────────────────────────────────
// opts.extractScript: { scriptOutputPath, srcRef, templateName }
//   If provided, the single inline <script> (no src=) is extracted to
//   scriptOutputPath and replaced in the HTML with <script src="srcRef">.
function processTemplate(templatePath, outputPath, label, banner, opts = {}) {
  let src;
  try {
    src = readFileSync(templatePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(`  [SKIP] ${label}: template not found at ${templatePath}`);
      return { replaced: 0, skipped: true };
    }
    throw err;
  }

  let result = applyTokens(src);

  // Count how many substitutions were actually made (each unique match counts once per occurrence)
  const hits = (src.match(/\{\{[\w.]+\}\}/g) || []).length;

  // Extract inline app script if requested
  if (opts.extractScript) {
    const { scriptOutputPath, srcRef, templateName } = opts.extractScript;
    const extracted = extractInlineScript(result, srcRef);
    result = extracted.html;
    const jsContent = jsScriptBanner(templateName) + extracted.scriptBody;
    writeFileSync(scriptOutputPath, jsContent, 'utf8');
    console.log(`  [OK]   ${templateName} script → ${scriptOutputPath.replace(ROOT, '.')} (extracted inline app script)`);
  }

  // Prepend the auto-generated banner as the very first line
  writeFileSync(outputPath, (banner || '') + result, 'utf8');
  console.log(`  [OK]   ${label} → ${outputPath.replace(ROOT, '.')} (${hits} placeholder${hits !== 1 ? 's' : ''} applied)`);
  return { replaced: hits, skipped: false };
}

// ── Write public/config.js ─────────────────────────────────────────────────
// All fields in birthday.config.js are public-facing copy — none are secrets.
// This makes the full config available to frontend JS at window.BIRTHDAY_CONFIG.
function writeRuntimeConfig(outputPath) {
  const json = JSON.stringify(config, null, 2);
  const content = `// AUTO-GENERATED by scripts/apply-config.mjs — do not edit directly.\n// Edit birthday.config.js and run: npm run config\nwindow.BIRTHDAY_CONFIG = ${json};\n`;
  writeFileSync(outputPath, content, 'utf8');
  console.log(`  [OK]   config.js → ${outputPath.replace(ROOT, '.')} (runtime window.BIRTHDAY_CONFIG)`);
}

// ── Check data.json events against the configured week window ─────────────
// For each event whose date falls outside [startDate, endDate], emit a WARN so
// the forker notices before publishing.  This is a WARNING only — not a build
// failure, because a pre/post event is a legitimate choice.
function checkOutOfWindowEvents() {
  const { startDate, endDate } = config.event;
  if (!startDate || !endDate) return; // guard: if dates aren't set, skip silently

  const start = new Date(`${startDate}T12:00:00`);
  const end   = new Date(`${endDate}T12:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return; // guard: invalid dates

  let data;
  try {
    const raw = readFileSync(resolve(ROOT, 'data.json'), 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    // data.json missing or malformed — skip gracefully (it may not exist yet in a fresh fork)
    return;
  }

  const events = Array.isArray(data?.events) ? data.events : [];
  for (const ev of events) {
    if (!ev.date || typeof ev.date !== 'string') continue;
    const d = new Date(`${ev.date}T12:00:00`);
    if (isNaN(d.getTime())) continue;
    if (d < start || d > end) {
      const id    = ev.id    || '(no id)';
      const title = ev.title || '(no title)';
      console.warn(`  [WARN] Event "${id}" ("${title}") on ${ev.date} is outside the birthday week (${startDate}..${endDate}) — it will appear under "Other dates", and the week strip only covers the configured window.`);
    }
  }
}
checkOutOfWindowEvents();

// ── Main ───────────────────────────────────────────────────────────────────
console.log('\nbirthdayaas apply-config');
console.log('────────────────────────');
console.log(`  host: ${config.host.fullName} (${config.host.name}), age ${config.host.age}`);
console.log(`  site: ${config.site.title} · ${config.site.domain}`);
console.log(`  event dates: ${config.event.startDate} → ${config.event.endDate}`);
if (derivedDates) {
  // Show each field with its source (derived or manual override)
  for (const field of DATE_PROSE_FIELDS) {
    console.log(`  ${field}: ${config.event[field]}  [${dateFieldSources[field]}]`);
  }
} else {
  console.log(`  event: ${config.event.dateRange} (manual)`);
}
console.log('');

processTemplate(
  resolve(ROOT, 'public/index.template.html'),
  resolve(ROOT, 'public/index.html'),
  'index.html',
  HTML_BANNER_INDEX,
  {
    extractScript: {
      scriptOutputPath: resolve(ROOT, 'public/app.js'),
      srcRef: '/app.js',
      templateName: 'index.template.html',
    },
  },
);

processTemplate(
  resolve(ROOT, 'public/calendar.template.html'),
  resolve(ROOT, 'public/calendar.html'),
  'calendar.html',
  HTML_BANNER_CALENDAR,
  {
    extractScript: {
      scriptOutputPath: resolve(ROOT, 'public/calendar-app.js'),
      srcRef: '/calendar-app.js',
      templateName: 'calendar.template.html',
    },
  },
);

writeRuntimeConfig(resolve(ROOT, 'public/config.js'));

// ── Self-test: spot-check a known value in the generated index.html ────────
console.log('');
console.log('Self-test:');
const generatedIndex = readFileSync(resolve(ROOT, 'public/index.html'), 'utf8');
const checks = [
  ['<title>', `<title>${config.site.title}</title>`],
  ['og:title', `content="${config.site.ogTitle}"`],
  ['lang attr', `lang="${config.locale.htmlLang}"`],
  ['og:url', `content="${config.site.domain}"`],
  ['og:image', `content="${config.site.ogImageUrl}"`],
];
let allPass = true;
for (const [name, needle] of checks) {
  const pass = generatedIndex.includes(needle);
  console.log(`  ${pass ? '✓' : '✗'} ${name}: ${needle.slice(0, 60)}`);
  if (!pass) allPass = false;
}

const generatedCalendar = readFileSync(resolve(ROOT, 'public/calendar.html'), 'utf8');
const calChecks = [
  ['calendar <title>', `<title>${config.calendar.title}</title>`],
  ['calendar og:title', `content="${config.calendar.ogTitle}"`],
];
for (const [name, needle] of calChecks) {
  const pass = generatedCalendar.includes(needle);
  console.log(`  ${pass ? '✓' : '✗'} ${name}: ${needle.slice(0, 60)}`);
  if (!pass) allPass = false;
}

// Check no unresolved placeholders remain in generated files
for (const [filename, content] of [['index.html', generatedIndex], ['calendar.html', generatedCalendar]]) {
  const remaining = content.match(/\{\{[\w.]+\}\}/g) || [];
  if (remaining.length > 0) {
    console.log(`  ✗ unresolved placeholders in ${filename}: ${remaining.join(', ')}`);
    allPass = false;
  } else {
    console.log(`  ✓ no unresolved placeholders in ${filename}`);
  }
}

// Check that the generated HTML files contain NO remaining inline <script> bodies
// (they should only have <script src="…"> references after extraction)
for (const [name, content] of [['index.html', generatedIndex], ['calendar.html', generatedCalendar]]) {
  const scriptRe = /<script(?:\s[^>]*)?>([^]*?)<\/script>/gi;
  let match;
  let foundInline = false;
  while ((match = scriptRe.exec(content)) !== null) {
    const body = match[1];
    if (body.trim()) {
      foundInline = true;
      allPass = false;
      console.log(`  ✗ unexpected inline script body remains in ${name} (should have been extracted)`);
    }
  }
  if (!foundInline) {
    console.log(`  ✓ no inline script bodies in ${name} (all extracted to external files)`);
  }
}

// Parse-check the extracted external app script files
for (const [name, path] of [['app.js', resolve(ROOT, 'public/app.js')], ['calendar-app.js', resolve(ROOT, 'public/calendar-app.js')]]) {
  let jsContent;
  try {
    jsContent = readFileSync(path, 'utf8');
  } catch (e) {
    allPass = false;
    console.log(`  ✗ ${name}: file not found at ${path}`);
    continue;
  }
  try {
    // eslint-disable-next-line no-new-func
    new Function(jsContent);
    console.log(`  ✓ ${name} parses as valid JS`);
  } catch (e) {
    allPass = false;
    console.log(`  ✗ ${name} fails to parse: ${e.message}`);
    // Scan flattened config values for quote/backtick that could have broken the script.
    const suspiciousKeys = Object.entries(tokens)
      .filter(([, v]) => v.includes("'") || v.includes('`'))
      .map(([k]) => k);
    if (suspiciousKeys.length > 0) {
      console.log(`  Hint: a config value contains a quote or backtick that may have broken the script. Check these keys in birthday.config.js / birthday.strings.js:`);
      suspiciousKeys.forEach(k => console.log(`    ${k}: ${JSON.stringify(tokens[k])}`));
    }
  }
}

// ── Date-override consistency NOTE ────────────────────────────────────────
// If any prose field was supplied as a manual override, remind the forker that
// they own keeping it in sync with startDate/endDate.
if (derivedDates) {
  const overrides = DATE_PROSE_FIELDS.filter(f => dateFieldSources[f] === 'override');
  if (overrides.length > 0) {
    console.log(`  [NOTE] Manual date overrides active for: ${overrides.join(', ')}. Remember to update them if you change startDate/endDate.`);
  }
}

console.log('');
console.log(allPass ? 'Done. All checks passed.' : 'Done with warnings — see ✗ above.');
console.log('');

if (!allPass) process.exit(1);
