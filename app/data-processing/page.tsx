import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Fill } from '@/components/Fill';
import { OPERATOR } from '@/lib/legal';

export const metadata = { title: 'Data processing — The Events Guy' };

const PROCESSORS = [
  { name: 'Vercel Inc.', what: 'Hosts the website and runs it.', data: 'IP addresses and request logs; all data passing through the site.', where: 'USA / EU', link: 'https://vercel.com/legal/dpa' },
  { name: 'Upstash Inc.', what: 'Stores accounts, saved events, profiles, enquiries and reports.', data: 'Email, name, saved items, profiles, messages.', where: 'EU (Ireland) or as configured', link: 'https://upstash.com/trust/dpa.pdf' },
  { name: 'Stripe Payments Europe Ltd.', what: 'Takes subscription payments and runs the billing page.', data: 'Email, payment details, billing address, payment history.', where: 'EU / USA', link: 'https://stripe.com/legal/dpa' },
  { name: 'Resend Inc.', what: 'Sends sign-in links, reminders, digests and enquiry notifications.', data: 'Email address and the content of those emails.', where: 'USA', link: 'https://resend.com/legal/dpa' },
  { name: 'GitHub Inc.', what: 'Stores the site’s code and runs the monthly listings refresh.', data: 'Event listings only — no personal data about users.', where: 'USA', link: 'https://github.com/customer-terms' },
  { name: 'Google LLC', what: 'Hosts the events spreadsheet the guide is built from, and serves the site’s fonts.', data: 'Event listings; IP address when fonts load.', where: 'USA / EU', link: 'https://cloud.google.com/terms/data-processing-addendum' },
];

export default function DataProcessing() {
  return (
    <>
      <PageHero eyebrow="Data processing" scene="crane" title="Who handles your data"
        intro="The services that run The Events Guy for us, what each one does and what data it sees. Read this alongside our privacy policy." />
      <div className="wrap section prose">
        <p className="muted">Last updated {OPERATOR.updated}. Data controller: <Fill v={OPERATOR.name} />.</p>

        <h2>Our processors</h2>
        <p>Each provider acts on our instructions under a data processing agreement, and only sees what it needs to do its job.</p>
        <div className="tier-wrap">
          <table className="tiers cookie-table">
            <thead><tr><th scope="col">Provider</th><th scope="col">What it does</th><th scope="col">Data it handles</th><th scope="col">Where</th></tr></thead>
            <tbody>{PROCESSORS.map(p => (
              <tr key={p.name}><th scope="row"><a href={p.link} target="_blank" rel="noopener noreferrer">{p.name}</a></th><td>{p.what}</td><td>{p.data}</td><td>{p.where}</td></tr>
            ))}</tbody>
          </table>
        </div>

        <h2>How we protect it</h2>
        <ul>
          <li>Everything is sent over HTTPS, and our providers encrypt data at rest.</li>
          <li>Sign-in is by single-use emailed link, so there are no passwords to leak. Sign-in cookies are signed so they can’t be forged.</li>
          <li>Event details for members are only sent to members, and only as each event comes within 30 days.</li>
          <li>Enquiries go through the site, so your email address isn’t shared with the person you’re talking to.</li>
          <li>Only admins can see account lists, and every published profile is reviewed first.</li>
        </ul>

        <h2>International transfers</h2>
        <p>Where a provider handles data outside the UK, the transfer is covered by UK adequacy regulations or the UK International Data Transfer Addendum, as set out in that provider’s data processing agreement.</p>

        <h2>For organisers and sponsors</h2>
        <p>If you’re an organisation using the portal and need a data processing agreement with us, email <Fill v={OPERATOR.email} />.</p>

        <p>More about your rights: <Link href="/privacy">privacy policy</Link> · <Link href="/cookies">cookies</Link>.</p>
      </div>
    </>
  );
}
