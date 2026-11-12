import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { getAccess } from '@/lib/access';
import { sessionUser } from '@/lib/users';
import { can } from '@/lib/permissions';
import { generatedAt } from '@/lib/data';
import { Logo } from '@/components/Art';
import { CHARITY } from '@/lib/charity';
import { CookieConsent, CookieSettingsLink } from '@/components/CookieConsent';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Events Guy — UK & European ecommerce events, month by month',
  description: 'Every UK, Irish and European ecommerce conference, expo, meetup, dinner and awards night in one guide, tagged by format, topic, region and price. Refreshed monthly.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://theeventsguy.co.uk'),
  applicationName: 'The Events Guy',
  appleWebApp: { title: 'Events Guy', capable: true, statusBarStyle: 'black-translucent' },
};

// Harbour in the browser bar and the phone's status bar, to match the icon.
export const viewport: Viewport = { themeColor: '#17262b' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  const user = await sessionUser();
  const updated = new Date(generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Saira+Stencil+One&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="site-head">
          <div className="wrap">
            <Link href="/" className="logo"><Logo /><small>Ecommerce events</small></Link>
            <nav className="nav" aria-label="Main">
              <Link href="/guide">The guide</Link>
              <Link href="/awards">Awards</Link>
              <Link href="/listen">Podcasts</Link>
              <Link href="/speakers">Speakers</Link>
              <Link href="/services">Services</Link>
              <Link href="/sponsors">Sponsors</Link>
              {user || access.paid
                ? <><Link href="/shortlist">My events</Link><Link href="/account">Account</Link>{can(user, 'reporting.view') && <Link href="/admin">Admin</Link>}</>
                : <><Link href="/#pricing">Pricing</Link><Link href="/login">Sign in</Link></>}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <div className="sig"><span>THE EVENTS GUY · THEEVENTSGUY.CO.UK</span></div>
            <p className="foot-charity">{CHARITY.share} of every subscription goes to <a href={CHARITY.url} target="_blank" rel="noopener noreferrer">{CHARITY.name}</a> (registered charity no. {CHARITY.number}). <Link href="/charity-payments">How it’s paid</Link>.</p>
            The Events Guy · theeventsguy.co.uk · Listings last refreshed {updated}. Dates marked tentative are projected from previous editions — always check with the organiser before booking.
            <p className="foot-links"><Link href="/privacy">Privacy</Link> · <Link href="/data-processing">Data processing</Link> · <Link href="/charity-payments">Charity payments</Link> · <Link href="/cookies">Cookies</Link> · <CookieSettingsLink /></p>
          </div>
        </footer>
        <CookieConsent />
        <Analytics />
      </body>
    </html>
  );
}
