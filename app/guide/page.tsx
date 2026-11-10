import Guide from '@/components/Guide';
import { getAccess } from '@/lib/access';
import { sessionUser } from '@/lib/users';
import { currentMonthKey, events, eventsFor, monthSummaries, speakersByEvent, taxonomy, todayKey } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'The guide — The Events Guy' };

export default async function GuidePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const access = await getAccess();
  const user = await sessionUser();
  // Filters from the address (saved searches and shared links): f_<group>=a|b
  const initialSel: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(sp)) if (k.startsWith('f_') && v) initialSel[k.slice(2)] = v.split('|');
  const summaries = monthSummaries();
  const preview = currentMonthKey();
  // Members get every event in full. Everyone else gets the public teaser of each event, plus
  // the free month's and featured events in full. Locked details never reach the browser.
  const visible = eventsFor(access.paid, preview);
  const wanted = sp.month && summaries.some(s => s.key === sp.month) ? sp.month : null;
  const initialMonth = wanted ?? (access.paid ? 'all' : preview);

  return (
    <>
      <div className="wrap guide-top">
        <h1>Ecommerce events, month by month</h1>
        <p className="muted" style={{ margin: '8px 0 0' }}>
          {events.length} events and awards across the UK, Ireland and Europe — tagged by area, format, topic, country and price so you can find the ones worth your time.
        </p>
        {sp.welcome && <p className="note banner">You’re in. Every month is now unlocked — welcome to The Events Guy.</p>}
        {sp.restored && <p className="note banner">Access restored on this device.</p>}
        {sp.savedSearch && <p className="note banner">Search saved. Find it any time in <a href="/account#searches">your account</a>.</p>}
      </div>
      <Guide
        events={visible}
        summaries={summaries}
        taxonomy={taxonomy}
        paid={access.paid}
        previewMonth={preview}
        initialMonth={initialMonth}
        today={todayKey()}
        paymentsReady={access.paymentsReady}
        speakers={speakersByEvent()}
        priceLabel={process.env.NEXT_PUBLIC_PRICE_LABEL || 'monthly'}
        canSave={Boolean(user) || access.paid}
        signedIn={Boolean(user)}
        initial={{ q: sp.q, from: sp.from, to: sp.to, past: sp.past === '1', sel: initialSel }}
      />
    </>
  );
}
