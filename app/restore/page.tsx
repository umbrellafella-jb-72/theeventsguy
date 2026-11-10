import { redirect } from 'next/navigation';
// The old "sign in on this device" page is now the one login.
export default function Restore() { redirect('/login'); }
