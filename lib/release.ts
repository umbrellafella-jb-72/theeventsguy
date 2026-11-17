// Rolling release window, shared by server and browser code (no event data in here).
export const RELEASE_DAYS = 30;
/** Events appear (name, date, city, organiser) this many days ahead; full details at RELEASE_DAYS. */
export const LISTING_DAYS = 60;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "Fri 4 Dec" for a release date. Built by hand so server and browser render identical text. */
export const releaseLabel = (ymd: string) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  const y = d.getUTCFullYear() !== new Date().getUTCFullYear() ? ` ${d.getUTCFullYear()}` : '';
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${y}`;
};

// ---------- Quarterly membership ----------
// A quarterly member sees, in full, every event in the calendar quarter their current billing
// period started in (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec) and nothing beyond it. Yearly members
// keep the rolling 30-day release above.
/** "2026-Q4" for a unix time (UK calendar). */
export const quarterOf = (unix: number) => {
  const d = new Date(unix * 1000);
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: 'numeric' }).formatToParts(d);
  const y = p.find(x => x.type === 'year')!.value, m = Number(p.find(x => x.type === 'month')!.value);
  return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
};
const QRE = /^(\d{4})-Q([1-4])$/;
export const isQuarter = (q: unknown): q is string => typeof q === 'string' && QRE.test(q);
/** First and last day of a quarter, as YYYY-MM-DD. */
export const quarterRange = (q: string) => {
  const [, y, n] = q.match(QRE)!; const first = (Number(n) - 1) * 3 + 1, last = first + 2;
  const end = new Date(Date.UTC(Number(y), last, 0)).getUTCDate();
  return { from: `${y}-${String(first).padStart(2, '0')}-01`, to: `${y}-${String(last).padStart(2, '0')}-${end}` };
};
/** "Oct – Dec 2026". */
export const quarterLabel = (q: string) => {
  const [, y, n] = q.match(QRE)!; const i = (Number(n) - 1) * 3;
  return `${MONTHS[i]} – ${MONTHS[i + 2]} ${y}`;
};
