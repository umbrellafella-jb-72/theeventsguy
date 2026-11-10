import { redirect } from 'next/navigation';
import { can, type Permission } from './permissions';
import { getUser, sessionUser, type User } from './users';
import { storeReady } from './store';

/** The signed-in account (or redirect to sign in). With `as`, an admin can act on another account. */
export async function pageUser(next: string, as?: string): Promise<{ me: User; t: User }> {
  if (!storeReady()) redirect('/login?off=1');
  const me = await sessionUser();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (as && as !== me.id && can(me, 'content.moderate')) { const t = await getUser(as); if (t) return { me, t }; }
  return { me, t: me };
}
export async function needPermission(next: string, p: Permission) {
  const { me } = await pageUser(next);
  if (!can(me, p)) redirect(`/account?need=${p}`);
  return me;
}
