import { longToken } from './access';
import { siteUrl } from './stripe';

/** Vercel Cron sends "Authorization: Bearer $CRON_SECRET". Anything else is refused. */
export function cronAllowed(req: Request) {
  const s = process.env.CRON_SECRET;
  return Boolean(s) && req.headers.get('authorization') === `Bearer ${s}`;
}

export function memberLinks(userId: string) {
  const base = siteUrl();
  const t = encodeURIComponent(longToken(userId, 'prefs'));
  return { manage: `${base}/account`, off: (what: 'newEvents' | 'reminders' | 'all') => `${base}/api/email-prefs?token=${t}&off=${what}` };
}
