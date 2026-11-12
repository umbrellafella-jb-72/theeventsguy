import { sessionUser } from '@/lib/users';
import { can } from '@/lib/permissions';
import { allLeads, FORM_LABELS, type LeadForm } from '@/lib/leads';
import { getSubscriber } from '@/lib/marketing';
import { members } from '@/lib/store';

// CSV exports for admins: leads (optionally filtered) and opted-in roundup subscribers.
// Cells that start with = + - @ are prefixed so spreadsheets don't run them as formulas.
const cell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows: unknown[][]) => rows.map(r => r.map(cell).join(',')).join('\r\n');

export async function GET(req: Request) {
  const u = await sessionUser();
  if (!can(u, 'leads.manage')) return new Response('Not allowed', { status: 403 });
  const q = new URL(req.url).searchParams;
  const day = new Date().toISOString().slice(0, 10);
  let body: string, name: string;
  if (q.get('what') === 'subscribers') {
    const subs = (await Promise.all((await members('subscribers')).map(getSubscriber))).filter(s => s?.subscribed);
    body = csv([['email', 'consented_at', 'source'], ...subs.map(s => [s!.email, s!.consentAt, s!.source])]);
    name = `roundup-subscribers-${day}.csv`;
  } else {
    const form = q.get('form') as LeadForm | null, status = q.get('status');
    const leads = (await allLeads()).filter(l => (!form || l.form === form) && (!status || l.status === status));
    body = csv([['created', 'status', 'form', 'name', 'email', 'company', 'interest', 'message', 'quiz', 'shortlist', 'roundup_opt_in', 'notes', 'page'],
      ...leads.map(l => [l.createdAt, l.status, FORM_LABELS[l.form], l.name, l.email, l.company, l.interest, l.message, l.details.quiz, l.details.shortlist, l.marketing ? 'yes' : 'no', l.notes, l.page])]);
    name = `leads-${day}.csv`;
  }
  return new Response(`﻿${body}`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-store' } });
}
