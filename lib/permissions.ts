// Users and permissions. One login per person; an account can hold several roles
// (an organiser who also speaks). A free account is enough for a portal profile —
// paid membership is separate and unlocks the full guide, calendar sync and reminders.

export type Role = 'registered' | 'organiser' | 'sponsor' | 'speaker' | 'admin';

export const ROLES: { key: Role | 'visitor'; label: string; can: string; selfServe: boolean }[] = [
  { key: 'visitor', label: 'Visitor', can: 'View public speaker profiles and summary sponsorship opportunities. Cannot see contact routes or budgets.', selfServe: false },
  { key: 'registered', label: 'Registered user', can: 'Create and manage their own profile, and save searches and shortlists.', selfServe: false },
  { key: 'organiser', label: 'Organiser', can: 'Post sponsorship opportunities, search sponsors and speakers, send enquiries.', selfServe: true },
  { key: 'sponsor', label: 'Sponsor', can: 'Publish a sponsor profile, search opportunities, send enquiries.', selfServe: true },
  { key: 'speaker', label: 'Speaker', can: 'Publish a speaker profile, receive and answer enquiries.', selfServe: true },
  { key: 'admin', label: 'Admin', can: 'Approve, edit, hide and remove content, manage users and reports, view reporting.', selfServe: false },
];

export type Permission =
  | 'profile.own' | 'shortlist.save' | 'search.save'
  | 'opportunity.post' | 'opportunity.search' | 'opportunity.seeDetails'
  | 'directory.sponsors' | 'directory.speakers'
  | 'speakerProfile.publish' | 'sponsorProfile.publish'
  | 'enquiry.send' | 'enquiry.receive'
  | 'content.moderate' | 'users.manage' | 'reports.manage' | 'reporting.view';

const GRANTS: Record<Role, Permission[]> = {
  registered: ['profile.own', 'shortlist.save', 'search.save'],
  organiser: ['opportunity.post', 'directory.sponsors', 'directory.speakers', 'enquiry.send', 'enquiry.receive', 'opportunity.seeDetails'],
  sponsor: ['sponsorProfile.publish', 'opportunity.search', 'opportunity.seeDetails', 'enquiry.send', 'enquiry.receive'],
  speaker: ['speakerProfile.publish', 'enquiry.receive'],
  admin: ['content.moderate', 'users.manage', 'reports.manage', 'reporting.view', 'opportunity.seeDetails', 'directory.sponsors', 'directory.speakers', 'opportunity.search'],
};

export type Who = { roles: Role[]; status?: 'active' | 'suspended' } | null | undefined;

/** Does this person (null = visitor) have the permission? Suspended accounts can do nothing. */
export function can(who: Who, p: Permission): boolean {
  if (!who || who.status === 'suspended') return false;
  return who.roles.some(r => GRANTS[r]?.includes(p));
}

export const roleLabel = (r: Role) => ROLES.find(x => x.key === r)?.label ?? r;
