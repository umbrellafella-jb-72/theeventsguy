import Link from 'next/link';
import { pageUser } from '@/lib/guard';
import { can } from '@/lib/permissions';
import { allSpeakers, allSponsors } from '@/lib/portal';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Find sponsors and speakers — The Events Guy' };

// Organisers (and admins) search published sponsor and speaker profiles, including sponsors' private budget lines.
export default async function Directory({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; sector?: string }> }) {
  const sp = await searchParams;
  const { me } = await pageUser('/portal/directory');
  const type = sp.type === 'speakers' ? 'speakers' : 'sponsors';
  if (!can(me, type === 'speakers' ? 'directory.speakers' : 'directory.sponsors')) redirect('/account?need=directory');
  const q = (sp.q ?? '').toLowerCase().trim();
  const hit = (s: string) => !q || q.split(/\s+/).every(w => s.toLowerCase().includes(w));
  const sponsors = type === 'sponsors' ? (await allSponsors()).filter(p => p.status === 'published' && hit(`${p.company} ${p.about} ${p.interests.join(' ')} ${p.sectors.join(' ')}`) && (!sp.sector || p.sectors.includes(sp.sector))) : [];
  const speakers = type === 'speakers' ? (await allSpeakers()).filter(p => p.status === 'published' && hit(`${p.name} ${p.headline ?? ''} ${p.company ?? ''} ${p.bio} ${p.topics.join(' ')} ${p.openTo.join(' ')}`)) : [];
  return (
    <div className="wrap section portal">
      <p className="crumbs"><Link href="/account">My account</Link> / Directory</p>
      <h1 className="page-title">Find {type}</h1>
      <div className="seg" role="group" aria-label="Directory"><Link className="seg-link" aria-current={type === 'sponsors' ? 'page' : undefined} href="/portal/directory?type=sponsors">Sponsors</Link><Link className="seg-link" aria-current={type === 'speakers' ? 'page' : undefined} href="/portal/directory?type=speakers">Speakers</Link></div>
      <form className="dir-search" method="get"><input type="hidden" name="type" value={type} /><input name="q" type="search" defaultValue={sp.q ?? ''} placeholder={type === 'sponsors' ? 'Company, sector, what they sponsor…' : 'Name, topic, company…'} /><button className="btn btn-secondary btn-sm" type="submit">Search</button></form>
      <div className="dir-grid">
        {type === 'sponsors' && sponsors.map(p => (
          <article key={p.userId} className="dir-card"><h2>{p.company}</h2><p>{p.about}</p>
            {p.interests.length > 0 && <p className="muted"><b>Wants to sponsor:</b> {p.interests.join(', ')}</p>}
            <div className="ev-topics">{p.sectors.map(s => <span key={s} className="is-sector">{s}</span>)}</div>
            <dl className="mini"><dt>Budget</dt><dd>{p.budget ?? 'Not given'}</dd><dt>Contact</dt><dd>{p.contactName ?? '—'}</dd></dl>
            <div className="ev-actions">{p.website && <a className="btn btn-ghost btn-sm" href={p.website} target="_blank" rel="noopener noreferrer">Website</a>}<Link className="btn btn-primary btn-sm" href={`/portal/enquire?type=sponsor&id=${p.userId}`}>Send enquiry</Link></div>
          </article>
        ))}
        {type === 'speakers' && speakers.map(p => (
          <article key={p.userId} className="dir-card"><h2>{p.name}</h2><p className="muted">{[p.headline, p.company].filter(Boolean).join(', ')}</p><p>{p.bio}</p>
            {p.openTo.length > 0 && <p className="muted"><b>Open to:</b> {p.openTo.join(', ')}</p>}
            <div className="ev-topics">{p.topics.map(s => <span key={s}>{s}</span>)}</div>
            <div className="ev-actions">{p.linkedin && <a className="btn btn-ghost btn-sm" href={p.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}<Link className="btn btn-primary btn-sm" href={`/portal/enquire?type=speaker&id=${p.userId}`}>Send enquiry</Link></div>
          </article>
        ))}
        {(type === 'sponsors' ? sponsors : speakers).length === 0 && <p className="muted">No published {type} match yet.</p>}
      </div>
    </div>
  );
}
