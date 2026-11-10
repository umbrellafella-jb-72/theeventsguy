import { PageHero } from '@/components/PageHero';
import { CookieSettingsLink } from '@/components/CookieConsent';
import { COOKIE_LIST } from '@/lib/consent';

export const metadata = { title: 'Cookies — The Events Guy' };

export default function Cookies() {
  return (
    <>
      <PageHero eyebrow="Cookies" scene="containers" title="How we use cookies"
        intro="Cookies are small files a website stores in your browser. We keep them to the few the site needs, and ask before setting anything else." />
      <div className="wrap section prose">
        <h2>The cookies we set</h2>
        <div className="tier-wrap">
          <table className="tiers cookie-table">
            <thead><tr><th scope="col">Cookie</th><th scope="col">Type</th><th scope="col">What it does</th><th scope="col">How long</th><th scope="col">Set by</th></tr></thead>
            <tbody>{COOKIE_LIST.map(c => (
              <tr key={c.name}><th scope="row"><code>{c.name}</code></th><td>{c.group}</td><td>{c.purpose}</td><td>{c.lasts}</td><td>{c.by}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <h2>Strictly necessary cookies</h2>
        <p>These keep your subscription working, so they don’t need your consent. We don’t use them to track you or for advertising.</p>
        <h2>Analytics and marketing</h2>
        <p>We don’t use any analytics or marketing cookies yet. If we add them, they will stay off until you accept them, and this page will list each one.</p>
        <h2>Changing your mind</h2>
        <p>You can change your choices at any time: <CookieSettingsLink />. You can also clear cookies in your browser settings.</p>
      </div>
    </>
  );
}
