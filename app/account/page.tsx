import Link from 'next/link';
import { getAccess, longToken } from '@/lib/access';
import { sessionUser, isMember } from '@/lib/users';
import { storeReady } from '@/lib/store';
import { emailReady } from '@/lib/email';
import { siteUrl } from '@/lib/stripe';
import { ROLES, can, roleLabel } from '@/lib/permissions';
import { getSpeaker, getSponsor, inbox } from '@/lib/portal';
import { deleteSearch, toggleRole } from '../portal/actions';
import { StatusBadge } from '@/components/portal/Bits';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My account — The Events Guy' };

const NEED: Record<string, string> = {
  'opportunity.post': 'Posting sponsorship opportunities needs the Organiser role.',
  enquiry: 'Sending enquiries needs the Organiser or Sponsor role.',
  directory: 'Searching sponsors and speakers needs the Organiser role.',
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string; unsubscribed?: string; role?: string; need?: string; welcome?: string }> }) {
  const sp = await searchParams;
  const a = await getAccess();
  const u = await sessionUser();

  if (!u) {
    // Accounts not switched on yet: members still get billing from here.
    return (
      <div className="wrap section account">
        <h1 className="page-title">My account</h1>
        {sp.unsubscribed && <p className="note banner">You’re unsubscribed from those emails.</p>}
        {a.paid && !a.open && <section className="acc-card"><h2>Membership & billing</h2><p>Your membership is active on this device.</p><form action="/api/portal" method="post"><button className="btn btn-primary btn-sm" type="submit">Manage billing</button></form></section>}
        <div className="lock-panel"><h2>Sign in or create a free account</h2><p>One login for your shortlist, saved searches, your speaker, sponsor or organiser profile, and your membership.</p><Link className="btn btn-primary" href="/login">Sign in</Link></div>
      </div>
    );
  }

  const member = isMember(u) || a.paid;
  const [spk, spn, msgs] = await Promise.all([getSpeaker(u.id), getSponsor(u.id), inbox(u.id)]);
  const unread = msgs.filter(m => m.unreadBy.includes(u.id)).length;
  const feed = member ? `${siteUrl()}/api/calendar/${longToken(u.id, 'feed')}` : null;
  const renews = u.paidUntil ? new Date(u.paidUntil * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div className="wrap section account">
      <div className="acc-head">
        <div><h1 className="page-title">My account</h1><p className="muted">{u.email} · {u.roles.map(roleLabel).join(', ')}{member ? ' · Member' : ''}</p></div>
        <form action="/api/logout" method="post"><button className="btn btn-ghost btn-sm" type="submit">Sign out</button></form>
      </div>
      {sp.saved && <p className="note banner">Settings saved.</p>}
      {sp.unsubscribed && <p className="note banner">You’re unsubscribed from those emails.</p>}
      {sp.need && <p className="note banner">{NEED[sp.need] ?? 'That needs another role — switch it on below.'}</p>}
      {sp.role && <p className="note banner">{u.roles.includes(sp.role as never) ? `${roleLabel(sp.role as never)} role switched on.` : `${roleLabel(sp.role as never)} role switched off.`}</p>}

      <section className="acc-card" id="roles">
        <h2>My roles</h2>
        <p className="muted">One login, as many roles as you need — an organiser who also speaks, say. Profiles are free; you don’t need a membership.</p>
        <div className="role-list">
          {ROLES.filter(r => r.key !== 'visitor').map(r => {
            const on = u.roles.includes(r.key as never);
            return (
              <div key={r.key} className={`role${on ? ' is-on' : ''}`}>
                <div><b>{r.label}</b><p>{r.can}</p></div>
                {r.selfServe
                  ? <form action={toggleRole}><input type="hidden" name="role" value={r.key} /><button className={`btn btn-sm ${on ? 'btn-secondary' : 'btn-primary'}`} type="submit">{on ? 'Switch off' : 'Switch on'}</button></form>
                  : <span className="badge">{on ? 'Yours' : r.key === 'admin' ? 'By invitation' : ''}</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="acc-card">
        <h2>My tools</h2>
        <div className="tool-grid">
          <Link className="tool" href="/shortlist"><b>My events</b><span>{u.saved.length} saved</span></Link>
          <Link className="tool" href="/portal/inbox"><b>Messages</b><span>{unread ? `${unread} unread` : `${msgs.length} conversation${msgs.length === 1 ? '' : 's'}`}</span></Link>
          {can(u, 'speakerProfile.publish') && <Link className="tool" href="/portal/speaker"><b>Speaker profile</b><span>{spk ? <StatusBadge status={spk.status} /> : 'Not started'}</span></Link>}
          {can(u, 'sponsorProfile.publish') && <Link className="tool" href="/portal/sponsor"><b>Sponsor profile</b><span>{spn ? <StatusBadge status={spn.status} /> : 'Not started'}</span></Link>}
          {can(u, 'opportunity.post') && <Link className="tool" href="/portal/opportunities"><b>My sponsorship opportunities</b><span>Post and manage</span></Link>}
          {can(u, 'opportunity.search') && <Link className="tool" href="/opportunities"><b>Find opportunities</b><span>With budgets and contacts</span></Link>}
          {can(u, 'directory.sponsors') && <Link className="tool" href="/portal/directory?type=sponsors"><b>Find sponsors</b><span>Search and enquire</span></Link>}
          {can(u, 'directory.speakers') && <Link className="tool" href="/portal/directory?type=speakers"><b>Find speakers</b><span>Search and enquire</span></Link>}
          {can(u, 'reporting.view') && <Link className="tool is-admin" href="/admin"><b>Admin</b><span>Approvals, users, reports</span></Link>}
        </div>
      </section>

      <section className="acc-card" id="searches">
        <h2>Saved searches</h2>
        {u.searches.length === 0 ? <p className="muted">Set filters in <Link href="/guide">the guide</Link> and choose “Save this search”.</p> : (
          <ul className="saved-searches">{u.searches.map(s => (
            <li key={s.id}><Link href={`/guide?${s.query}`}>{s.name}</Link>
              <form action={deleteSearch}><input type="hidden" name="id" value={s.id} /><button className="btn btn-ghost btn-sm" type="submit">Delete</button></form></li>
          ))}</ul>
        )}
      </section>

      <section className="acc-card">
        <h2>Membership & billing</h2>
        {member ? (
          <>
            <p>{a.open ? 'This site is in open mode: everything is unlocked.' : <>Your membership is active{renews ? <> and paid up to <b>{renews}</b></> : ''}. Change your card, download invoices or cancel in Stripe’s secure billing page.</>}</p>
            {!a.open && <form action="/api/portal" method="post"><button className="btn btn-primary btn-sm" type="submit">Manage billing</button></form>}
            {feed && <>
              <h3>Calendar feed</h3>
              <p>Subscribe once and every event you save appears in your calendar, and updates when dates are confirmed. Keep this link private.</p>
              <input className="feed-url" readOnly value={feed} aria-label="Your private calendar feed address" />
              <div className="ev-actions">
                <a className="btn btn-secondary btn-sm" href={feed.replace(/^https?:/, 'webcal:')}>Apple Calendar / Outlook</a>
                <a className="btn btn-secondary btn-sm" href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed.replace(/^https?:/, 'webcal:'))}`} target="_blank" rel="noopener noreferrer">Google Calendar</a>
              </div>
            </>}
          </>
        ) : (
          <>
            <p>Your free account covers your shortlist, saved searches and profiles. Membership opens every event in full — venue, price, booking link and speakers — with calendar sync, reminders and new-event emails.</p>
            {a.paymentsReady ? <form action="/api/checkout" method="post"><button className="btn btn-primary btn-sm" type="submit">Become a member — {process.env.NEXT_PUBLIC_PRICE_LABEL || 'monthly'}</button></form> : <Link className="btn btn-primary btn-sm" href="/#pricing">See membership</Link>}
          </>
        )}
      </section>

      <section className="acc-card">
        <h2>Name and emails</h2>
        <form action="/api/account/prefs" method="post" className="prefs">
          <label>Your name<input name="name" defaultValue={u.name ?? ''} maxLength={80} /></label>
          <label className="toggle"><input type="checkbox" name="newEvents" defaultChecked={u.prefs.newEvents} /> New events: one email when the monthly refresh adds events {member ? '' : '(members)'}</label>
          <label className="toggle"><input type="checkbox" name="reminders" defaultChecked={u.prefs.reminders} /> Reminders a week before and the day before each saved event {member ? '' : '(members)'}</label>
          <p className="muted">Messages from organisers, sponsors and speakers are always emailed to you.{!emailReady() && ' (Email sending isn’t switched on for this site yet.)'}</p>
          <button className="btn btn-primary btn-sm" type="submit">Save</button>
        </form>
      </section>
    </div>
  );
}
