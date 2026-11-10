import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOpp, oppFor } from '@/lib/portal';
import { sessionUser } from '@/lib/users';
import { can } from '@/lib/permissions';
import { storeReady } from '@/lib/store';
import { ReportButton } from '@/components/portal/Bits';

export const dynamic = 'force-dynamic';

export default async function Opportunity({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reported?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  if (!storeReady()) notFound();
  const raw = await getOpp(id);
  const viewer = await sessionUser();
  // Pending or hidden opportunities are only visible to their owner and admins.
  if (!raw || (raw.status !== 'published' && raw.ownerId !== viewer?.id && !can(viewer, 'content.moderate'))) notFound();
  const o = oppFor(raw, viewer);
  const mine = viewer?.id === o.ownerId;
  return (
    <div className="wrap section portal">
      <p className="crumbs"><Link href="/opportunities">Sponsorship opportunities</Link></p>
      {sp.reported && <p className="note banner">Thanks — an admin will take a look.</p>}
      {raw.status !== 'published' && <p className="note">Only you{can(viewer, 'content.moderate') ? ' and other admins' : ' and the admins'} can see this: it’s {raw.status === 'pending' ? 'waiting for approval' : 'hidden'}.</p>}
      <h1 className="page-title">{o.title}</h1>
      <p className="lede">{[o.eventName, o.when, o.city].filter(Boolean).join(' · ')}{o.eventId && <> · <Link href={`/events/${o.eventId}`}>Event details</Link></>}</p>
      <p className="ev-page-desc">{o.summary}</p>
      <dl className="ev-facts">
        {o.audience && <><dt>Audience</dt><dd>{o.audience}</dd></>}
        {o.sectors.length > 0 && <><dt>Sectors</dt><dd>{o.sectors.join(', ')}</dd></>}
        {o.deadline && <><dt>Reply by</dt><dd>{o.deadline}</dd></>}
        {!o.locked && <><dt>Packages</dt><dd style={{ whiteSpace: 'pre-line' }}>{o.packages ?? 'Ask the organiser'}</dd><dt>Budget</dt><dd>{o.budget ?? 'Ask the organiser'}</dd><dt>Contact</dt><dd>{o.contact ?? 'Send an enquiry below'}</dd></>}
      </dl>
      {o.locked ? (
        <div className="lock-panel ev-page-lock"><h2>Budgets and contact routes are for sponsors</h2><p>Create a free account and switch on the Sponsor role to see packages, prices and how to get in touch, and to send the organiser an enquiry.</p>
          <Link className="btn btn-primary" href={viewer ? '/account#roles' : `/login?next=/opportunities/${o.id}`}>{viewer ? 'Switch on the Sponsor role' : 'Sign in or create a free account'}</Link></div>
      ) : mine ? <p><Link className="btn btn-secondary" href={`/portal/opportunities?edit=${o.id}`}>Edit</Link></p>
        : <p><Link className="btn btn-primary" href={`/portal/enquire?type=opportunity&id=${o.id}`}>Send the organiser an enquiry</Link></p>}
      <ReportButton type="opportunity" id={o.id} label={o.title} back={`/opportunities/${o.id}`} />
    </div>
  );
}
