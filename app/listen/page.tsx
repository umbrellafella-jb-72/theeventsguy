import MediaDirectory from '@/components/MediaDirectory';
import { getAccess } from '@/lib/access';
import { media, taxonomy } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Webinars & podcasts — The Events Guy' };

const FREE_PREVIEW = 3;

export default async function Listen() {
  const access = await getAccess();
  // Free visitors' pages carry only the first few listings.
  const items = access.paid ? media : media.slice(0, FREE_PREVIEW);
  return (
    <div className="wrap" style={{ paddingBottom: 24 }}>
      <div className="guide-top">
        <h1>Webinars & podcasts</h1>
        <p className="muted" style={{ margin: '8px 0 0' }}>The ecommerce shows and online sessions worth plugging into between events — {media.length} picks, from UK founder podcasts to platform launch days.</p>
      </div>
      <MediaDirectory items={items} total={media.length} types={taxonomy.mediaTypes} paid={access.paid}
        paymentsReady={access.paymentsReady} priceLabel={process.env.NEXT_PUBLIC_PRICE_LABEL || 'monthly'} />
    </div>
  );
}
