'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CONSENT_COOKIE, CONSENT_DAYS, CONSENT_GROUPS, makeConsent, parseConsent } from '@/lib/consent';

type Choice = { analytics: boolean; marketing: boolean };

function readCookie(): string | null {
  const hit = document.cookie.split('; ').find(c => c.startsWith(`${CONSENT_COOKIE}=`));
  return hit ? hit.slice(CONSENT_COOKIE.length + 1) : null;
}

/** True once the visitor has said yes to that kind of cookie. Safe to call anywhere in the browser. */
export function hasConsent(kind: 'analytics' | 'marketing'): boolean {
  if (typeof document === 'undefined') return false;
  return !!parseConsent(readCookie())?.[kind];
}

/** The banner, plus the preferences panel that "Cookie settings" in the footer reopens. */
export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState(false);
  const [choice, setChoice] = useState<Choice>({ analytics: false, marketing: false });
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = parseConsent(readCookie());
    if (saved) setChoice({ analytics: saved.analytics, marketing: saved.marketing });
    else setOpen(true);
    const reopen = () => { setManage(true); setOpen(true); };
    window.addEventListener('eg:cookie-settings', reopen);
    return () => window.removeEventListener('eg:cookie-settings', reopen);
  }, []);
  useEffect(() => { if (open && manage) panel.current?.querySelector<HTMLElement>('input, button')?.focus(); }, [open, manage]);

  const save = (c: Choice) => {
    const value = makeConsent(c);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${CONSENT_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
    setChoice(c); setOpen(false); setManage(false);
    window.dispatchEvent(new CustomEvent('eg:consent', { detail: value }));
  };

  if (!open) return null;
  return (
    <div className={`consent${manage ? ' is-manage' : ''}`} role="dialog" aria-modal="false" aria-labelledby="consent-title" ref={panel}>
      <div className="consent-inner">
        <h2 id="consent-title">Cookies on The Events Guy</h2>
        {!manage ? (
          <p>We only use the cookies the site needs to keep you signed in. If we add analytics or marketing cookies, they stay off unless you accept them. <Link href="/cookies">How we use cookies</Link></p>
        ) : (
          <div className="consent-groups">
            {CONSENT_GROUPS.map(g => (
              <label key={g.key} className="consent-group">
                <span className="consent-group-text"><b>{g.title}</b><span>{g.body}</span></span>
                <input type="checkbox" role="switch" disabled={g.locked}
                  checked={g.locked ? true : choice[g.key as keyof Choice]}
                  onChange={e => setChoice(c => ({ ...c, [g.key]: e.target.checked }))}
                  aria-label={`${g.title} cookies${g.locked ? ' (always on)' : ''}`} />
              </label>
            ))}
          </div>
        )}
        <div className="consent-actions">
          <button className="btn btn-primary btn-sm" onClick={() => save({ analytics: true, marketing: true })}>Accept all</button>
          <button className="btn btn-primary btn-sm" onClick={() => save({ analytics: false, marketing: false })}>Reject non-essential</button>
          {manage
            ? <button className="btn btn-secondary btn-sm" onClick={() => save(choice)}>Save my choices</button>
            : <button className="btn btn-secondary btn-sm" onClick={() => setManage(true)}>Manage cookies</button>}
        </div>
      </div>
    </div>
  );
}

/** Footer link that reopens the preferences. */
export function CookieSettingsLink() {
  return <button type="button" className="link-button" onClick={() => window.dispatchEvent(new Event('eg:cookie-settings'))}>Cookie settings</button>;
}
