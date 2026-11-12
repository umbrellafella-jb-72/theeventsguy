import Link from 'next/link';
export const metadata = { title: 'Unsubscribed — The Events Guy', robots: { index: false } };
export default async function Unsubscribed({ searchParams }: { searchParams: Promise<{ invalid?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="wrap section">
      <div className="lock-panel">
        <h1>{sp.invalid ? 'That link didn’t work' : 'You’re unsubscribed'}</h1>
        <p>{sp.invalid ? 'The unsubscribe link may be incomplete. Sign in and switch the roundup off in your account settings instead.' : 'You won’t get the monthly roundup any more. Emails you need for your account — sign-in links, receipts and reminders you’ve set — still arrive.'}</p>
        <div className="lock-actions"><Link className="btn btn-secondary" href="/account">Email settings</Link><Link className="btn btn-ghost" href="/">Home</Link></div>
      </div>
    </div>
  );
}
