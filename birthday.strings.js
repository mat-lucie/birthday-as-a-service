/**
 * birthday.strings.js — User-visible UI string catalog with English defaults.
 *
 * FORKER GUIDE
 * ────────────
 * Override any string here to localize or personalize your copy. Run
 *   node scripts/apply-config.mjs
 * after editing.
 *
 * GROUPS
 *   rsvp     — guest-facing RSVP flow (event cards, buttons, plus-one row)
 *   states   — loading, invalid code, success, and other app states
 *   modal    — confirm-calendar modal dialogs
 *   admin    — admin panel: tabs, buttons, labels, column headers, empty states
 *   calendar — calendar.html page chrome (hero, timeline, coda)
 *   common   — shared: save, cancel, close, edit, delete, copy, search, etc.
 *
 * RUNTIME INTERPOLATION
 * ─────────────────────
 * Some strings are used in JS logic that splices in dynamic values (counts,
 * names, etc.). These are noted with a comment and kept as English templates;
 * the JS code at those sites has been updated to read from
 * window.BIRTHDAY_CONFIG.strings.<group>.<key>.
 *
 * Strings in the `calendar` group that appear in static HTML (not JS) become
 * {{strings.calendar.xxx}} build-time tokens. Strings used in JS become
 * window.BIRTHDAY_CONFIG.strings.calendar.xxx runtime reads.
 */

export default {

  // ── Guest-facing RSVP flow ───────────────────────────────────────────────
  rsvp: {
    /** RSVP "yes" button — inactive state */
    yes:              'Yes',
    /** RSVP "yes" button — confirmed state (shows checkmark prefix in code) */
    yesConfirmed:     'Yes, going ·',
    /** RSVP "no" button */
    no:               'No',

    /** Desktop kit: yes button inactive */
    kitYes:           'Going',
    /** Desktop kit: yes button confirmed */
    kitYesConfirmed:  '✓ Going',
    /** Desktop kit: no button */
    kitNo:            "Can't make it",
    /** Desktop kit: "you confirmed" badge shown on tile */
    kitGoingBadge:    '✓ going',

    /** Expand/collapse toggle — expand label */
    details:          'Details',
    /** Expand/collapse toggle — collapse label */
    close:            'Close',

    /** Desktop kit: expand toggle */
    seeMore:          'see more',
    /** Desktop kit: collapse toggle */
    seeLess:          'close',

    /** Past-event card: badge */
    pastBadge:        'Past',
    /** Past-event card: attended footer */
    pastAttended:     'You were there · thanks for coming.',
    /** Past-event card: did not attend footer */
    pastMissed:       'That one passed.',

    /** Plus-one checkbox label */
    plusOneLabel:     'Bringing someone',
    /** Plus-one name input placeholder */
    plusOnePlaceholder: "Guest's name (optional)",
    /** Desktop kit plus-one name placeholder */
    plusOneNameShort: 'Name (optional)',

    /** Attendee count — singular */
    personSingular:   'person',
    /** Attendee count — plural */
    personPlural:     'people',

    /**
     * Hero paragraph — runtime interpolated.
     * Used as: `${guestName} — ${strings.rsvp.heroBody}`
     */
    heroBody:         '— choose the events you want to attend. You\'ll get a direct calendar invite for each one.',

    /**
     * Desktop intro paragraph (static, not interpolated)
     */
    desktopIntroBody: 'Choose the events you want to attend. You\'ll get a direct calendar invite for each one.',

    /**
     * Hero countdown label — days until start (> 0)
     * Runtime interpolated: `${days} ${label}`
     */
    daysUntilStart:   'days until it starts',
    /** Hero countdown label — starts today */
    startsToday:      'starts today',
    /** Hero countdown label — past / thank-you */
    thankYou:         'thanks for celebrating',

    /**
     * Timeline section header
     */
    theWeek:          'The week',

    /** Desktop top bar: "chosen" counter label */
    chosenLabel:      'chosen',

    /**
     * Timeline events header label — runtime interpolated.
     * Used as: `${n} events` / `${n} events · ${k} for you`
     */
    eventsLabel:       'events',
    eventsForYou:      'for you',

    /** RSVP inline error: save failed */
    rsvpSaveError:    'Not saved. Retry.',
    /** RSVP error banner: retry button */
    retryButton:      'Retry →',

    /** Email second-factor prompt — shown reactively after a 403 emailRequiredToChange */
    emailConfirmTitle:       'Enter the email on file to change your RSVP',
    /** Email second-factor prompt — input placeholder */
    emailConfirmPlaceholder: 'your@email.com',
    /** Email second-factor prompt — submit button */
    emailConfirmSubmit:      'Confirm →',
    /** Email second-factor prompt — shown when the email doesn't match */
    emailConfirmMismatch:    'That email doesn\'t match. Try again.',

    /** Sticky CTA: first confirmation */
    ctaSend:          'Send to calendar',
    /** Sticky CTA: update confirmation */
    ctaUpdate:        'Update invitations',

    /**
     * Desktop confirm strip — event count labels.
     * Runtime interpolated: `${count} event chosen` / `${count} events chosen`
     */
    eventSingular:    'event chosen',
    eventPlural:      'events chosen',
    /** Desktop confirm strip — first confirmation tail */
    stripSend:        'we\'ll send you the calendar.',
    /** Desktop confirm strip — update tail */
    stripUpdate:      'update invitations.',
    /** Desktop confirm strip — button first */
    stripConfirmBtn:  'Confirm and send',
    /** Desktop confirm strip — button update */
    stripUpdateBtn:   'Update',

    /**
     * Cumple badge (main event badge) — short label
     */
    cumpleBadge:      'The birthday',
    /**
     * "Para ti" badge — private event label
     */
    paraTiBadge:      'For you',
    /**
     * Desktop tile headliner time suffix
     */
    kitHeadlinerSuffix: '· The birthday',
  },

  // ── App states (loading, error, success) ─────────────────────────────────
  states: {
    /** Loading screen headline (may be overridden in site.loadingHeadline) */
    loadingLabel:     'Preparing your invitation',

    /** Invalid-code screen: label */
    invalidCodeLabel: '404 · Invitation not found',
    /**
     * Invalid-code screen: headline when no message — runtime interpolated.
     * Falls back to this when the API returns no message.
     */
    invalidCodeHeadline: "This link<br/><em style=\"font-style:italic;color:var(--primaryC)\">doesn't know you.</em>",
    /**
     * Invalid-code screen: body paragraph.
     * Runtime interpolated: `${hostName}` is spliced in by JS.
     * Template: "Each guest has their own link. Check the message {hostName} sent you, or reach out directly."
     */
    invalidCodeBody:  'Each guest has their own link. Check the message',
    invalidCodeBodySuffix: 'sent you, or reach out directly.',

    /**
     * Success screen: confirmed label prefix — runtime interpolated.
     * Used as: `Confirmed · ${n} ${event/events}`
     */
    confirmedLabel:   'Confirmed',
    /** Success screen: headline */
    successHeadline:  "Done.",
    /** Success screen: sub-headline (italic, secondary color) */
    successSubhead:   "We'll be waiting.",
    /**
     * Success screen: body paragraph — runtime interpolated.
     * Template: "We sent an email to {email} with {n event(s)} in one calendar. Open it from your phone — they'll add themselves."
     */
    successBodyPrefix:  'We sent an email to',
    successBodyMiddle:  'with',
    successBodySuffix:  'in one calendar. Open it from your phone — they\'ll add themselves.',
    /** Success screen: event singular */
    successEventSingular: 'the event',
    /** Success screen: event plural (runtime: `the ${n} events`) */
    successEventPluralPrefix: 'the',
    successEventPluralSuffix: 'events',
    /** Success screen: back/edit button */
    successEditBtn:   'Edit my RSVPs',

    /** Admin loading stub text */
    loadingDots:      'Loading…',

    /** Server-error screen: shown instead of the 404 copy when the API returns 5xx */
    serverError:      'Something went wrong on our end. Please try again in a moment.',

    /**
     * Section heading for events whose date falls outside the configured birthday week
     * (startDate..endDate). Shown below the main week board/strip when such events exist.
     */
    otherDatesLabel:  'Other dates',
  },

  // ── Confirm-calendar modal dialogs ───────────────────────────────────────
  modal: {
    // ── Default (first-time email entry) ──────────────────────────
    /** Modal step label */
    defaultStep:      'Final step',
    /** Modal headline */
    defaultHeadline:  'Where should',
    /** Modal headline italic */
    defaultHeadlineItalic: 'we send it?',
    /**
     * Modal body — runtime interpolated.
     * Template: "You'll get an email with {confirmation/confirmations} in one calendar."
     */
    defaultBodyPrefix:        "You'll get an email with",
    defaultBodySuffix:        'in one calendar.',
    /** Modal confirmation singular */
    confirmationSingular:     'the confirmation',
    /** Modal confirmation plural prefix — runtime: `the ${n} confirmations` */
    confirmationPluralPrefix: 'the',
    confirmationPluralSuffix: 'confirmations',
    /** Email field label */
    emailLabel:       'Your email',
    /** Email input placeholder */
    emailPlaceholder: 'you@email.com',
    /** Submit button */
    sendBtn:          'Send invitations',

    // ── Sending state ──────────────────────────────────────────────
    /** Modal step label */
    sendingStep:      'Sending',
    /** Modal headline */
    sendingHeadline:  'Sending',
    /** Modal headline italic */
    sendingHeadlineItalic: 'your calendar…',
    /** Submit button (disabled) */
    sendingBtn:       'Sending…',

    // ── Error state ────────────────────────────────────────────────
    /** Modal step label */
    errorStep:        'Something went wrong',
    /** Modal error headline */
    errorHeadline:    "Didn't go through.",
    /** Modal error sub-headline italic */
    errorSubhead:     'Shall we try again?',
    /**
     * Default error message — shown when API returns no message.
     */
    errorDefault:     "We couldn't send your calendar. Check the email address and try again.",
    /** Retry submit button */
    retryBtn:         'Retry',

    // ── Email on file ──────────────────────────────────────────────
    /** Modal step label */
    emailOnFileStep:  'Quick resend',
    /** Modal headline */
    emailOnFileHeadline: 'Same email',
    /** Modal headline italic */
    emailOnFileHeadlineItalic: 'as last time?',
    /** Modal body */
    emailOnFileBody:  'It\'s the email you used last time.',
    /** Cancel button */
    cancelBtn:        'Cancel',
    /** Send button */
    sendSameBtn:      'Yes, send →',

    // ── Validation ─────────────────────────────────────────────────
    /** Inline error when typed email is invalid */
    invalidEmail:     'Invalid email. Please double-check.',
  },

  // ── Admin panel ──────────────────────────────────────────────────────────
  admin: {
    // ── Login screen ──────────────────────────────────────────────
    /** Admin login screen: page title */
    loginTitle:             'Admin Login',
    /** Admin login screen: password field label */
    loginPasswordLabel:     'Password',
    /** Admin login screen: password field placeholder */
    loginPasswordPlaceholder: 'Enter admin password',
    /** Admin login screen: submit button */
    loginSubmit:            'Sign in',
    /** Admin login screen: wrong password message */
    loginWrongPassword:     'Incorrect password.',
    /** Admin login screen: too many attempts message */
    loginTooManyAttempts:   'Too many attempts. Please wait a minute.',
    /** Admin login screen: generic error */
    loginError:             'Something went wrong. Please try again.',
    /** Admin login screen: session expired message */
    loginSessionExpired:    'Your session expired. Please sign in again.',

    // ── Logout ────────────────────────────────────────────────────
    /** Admin panel header: logout button */
    logout:                 'Sign out',

    // ── Shell ──────────────────────────────────────────────────────
    /** Admin panel eyebrow label prefix (followed by site.title) */
    eyebrow:          'Admin ·',
    /** Admin panel main heading */
    panelTitle:       'Panel',

    // ── Tab labels ─────────────────────────────────────────────────
    tabEvents:        'Events',
    tabGuests:        'Guests',
    tabRsvps:         'RSVPs',
    tabBroadcast:     'Broadcast',

    // ── Eventos tab ────────────────────────────────────────────────
    /** Create-event button */
    createEventBtn:   '+ Create event',
    /** Event tile: private badge + count prefix */
    privateBadge:     'Private ·',
    /** Event tile: yes count suffix */
    yesLabel:         'yes',
    /** Event tile: no count suffix */
    noLabel:          'no',
    /** Event tile: pending count suffix */
    pendingLabel:     'pending',

    // ── Edit event form ────────────────────────────────────────────
    /** Edit form header: editing */
    editEventTitle:   'Edit event',
    /** Edit form header: new */
    newEventTitle:    'New event',
    /** Untitled placeholder */
    untitledEvent:    'Untitled',
    /** Form field: title */
    fieldTitle:       'Title',
    /** Form field: date */
    fieldDate:        'Date',
    /** Form field: start time */
    fieldTimeStart:   'Start',
    /** Form field: end time */
    fieldTimeEnd:     'End',
    /** Form field: location */
    fieldLocation:    'Location',
    /** Form field: maps URL */
    fieldMapsUrl:     'Google Maps URL',
    /** Form field: description */
    fieldDescription: 'Description',
    /** Form field: dress code */
    fieldDressCode:   'Dress code (optional)',
    /** Form field: attendee count */
    fieldAttendees:   'Estimated attendees',
    /** Visibility fieldset legend */
    visibilityLegend: 'Visibility',
    /** Visibility: public option */
    visibilityPublic: 'Public',
    /** Visibility: private option */
    visibilityPrivate: 'Private',
    /** +1 fieldset legend */
    plusOneLegend:    '+1',
    /** +1 checkbox label */
    allowPlusOneLabel: 'Allow bringing a +1',
    /** +1 checkbox hint */
    allowPlusOneHint: 'Guests can confirm they\'re bringing someone.',
    /** Guest picker legend */
    guestsLegend:     'Guests',
    /**
     * Personal note placeholder — runtime interpolated with guest name.
     * Template: "Personal note for {name} (optional)"
     */
    personalNotePlaceholder: 'Personal note for',
    personalNotePlaceholderSuffix: '(optional)',
    /** No guests yet */
    noGuestsYet:      'No guests loaded yet.',
    /** Delete event button */
    deleteEventBtn:   'Delete event',
    /** Deleting event button */
    deletingEventBtn: 'Deleting…',
    /** Save button */
    saveBtn:          'Save',
    /** Saving button */
    savingBtn:        'Saving…',
    /** Cancel button */
    cancelBtn:        'Cancel',
    /** Required fields error */
    missingFields:    'Missing fields: title, date, and time are required.',

    // ── Invitados tab ──────────────────────────────────────────────
    /** Create-guest button */
    createGuestBtn:   '+ Create guest',
    /** Guest tile: code field (separator prefix) */
    guestTileEvent:   'event',
    guestTileEvents:  'events',
    /** Guest tile: private count suffix singular */
    privateSingular:  'private',
    /** Guest tile: private count suffix plural */
    privatePlural:    'privates',
    /** Guest tile: email-on-file label */
    emailSaved:       'email saved',
    /** Copy invite link button */
    copyLinkBtn:      'Copy link',
    /** Link copied feedback */
    copiedFeedback:   'Copied ✓',

    // ── Edit guest form ────────────────────────────────────────────
    /** Edit form header: editing */
    editGuestTitle:   'Edit guest',
    /** Edit form header: new */
    newGuestTitle:    'New guest',
    /** Untitled placeholder */
    untitledGuest:    'Untitled',
    /** Field: name */
    fieldName:        'Name',
    /** Code label */
    codeLabel:        'Code (link)',
    /** Code read-only hint */
    codeHint:         'The code cannot be changed — it keeps existing links working.',
    /** Auto-code hint */
    autoCodeHint:     'The code is generated from the name. Example: "Ana Lozano" → ana-lozano.',
    /** Gender fieldset legend */
    genderLegend:     'Gender (for conjugations) *',
    /** Gender: feminine */
    genderFeminine:   'Feminine',
    /** Gender: masculine */
    genderMasculine:  'Masculine',
    /** Field: email */
    fieldEmail:       'Email (optional)',
    /** Delete guest button */
    deleteGuestBtn:   'Delete guest',
    /** Deleting guest button */
    deletingGuestBtn: 'Deleting…',
    /** Guest name required error */
    guestNameRequired: 'Name is required.',
    /** Guest gender required error */
    guestGenderRequired: 'Select the gender (for conjugations).',

    // ── Confirmaciones tab ─────────────────────────────────────────
    /** Filter: all */
    filterAll:        'All',
    /** Filter: with RSVPs — runtime prefix for "With yes · N" */
    filterWithYes:    'With yes',
    /** Filter: empty — runtime prefix for "Empty · N" */
    filterEmpty:      'Empty',
    /** Search placeholder */
    searchPlaceholder: 'Search guest…',
    /** Clear search button */
    clearSearch:      'clear',
    /** No events match filter */
    noEventsMatch:    'No events match the filter.',
    /** Nobody RSVP'd yet */
    nobodyYet:        'Nobody yet',
    /**
     * Confirmed count label — runtime interpolated.
     * Template: `${n} confirmed` / `${n} confirmed + ${k} companion(s) · ${total} total`
     */
    confirmedSingular: 'confirmed',
    confirmedPlural:   'confirmed',
    companionSingular: 'companion',
    companionPlural:   'companions',
    totalLabel:        'total',
    /**
     * Copy list button title attribute
     */
    copyListTitle:    'Copy names',
    copyListBtn:      'Copy list',
    /**
     * Search no-match text — runtime interpolated: `Nobody matches "${search}".`
     */
    searchNoMatch:    'Nobody matches',
    /**
     * Pending section toggle — runtime: `Pending · N` / `Pending · N · K match`
     */
    pendingToggle:    'Pending',
    pendingMatches:   'match',
    /**
     * Pending no-match
     */
    pendingNoMatch:   'Nobody matches.',

    // ── Broadcast tab ──────────────────────────────────────────────
    /** Segment section heading */
    recipientsHeading: 'Recipients',
    /** Segment: all */
    segmentAll:       'Everyone',
    /** Segment: all description */
    segmentAllDesc:   'Any guest with a saved email address',
    /** Segment: confirmed-any */
    segmentConfirmedAny: 'Confirmed (any event)',
    /** Segment: confirmed-any description */
    segmentConfirmedAnyDesc: "Those who said yes to at least one",
    /**
     * Per-event segment label — runtime interpolated.
     * Template: `Confirmed for ${eventTitle}`
     */
    segmentEventPrefix: 'Confirmed for',
    /** Per-event segment description */
    segmentEventDesc:   'Only those who said yes to this event',
    /** Message section heading */
    messageHeading:   'Message',
    /** Subject field label */
    subjectLabel:     'Subject',
    /** Subject placeholder */
    subjectPlaceholder: 'Email subject',
    /** Body field label */
    bodyLabel:        'Body',
    /** Body placeholder */
    bodyPlaceholder:  "The email starts with 'Hello [name],' automatically.",
    /** Body hint */
    bodyHint:         'Double line break = new paragraph. Signature "— {hostName}" is added at the end. Use {name} and {link} to personalize.',
    /** Recipient count loading */
    recipientCounting: 'Counting recipients…',
    /** Recipient count: none */
    recipientNone:    'Nobody in this segment.',
    /** Recipient count singular */
    recipientSingular: 'recipient',
    /** Recipient count plural */
    recipientPlural:  'recipients',
    /** Send button */
    sendBtn:          'Send',
    /** Sending button */
    sendingBtn:       'Sending…',
    /**
     * Sent result — runtime interpolated.
     * Template: `Sent to ${sent} of ${total}` + optional ` · ${failed} failed`
     */
    sentResult:       'Sent to',
    sentOf:           'of',
    sentFailed:       'failed',
    /** Missing subject or body error */
    broadcastMissingError: 'Missing subject or message body.',
    /**
     * Send confirm dialog — runtime interpolated.
     * Template: `Send to ${n} person/people?`
     */
    sendConfirmPrefix: 'Send to',
    sendConfirmSingular: 'person',
    sendConfirmPlural: 'people',

    // ── Popover ────────────────────────────────────────────────────
    /** Popover: view profile */
    popoverProfile:   'View profile',
    /** Popover: copy link */
    popoverCopyLink:  'Copy link',
    /** Popover: WhatsApp */
    popoverWhatsApp:  'WhatsApp',
    /** Popover: clear RSVP */
    popoverClearRsvp: 'Clear RSVP',
    /**
     * WhatsApp message template — runtime interpolated.
     * Template: `Hi ${name}, here's your link for ${siteTitle} (${hostName}): ${inviteLink}`
     */
    whatsAppTemplate: 'Hi',
    whatsAppMiddle:   "here's your link for",

    // ── Toast messages ─────────────────────────────────────────────
    toastLinkCopied:  'Link copied',
    toastCopyFailed:  "Couldn't copy",
    toastRsvpCleared: 'RSVP cleared',
    toastClearFailed: 'Error clearing',
    /**
     * Copied list toast — runtime interpolated.
     * Template: `Copied · ${n}` + optional ` + ${k} +1s`
     */
    toastCopiedList:  'Copied ·',
    toastPlusOnes:    '+1s',

    // ── Confirm dialogs ────────────────────────────────────────────
    /**
     * Delete event confirm dialog — runtime interpolated.
     * Template: (fixed string, translated)
     */
    deleteEventConfirm: 'Delete this event? All RSVPs will also be removed.',
    /**
     * Delete guest confirm dialog — runtime interpolated with guest name.
     * Template: `Delete ${name}? Their RSVPs will be removed and they'll be removed from private events.`
     */
    deleteGuestConfirmPrefix: 'Delete',
    deleteGuestConfirmSuffix: "Their RSVPs will be removed and they'll be removed from private events.",

    // ── API error fallbacks ────────────────────────────────────────
    /** Generic save error */
    saveFailed:       "Couldn't save.",
    /** Generic delete error */
    deleteFailed:     "Couldn't delete.",
    /** Generic send error */
    sendFailed:       "Couldn't send.",
    /** Admin RSVP not saved */
    rsvpNotSaved:     'RSVP not saved',
  },

  // ── calendar.html ─────────────────────────────────────────────────────────
  calendar: {
    // Static HTML strings (become {{strings.calendar.xxx}} build-time tokens)
    /** Masthead back-link text */
    backLink:         '← Back',
    /** Hero label above h1 */
    heroLabel:        'The calendar',
    /** Hero headline line 1 */
    heroH1Line1:      'One week,',
    /** Hero headline line 2 (italic em) */
    heroH1Line2:      'in order.',
    /** Hero headline line 3 — "today first" part */
    heroH1Line3a:     "Today first —",
    /** Hero headline line 3 — "later" span (underline highlight) */
    heroH1Line3b:     'later',
    /** Hero headline line 3 — trailing text */
    heroH1Line3c:     ', later.',
    /** Hero lede paragraph */
    heroLede:         'Scroll through time. Closest first, furthest below. Each day announces itself with its number; the rail marks the passage of days.',
    /** Hero meta: countdown label */
    countdownLabel:   'days until it starts',
    /** Hero meta: event summary loading placeholder */
    eventSummaryLoading: 'loading…',

    /** "Today" block: body text */
    todayStrong:      'Today.',
    todayBody:        'Everything below hasn\'t happened yet. Keep scrolling to move forward through the week.',

    /** Timeline threshold heading */
    thresholdHeading: 'Later in the week',

    /**
     * Coda paragraph — static HTML.
     */
    codaText:         'And then, silence — until the next trip around the sun.',

    // JS-generated strings (runtime reads via window.BIRTHDAY_CONFIG.strings.calendar.xxx)
    /**
     * Error / no-code message — runtime interpolated with host name.
     * Template: `This link doesn't know you. Ask ${hostName} for yours.`
     */
    noCodeErrorPrefix:  "This link doesn't know you. Ask",
    noCodeErrorSuffix:  'for yours.',

    /**
     * Distance phrases — runtime interpolated with day count.
     */
    distancePastSuffix: 'days ago',
    distancePastDaySuffix: 'day ago',
    distanceToday:    'today',
    distanceTomorrow: 'tomorrow',
    distanceNextDaysPrefix: 'in',
    distanceNextDaysSuffix: 'days',
    distanceWeekSuffix: 'week',
    distanceWeeksPrefix: 'in',
    distanceWeeksSuffix: 'days',

    /**
     * Event summary (below countdown) — runtime interpolated.
     * Template: `${n} moments` / `${n} moments · ${k} for you`
     */
    momentsLabel:     'moments',
    momentsForYou:    'for you',

    // Card strings
    /** Private event badge (same as rsvp.paraTiBadge but used in calendar.html JS) */
    privateBadge:     'For you',

    /** Person count singular */
    personSingular:   'person',
    /** Person count plural */
    personPlural:     'people',

    // Day header — weekday names (used by WEEKDAYS_ES_LONG / SHORT in JS)
    // These are replaced by English arrays hardcoded in the template.
    weekdaysLong:  'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
    weekdaysShort: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    monthsShort:   'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',

    /** Threshold distance marker prefix when days > 0 */
    thresholdMarkerPrefix: '+',
    thresholdMarkerSuffix: 'days',
    thresholdMarkerNone:   '—',
  },

  // ── Email body copy (sent by api/confirm.js and api/admin/broadcast.js) ────
  email: {
    /**
     * Plain-text body for the calendar confirmation email.
     * Runtime interpolated: guestName, eventTitles.
     * Template: `${guestName}! You confirmed for: ${eventTitles}. Open the attachment to add them to your calendar.`
     */
    confirmBodyPrefix:   'You confirmed for:',
    confirmBodySuffix:   'Open the attachment to add them to your calendar.',

    /**
     * Broadcast email greeting — runtime interpolated with guest name.
     * Template: `Hello ${name},`
     */
    broadcastGreeting:   'Hello',

    /**
     * Broadcast email sign-off — runtime interpolated with host short name.
     * Template: `— ${hostName}`
     */
    broadcastSignoff:    '—',
  },

  // ── API error messages returned to clients ────────────────────────────────
  errors: {
    /** Returned when eventIds[] is empty after validation */
    eventIdsEmpty:       'eventIds[] empty after validation.',
    /** Returned when guest attempts to add a +1 to an event that disallows it */
    plusOneNotAllowed:   'Plus-ones are not allowed for this event.',
    /** Returned when a client hits the rate limit */
    rateLimited:         'Too many attempts. Please wait a minute.',
    /** Returned when email format is invalid */
    emailInvalid:        'Invalid email address.',
    /**
     * Returned when guest tries to change a saved email.
     * Runtime interpolated with config.messages.emailChangeError.
     * Template: `You already have a saved email. ${emailChangeError}`
     */
    emailAlreadySaved:   'You already have a saved email.',
    /**
     * Returned when calendar email send fails.
     * Runtime interpolated with error message.
     * Template: `We could not send you the calendar email: ${errorMessage}`
     */
    calendarSendFailed:  'We could not send you the calendar email:',

    // ── Admin authentication errors ────────────────────────────────
    /**
     * Returned when ADMIN_PASSWORD / ADMIN_SESSION_SECRET env vars are unset.
     * Surfaced to the admin UI — not shown to guests.
     */
    adminNotConfigured:       'Admin auth not configured (set ADMIN_PASSWORD).',
    /**
     * Returned when the admin_session cookie is missing or its token is
     * invalid / expired.  Generic to avoid leaking verification details.
     */
    notAuthenticated:         'Not authenticated.',
    /** Returned when a POST/PUT/PATCH/DELETE comes from a different origin. */
    crossOriginBlocked:       'Cross-origin request blocked.',
    /** Returned on a failed login attempt.  Generic to avoid user enumeration. */
    loginIncorrect:           'Incorrect password.',

    // ── Admin guest management errors ──────────────────────────────
    /** Returned when guest name is missing on create/update */
    adminGuestNameRequired:   'Name is required.',
    /** Returned when guest gender is missing or invalid on create/update */
    adminGuestGenderRequired: 'Gender is required (f or m).',
    /** Returned when the name generates no valid code */
    adminGuestInvalidName:    'Invalid name (generates no code).',
    /**
     * Returned when a guest with that code already exists.
     * Runtime interpolated: `${adminGuestDuplicateCode} "${code}".`
     */
    adminGuestDuplicateCode:  'A guest with that code already exists:',
    /** Returned when the host guest cannot be deleted */
    adminGuestCannotDeleteHost: 'The host guest cannot be deleted.',

    /**
     * Returned when a guest with a saved email tries to modify their RSVP
     * without supplying that same email (security.requireEmailForChanges = true).
     */
    emailRequiredToChange: 'Enter the email on file to change your RSVP.',
  },

  // ── Shared / common ───────────────────────────────────────────────────────
  common: {
    save:     'Save',
    saving:   'Saving…',
    cancel:   'Cancel',
    close:    'Close',
    edit:     'Edit',
    delete:   'Delete',
    deleting: 'Deleting…',
    add:      'Add',
    send:     'Send',
    sending:  'Sending…',
    retry:    'Retry',
    copy:     'Copy',
    search:   'Search',
    clear:    'Clear',
    name:     'Name',
    email:    'Email',
    date:     'Date',
    time:     'Time',
    location: 'Location',
    event:    'Event',
    events:   'Events',
    guest:    'Guest',
    guests:   'Guests',
    yes:      'Yes',
    no:       'No',
    all:      'All',
    back:     'Back',

    // ── Relative-time labels (used in admin panel "last updated" timestamps) ─
    /** Shown when the update was less than 60 seconds ago */
    timeNow:         'now',
    /** Template for minutes ago — {n} is replaced with the count */
    timeMinutesAgo:  '{n}m ago',
    /** Template for hours ago — {n} is replaced with the count */
    timeHoursAgo:    '{n}h ago',
    /** Template for days ago — {n} is replaced with the count */
    timeDaysAgo:     '{n}d ago',
  },
};
