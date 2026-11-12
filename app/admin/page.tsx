import Link from 'next/link';
import { redirect } from 'next/navigation';
import { pageUser } from '@/lib/guard';
import { can, roleLabel, type Role } from '@/lib/permissions';
import { allUsers, isMember } from '@/lib/users';
import { allEnquiries, allOpps, allReports, allSpeakers, allSponsors, type Status } from '@/lib/portal';
import { events } from '@/lib/data';
import { closeReport, manageUser, moderate, saveLead } from '../portal/actions';
import { allLeads, FORM_LABELS, LEAD_STATUSES, type LeadForm } from '@/lib/leads';
import { members } from '@/lib/store';
import { StatusBadge } from '@/components/portal/Bits';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin — The Events Guy', robots: { index: false } };

const TABS = [['leads', 'Leads'], ['queue', 'Approvals'], ['content', 'All content'], ['users', 'Users'], ['reports', 'Reports'], ['reporting', 'Reporting']] as const;
type Item = { type: 'speaker' | 'sponsor' | 'opportunity'; id: string; title: string; sub: string; status: Status; updatedAt: string; edit: string; view: string | null };

function Actions({ it, tab }: { it: Item; tab: string }) {
  const btn = (action: string, label: string, cls = 'btn-secondary') => (
    <form action={moderate}><input type="hidden" name="type" value={it.type} /><input type="hidden" name="id" value={it.id} /><input type="hidden" name="action" value={action} /><input type="hidden" name="tab" value={tab} />
      <button className={`btn btn-sm ${cls}`} type="submit">{label}</button></form>
  );
  return (
    <div className="prow-actions">
      {it.status !== 'published' && btn('approve', 'Approve', 'btn-primary')}
      <Link className="btn btn-secondary btn-sm" href={it.edit}>Edit</Link>
      {it.status !== 'hidden' && btn('hide', 'Hide')}
      <details className="confirm"><summary className="btn btn-ghost btn-sm">Remove</summary>{btn('remove', 'Remove for good', 'btn-ghost danger')}</details>
    </div>
  );
}

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; done?: string; status?: string; form?: string; lead?: string }> }) {
  const sp = await searchParams;
  const { me } = await pageUser('/admin');
  if (!can(me, 'reporting.view')) redirect('/account');
  const tab = TABS.some(t => t[0] === sp.tab) ? sp.tab! : 'leads';
  const [speakers, sponsors, opps, users, reports, enquiries, leads, subscriberIds] = await Promise.all([allSpeakers(), allSponsors(), allOpps(), allUsers(), allReports(), allEnquiries(), allLeads(), members('subscribers')]);
  const newLeads = leads.filter(l => l.status === 'new');
  const leadForm = (Object.keys(FORM_LABELS) as LeadForm[]).includes(sp.form as LeadForm) ? sp.form as LeadForm : null;
  const leadStatus = LEAD_STATUSES.some(s => s.key === sp.status) ? sp.status! : null;
  const shownLeads = leads.filter(l => (!leadForm || l.form === leadForm) && (!leadStatus || l.status === leadStatus));
  const leadFilters = new URLSearchParams({ ...(leadForm ? { form: leadForm } : {}), ...(leadStatus ? { status: leadStatus } : {}) }).toString();
  const emailOf = new Map(users.map(u => [u.id, u.email]));
  const items: Item[] = [
    ...speakers.map(p => ({ type: 'speaker' as const, id: p.userId, title: p.name, sub: `Speaker · ${emailOf.get(p.userId) ?? ''}`, status: p.status, updatedAt: p.updatedAt, edit: `/portal/speaker?as=${p.userId}`, view: p.status === 'published' ? `/speakers#sp-${p.userId}` : null })),
    ...sponsors.map(p => ({ type: 'sponsor' as const, id: p.userId, title: p.company, sub: `Sponsor · ${emailOf.get(p.userId) ?? ''}`, status: p.status, updatedAt: p.updatedAt, edit: `/portal/sponsor?as=${p.userId}`, view: null })),
    ...opps.map(o => ({ type: 'opportunity' as const, id: o.id, title: o.title, sub: `Opportunity · ${o.eventName ?? 'no event'} · ${emailOf.get(o.ownerId) ?? ''}`, status: o.status, updatedAt: o.updatedAt, edit: `/portal/opportunities?edit=${o.id}`, view: `/opportunities/${o.id}` })),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const pending = items.filter(i => i.status === 'pending');
  const openReports = reports.filter(r => r.status === 'open');
  const since = new Date(Date.now() - 30 * 86400e3).toISOString();

  return (
    <div className="wrap section portal admin">
      <h1 className="page-title">Admin</h1>
      <nav className="admin-tabs" aria-label="Admin">{TABS.map(([k, l]) => (
        <Link key={k} href={`/admin?tab=${k}`} aria-current={tab === k ? 'page' : undefined}>{l}{k === 'leads' && newLeads.length ? <span className="n">{newLeads.length}</span> : null}{k === 'queue' && pending.length ? <span className="n">{pending.length}</span> : null}{k === 'reports' && openReports.length ? <span className="n">{openReports.length}</span> : null}</Link>
      ))}</nav>
      {sp.done && <p className="note banner">Done: {sp.done}.</p>}

      {tab === 'queue' && (pending.length === 0 ? <p className="muted">Nothing waiting for approval.</p> : (
        <div className="plist">{pending.map(it => (
          <div key={it.type + it.id} className="prow"><div><b>{it.title}</b><span className="muted"> · {it.sub}</span></div><Actions it={it} tab="queue" /></div>
        ))}</div>
      ))}

      {tab === 'content' && (
        <>
          <p className="admin-filter">{(['all', 'pending', 'published', 'hidden'] as const).map(s => <Link key={s} href={`/admin?tab=content&status=${s}`} aria-current={(sp.status ?? 'all') === s ? 'page' : undefined}>{s}</Link>)}</p>
          <div className="plist">{items.filter(i => !sp.status || sp.status === 'all' || i.status === sp.status).map(it => (
            <div key={it.type + it.id} className="prow"><div><b>{it.view ? <Link href={it.view}>{it.title}</Link> : it.title}</b><span className="muted"> · {it.sub}</span> <StatusBadge status={it.status} /></div><Actions it={it} tab="content" /></div>
          ))}</div>
          {items.length === 0 && <p className="muted">No profiles or opportunities yet.</p>}
        </>
      )}

      {tab === 'users' && (
        <>
          <form className="dir-search" method="get"><input type="hidden" name="tab" value="users" /><input name="q" type="search" placeholder="Email or name" defaultValue={sp.q ?? ''} /><button className="btn btn-secondary btn-sm" type="submit">Search</button></form>
          <div className="plist">{users.filter(u => !sp.q || `${u.email} ${u.name ?? ''}`.toLowerCase().includes(sp.q.toLowerCase())).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100).map(u => (
            <div key={u.id} className="prow user-row">
              <div><b>{u.email}</b><span className="muted"> · {u.name ?? 'no name'} · joined {u.createdAt.slice(0, 10)}{isMember(u) ? ' · member' : ''}</span>{u.status === 'suspended' && <span className="badge badge-rowan">Suspended</span>}</div>
              <form action={manageUser} className="role-form">
                <input type="hidden" name="id" value={u.id} /><input type="hidden" name="action" value="roles" /><input type="hidden" name="q" value={sp.q ?? ''} />
                {(['organiser', 'sponsor', 'speaker', 'admin'] as Role[]).map(r => <label key={r} className="check"><input type="checkbox" name={`role_${r}`} defaultChecked={u.roles.includes(r)} disabled={r === 'admin' && u.id === me.id} /> {roleLabel(r)}</label>)}
                <button className="btn btn-secondary btn-sm" type="submit">Save roles</button>
              </form>
              {u.id !== me.id && <form action={manageUser}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="q" value={sp.q ?? ''} /><input type="hidden" name="action" value={u.status === 'suspended' ? 'restore' : 'suspend'} /><button className="btn btn-ghost btn-sm" type="submit">{u.status === 'suspended' ? 'Restore' : 'Suspend'}</button></form>}
            </div>
          ))}</div>
        </>
      )}

      {tab === 'reports' && (openReports.length === 0 ? <p className="muted">No open reports.</p> : (
        <div className="plist">{openReports.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => {
          const it = items.find(i => i.type === r.target.type && i.id === r.target.id);
          return (
            <div key={r.id} className="prow">
              <div><b>{r.target.label}</b><span className="muted"> · {r.target.type} · {r.createdAt.slice(0, 10)} · by {r.by ? emailOf.get(r.by) ?? 'a user' : 'a visitor'}</span><p>“{r.reason}”</p></div>
              <div className="prow-actions">{it ? <Actions it={it} tab="reports" /> : <span className="muted">Already removed</span>}
                <form action={closeReport}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost btn-sm" type="submit">Mark resolved</button></form></div>
            </div>
          );
        })}</div>
      ))}

      {tab === 'leads' && (
        <div className="leads">
          <div className="leads-bar">
            <p className="admin-filter">{[['', 'All forms'], ...Object.entries(FORM_LABELS)].map(([k, l]) => <Link key={k} href={`/admin?tab=leads&${new URLSearchParams({ ...(k ? { form: k } : {}), ...(leadStatus ? { status: leadStatus } : {}) })}`} aria-current={(leadForm ?? '') === k ? 'page' : undefined}>{l}</Link>)}</p>
            <p className="admin-filter">{[{ key: '', label: 'Any status' }, ...LEAD_STATUSES].map(s => <Link key={s.key} href={`/admin?tab=leads&${new URLSearchParams({ ...(leadForm ? { form: leadForm } : {}), ...(s.key ? { status: s.key } : {}) })}`} aria-current={(leadStatus ?? '') === s.key ? 'page' : undefined}>{s.label} <span className="muted">{leads.filter(l => (!leadForm || l.form === leadForm) && (!s.key || l.status === s.key)).length}</span></Link>)}</p>
            <div className="leads-export">
              <a className="btn btn-secondary btn-sm" href={`/api/admin/export?what=leads&${leadFilters}`}>Export these leads (CSV)</a>
              <a className="btn btn-ghost btn-sm" href="/api/admin/export?what=subscribers">Export roundup subscribers (CSV)</a>
            </div>
          </div>
          {shownLeads.length === 0 ? <p className="muted">No leads here yet. Every Services, Sponsors and Awards finder enquiry lands in this list.</p> : shownLeads.map(l => (
            <details key={l.id} id={l.id} className={`lead lead-${l.status}`} open={sp.lead === l.id}>
              <summary>
                <span className={`badge ${l.status === 'new' ? 'badge-heather' : l.status === 'won' ? 'badge-glen' : l.status === 'lost' ? 'badge-rowan' : 'badge-torc'}`}>{LEAD_STATUSES.find(s => s.key === l.status)?.label}</span>
                <b>{l.name}</b><span className="muted">{l.company ? ` · ${l.company}` : ''} · {FORM_LABELS[l.form]}{l.interest ? ` · ${l.interest}` : ''}</span>
                <span className="muted lead-when">{new Date(l.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </summary>
              <div className="lead-body">
                <p><a href={`mailto:${l.email}?subject=${encodeURIComponent(`Re: your ${FORM_LABELS[l.form]} enquiry`)}`}>{l.email}</a>{l.marketing ? <span className="badge badge-glen" style={{ marginLeft: 8 }}>Roundup opt-in</span> : null}{!l.emailed ? <span className="muted"> · alert email didn’t send</span> : null}</p>
                {l.message && <p className="lead-msg">{l.message}</p>}
                {Object.entries(l.details).map(([k, v]) => <p key={k} className="lead-msg"><b>{k === 'quiz' ? 'Quiz answers' : k === 'shortlist' ? 'Their shortlist' : k}:</b>{'\n'}{v}</p>)}
                {l.page && <p className="muted">Sent from <a href={l.page}>{l.page}</a></p>}
                <form action={saveLead} className="lead-form">
                  <input type="hidden" name="id" value={l.id} /><input type="hidden" name="filters" value={leadFilters} />
                  <label>Status<select name="status" defaultValue={l.status}>{LEAD_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
                  <label>Notes<textarea name="notes" rows={3} defaultValue={l.notes} placeholder="Calls, quotes, next steps…" /></label>
                  <button className="btn btn-primary btn-sm" type="submit">Save</button>
                </form>
              </div>
            </details>
          ))}
          <p className="muted" style={{ marginTop: 16 }}>{subscriberIds.length} {subscriberIds.length === 1 ? 'person has' : 'people have'} a roundup record; the export lists those currently opted in.</p>
        </div>
      )}

      {tab === 'reporting' && (
        <div className="stats-grid">
          {[
            ['Accounts', users.length], ['New in 30 days', users.filter(u => u.createdAt > since).length], ['Members', users.filter(isMember).length],
            ['Organisers', users.filter(u => u.roles.includes('organiser')).length], ['Sponsors', users.filter(u => u.roles.includes('sponsor')).length], ['Speakers', users.filter(u => u.roles.includes('speaker')).length],
            ['Speaker profiles live', speakers.filter(p => p.status === 'published').length], ['Sponsor profiles live', sponsors.filter(p => p.status === 'published').length], ['Opportunities live', opps.filter(o => o.status === 'published').length],
            ['Waiting for approval', pending.length], ['Enquiries (30 days)', enquiries.filter(e => e.createdAt > since).length], ['Replies (30 days)', enquiries.reduce((n, e) => n + e.messages.filter(m => m.at > since).length, 0) - enquiries.filter(e => e.createdAt > since).length],
            ['New leads', newLeads.length], ['Leads (30 days)', leads.filter(l => l.createdAt > since).length], ['Leads won', leads.filter(l => l.status === 'won').length],
            ['Open reports', openReports.length], ['Saved events', users.reduce((n, u) => n + u.saved.length, 0)], ['Events in the guide', events.length],
          ].map(([l, n]) => <div key={l as string}><b>{n}</b><span>{l}</span></div>)}
        </div>
      )}
    </div>
  );
}
