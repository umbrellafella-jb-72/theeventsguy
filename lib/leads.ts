// Every public form submission is saved as a lead before anything is emailed, so nothing is lost
// if an email fails. Admins work them in /admin?tab=leads (status, notes, CSV export).
import { addTo, allIn, getJSON, newId, setJSON } from './store';

export type LeadForm = 'services' | 'sponsors' | 'awards';
export type LeadStatus = 'new' | 'contacted' | 'won' | 'lost';
export type Lead = {
  id: string; form: LeadForm; status: LeadStatus;
  name: string; email: string; company: string | null; interest: string | null;
  message: string | null;          // what they wrote
  details: Record<string, string>; // form-specific extras (quiz answers, shortlist…)
  page: string | null;             // where they sent it from
  marketing: boolean;              // ticked the roundup box
  notes: string; createdAt: string; updatedAt: string;
  emailed: boolean;                // the alert to you went out
};

export const LEAD_STATUSES: { key: LeadStatus; label: string }[] = [
  { key: 'new', label: 'New' }, { key: 'contacted', label: 'Contacted' }, { key: 'won', label: 'Won' }, { key: 'lost', label: 'Lost' },
];
export const FORM_LABELS: Record<LeadForm, string> = { services: 'Services', sponsors: 'Sponsors', awards: 'Awards finder' };

const key = (id: string) => `lead:${id}`;
export const getLead = (id: string) => getJSON<Lead>(key(id));
export async function createLead(l: Omit<Lead, 'id' | 'status' | 'notes' | 'createdAt' | 'updatedAt' | 'emailed'>): Promise<Lead> {
  const now = new Date().toISOString();
  const lead: Lead = { ...l, id: newId('lead'), status: 'new', notes: '', createdAt: now, updatedAt: now, emailed: false };
  await setJSON(key(lead.id), lead); await addTo('leads', lead.id);
  return lead;
}
export async function updateLead(id: string, patch: Partial<Pick<Lead, 'status' | 'notes' | 'emailed'>>) {
  const l = await getLead(id); if (!l) return null;
  const next = { ...l, ...patch, updatedAt: new Date().toISOString() }; await setJSON(key(id), next); return next;
}
export const allLeads = async () => (await allIn<Lead>('leads', key)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
