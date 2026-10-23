import Guide from '@/components/Guide';
import { getAccess } from '@/lib/access';
import { currentMonthKey, eventsIn, events, monthSummaries, taxonomy, todayKey } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'The guide — The Events Guy' };

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ month?: string; welcome?: string; restored?: string }> }) {
  const sp = await searchParams;
  const access = await getAccess();
  const summaries = monthSummaries();
  const preview = currentMonthKey();
  // Only subscribers' pages carry the full dataset; everyone else gets this month's events alone.
  const visible = access.paid ? events : eventsIn(preview);
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
        priceLabel={process.env.NEXT_PUBLIC_PRICE_LABEL || 'monthly'}
      />
    </>
  );
}
