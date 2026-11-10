import Link from 'next/link';
import { pageUser } from '@/lib/guard';
import { getEnquiry, inbox, markRead, namesFor } from '@/lib/portal';
import { replyToEnquiry } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Messages — The Events Guy' };
const when = (s: string) => new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' });

export default async function Inbox({ searchParams }: { searchParams: Promise<{ e?: string; sent?: string }> }) {
  const sp = await searchParams;
  const { me } = await pageUser('/portal/inbox');
  const all = await inbox(me.id);
  let open = sp.e ? await getEnquiry(sp.e) : null;
  if (open && ![open.from, open.to].includes(me.id)) open = null;
  if (open) open = await markRead(open, me.id);
  const names = await namesFor(all.flatMap(e => [e.from, e.to]));
  return (
    <div className="wrap section portal">
      <p className="crumbs"><Link href="/account">My account</Link> / Messages</p>
      <h1 className="page-title">Messages</h1>
      <p className="muted">Enquiries between organisers, sponsors and speakers. Your email address is never shown; we email you when there’s a new message.</p>
      <div className="inbox">
        <ul className="inbox-list">
          {all.length === 0 && <li className="muted">No messages yet.</li>}
          {all.map(e => {
            const other = e.from === me.id ? e.to : e.from;
            return (
              <li key={e.id} className={`${e.unreadBy.includes(me.id) ? 'is-unread ' : ''}${open?.id === e.id ? 'is-open' : ''}`}>
                <Link href={`/portal/inbox?e=${e.id}`}><b>{names[other]}</b><span>{e.subject}</span><small>{e.from === me.id ? 'Sent' : 'Received'} · {when(e.updatedAt)}</small></Link>
              </li>
            );
          })}
        </ul>
        <div className="thread">
          {open ? (
            <>
              {sp.sent && <p className="note banner">Sent. We’ve let them know by email.</p>}
              <h2>{open.subject}</h2>
              <p className="muted">About: {open.about.type === 'opportunity' ? <Link href={`/opportunities/${open.about.id}`}>{open.about.label}</Link> : open.about.label}</p>
              {open.messages.map((m, i) => (
                <div key={i} className={`msg${m.from === me.id ? ' is-mine' : ''}`}><div className="msg-head"><b>{m.from === me.id ? 'You' : names[m.from]}</b><small>{when(m.at)}</small></div><p>{m.body}</p></div>
              ))}
              <form action={replyToEnquiry} className="pform">
                <input type="hidden" name="id" value={open.id} />
                <label>Reply<textarea name="message" rows={4} required maxLength={3000} /></label>
                <button className="btn btn-primary btn-sm" type="submit">Send reply</button>
              </form>
            </>
          ) : <p className="muted">Choose a message.</p>}
        </div>
      </div>
    </div>
  );
}
