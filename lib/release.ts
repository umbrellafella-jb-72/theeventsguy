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
