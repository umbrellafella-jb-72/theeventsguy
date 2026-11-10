// Cookie consent, shared by the app and the preview.
// Strictly necessary cookies (sign-in, renewal check, this choice) never need consent.
// Anything else (analytics, marketing pixels) must wait until hasConsent('analytics' | 'marketing')
// is true. Listen for the 'eg:consent' window event to start it the moment someone accepts.

export const CONSENT_COOKIE = 'eg_consent';
export const CONSENT_VERSION = 1; // bump when you add a new kind of cookie, so everyone is asked again
export const CONSENT_DAYS = 180;

export const CONSENT_GROUPS = [
  { key: 'necessary', title: 'Strictly necessary', locked: true, body: 'Keep you signed in to your subscription, check renewals and remember this choice. The site can’t work without them, so they’re always on.' },
  { key: 'analytics', title: 'Analytics', locked: false, body: 'Count visits and see which pages and events people use, so we can improve the guide. Not used yet — off until you say yes.' },
  { key: 'marketing', title: 'Marketing', locked: false, body: 'Measure whether our ads and sponsor campaigns work. Not used yet — off until you say yes.' },
];

/** Every cookie the site sets, for the Cookies page. Update it whenever you add one. */
export const COOKIE_LIST = [
  { name: 'eg_access', group: 'Strictly necessary', purpose: 'Keeps a subscriber signed in on this device. Signed, so it can’t be faked.', lasts: 'Until the end of your paid period, plus 3 days', by: 'The Events Guy' },
  { name: 'eg_renew_checked', group: 'Strictly necessary', purpose: 'Stops us asking Stripe about your renewal more than once an hour.', lasts: '1 hour', by: 'The Events Guy' },
  { name: 'eg_consent', group: 'Strictly necessary', purpose: 'Remembers your cookie choices.', lasts: '6 months', by: 'The Events Guy' },
  { name: 'Stripe cookies', group: 'Strictly necessary', purpose: 'Set by Stripe on its own checkout and billing pages, to take payment safely and prevent fraud.', lasts: 'Set by Stripe', by: 'Stripe (stripe.com)' },
];

/** @returns {{ v: number, at: string, analytics: boolean, marketing: boolean } | null} */
export function parseConsent(raw) {
  if (!raw) return null;
  try {
    const c = JSON.parse(decodeURIComponent(raw));
    return c && c.v === CONSENT_VERSION ? c : null;
  } catch { return null; }
}

export function makeConsent(choice) {
  return { v: CONSENT_VERSION, at: new Date().toISOString(), analytics: !!choice.analytics, marketing: !!choice.marketing };
}
