// Awards helpers shared by the app and the preview: entry status from the sheet's free-text
// "Entry deadline(s)" column, plus the editorial how-to-enter guide.
// The status is a best reading of that text, so the card always shows the original wording too.

const MONS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');

/** Every day-month date in the text as YYYY-MM-DD. A date with no year takes the year written
 *  elsewhere in the text, or else its next occurrence from today. */
function datesIn(text, today) {
  const hint = (text.match(/\b(20\d\d)\b/) || [])[1];
  const out = [];
  const re = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s+(20\d\d))?/gi;
  for (const m of text.matchAll(re)) {
    const mo = MONS.indexOf(m[2].toLowerCase()) + 1, d = Number(m[1]);
    if (d < 1 || d > 31) continue;
    let y = m[3] || hint;
    if (!y) { const ty = Number(today.slice(0, 4)); y = `${ty}-${pad(mo)}-${pad(d)}` >= today ? ty : ty + 1; }
    out.push(`${y}-${pad(mo)}-${pad(d)}`);
  }
  return out;
}

function daysBetween(a, b) {
  return Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 864e5);
}

/**
 * @param {string|null|undefined} text  the sheet's entry-deadline wording
 * @param {string} today  YYYY-MM-DD
 * @returns {{ state: 'open'|'expected'|'closed'|'unknown', next: string|null, label: string, days: number|null, text: string|null }}
 */
export function entryInfo(text, today) {
  const t = (text || '').trim();
  if (!t || /^check site/i.test(t)) return { state: 'unknown', next: null, label: 'Check the organiser’s site', days: null, text: t || null };
  // "2026: closed Jul/Aug" describes last time round, so the next edition's dates are still to come.
  if (/^20\d\d:?\s+(closed|opened)/i.test(t)) return { state: 'expected', next: null, label: 'Entry dates to come', days: null, text: t };
  if (/^closed\b/i.test(t)) return { state: 'closed', next: null, label: 'Entries closed', days: null, text: t };
  // Estimated or last-year dates ("about 30 Jul", "usually June", "TBC (2026 deadline was 13 Feb)") aren't real deadlines yet.
  if (/\b(about|usually|tbc|was|ran)\b/i.test(t)) return { state: 'expected', next: null, label: 'Entry dates to come', days: null, text: t };
  // Shortlist, finalist and ceremony dates aren't entry deadlines.
  const dates = datesIn(t.replace(/\b(shortlist|finalists?|winners|ceremony|nominations out)\b[^;,)]*/gi, ''), today);
  const future = dates.filter(d => d >= today).sort();
  if (future.length) {
    const next = future[0], days = daysBetween(today, next);
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `${Number(next.slice(8))} ${SHORT[Number(next.slice(5, 7)) - 1]}`;
    // With tiered deadlines, the nearest one is "next deadline", not the close.
    return { state: 'open', next, label: future.length > 1 ? `Next deadline ${when}` : `Deadline ${when}`, days, text: t };
  }
  if (/tbc|usually|about|expected|open|register interest|early|late|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(t) && !dates.length) {
    return { state: 'expected', next: null, label: 'Entry dates to come', days: null, text: t };
  }
  if (/tbc|usually/i.test(t)) return { state: 'expected', next: null, label: 'Entry dates to come', days: null, text: t };
  return dates.length ? { state: 'closed', next: null, label: 'Entries closed', days: null, text: t } : { state: 'unknown', next: null, label: 'Check the organiser’s site', days: null, text: t };
}

export const ENTRY_ORDER = { open: 0, expected: 1, unknown: 2, closed: 3 };
export const ENTRY_TONE = { open: 'badge-glen', expected: 'badge-torc', unknown: '', closed: '' };
export const ENTRY_FILTERS = [
  { key: 'open', label: 'Deadline ahead' },
  { key: 'expected', label: 'Dates to come' },
  { key: 'unknown', label: 'Check site' },
  { key: 'closed', label: 'Closed' },
];

/** The Events Guy's own general advice on entering. It is not any one organiser's rules. */
export const ENTRY_STEPS = [
  { title: 'Pick the award and the category', body: 'Check the scope (UK only, European or global), who can enter (brands, retailers, agencies, in-house teams or suppliers) and the eligibility window. Most awards only count work that ran in the last 12 to 18 months.' },
  { title: 'Diary the deadline you’ll hit', body: 'Many awards run tiered deadlines (super early, early, final, then late) and the fee goes up at each one. Plan for a real date, not the last one, and leave a week for sign-off.' },
  { title: 'Write to the judging criteria', body: 'Organisers publish the criteria and a word limit for each question. Answer each under its own heading: the challenge, what you did, the results and why it mattered to the business.' },
  { title: 'Prove it', body: 'Judges score evidence. Give numbers with a baseline and a time period (“conversion up from 1.8% to 2.6% over Q2”), plus screenshots, links or a client quote. Most awards let you mark figures as confidential.' },
  { title: 'Submit, then plan for the shortlist', body: 'Enter through the organiser’s portal and keep the confirmation email. Put the shortlist date in your diary: shortlisted teams usually need to book a table or tickets for the ceremony.' },
];

export const JUDGE_TIPS = [
  { title: 'Results beat activity', body: 'A list of everything the team did scores lower than three outcomes with numbers.' },
  { title: 'One clear story', body: 'Judges read dozens of entries in a sitting. Lead with the headline result and make it easy to skim.' },
  { title: 'Context makes numbers count', body: 'Compare against target, last year or the market, so a judge can see why 20% growth is good.' },
  { title: 'Tailor every category', body: 'The same entry pasted into four categories reads like it. Rewrite it for each set of criteria.' },
];
