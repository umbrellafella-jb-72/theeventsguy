import type { Metadata } from 'next';
import Link from 'next/link';
import { getAccess } from '@/lib/access';
import { generatedAt } from '@/lib/data';
import { Logo, Ogham } from '@/components/Art';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Events Guy — UK & European ecommerce events, month by month',
  description: 'Every UK, Irish and European ecommerce conference, expo, meetup, dinner and awards night in one guide, tagged by format, topic, region and price. Refreshed monthly.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://theeventsguy.co.uk'),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
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
              <Link href="/listen">Podcasts</Link>
              <Link href="/speakers">Speakers</Link>
              <Link href="/services">Services</Link>
              <Link href="/sponsors">Sponsors</Link>
              {access.paid && !access.open
                ? <form action="/api/portal" method="post"><button className="btn btn-ghost btn-sm" type="submit">My subscription</button></form>
                : !access.open && <><Link href="/#pricing">Pricing</Link><Link href="/restore">Sign in</Link></>}
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          <div className="wrap">
            <div className="sig"><Ogham text="THE EVENTS GUY" height={16} /><span>THE EVENTS GUY · THEEVENTSGUY.CO.UK</span></div>
            The Events Guy · theeventsguy.co.uk · Listings last refreshed {updated}. Dates marked tentative are projected from previous editions — always check with the organiser before booking.
          </div>
        </footer>
      </body>
    </html>
  );
}
