import type { MetadataRoute } from 'next';
import { events, generatedAt } from '@/lib/data';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theeventsguy.co.uk').replace(/\/$/, '');

// Every event page is public, so search engines can find each one.
export default function sitemap(): MetadataRoute.Sitemap {
  const at = new Date(generatedAt);
  const pages = ['', '/guide', '/awards', '/speakers', '/listen', '/services', '/sponsors'].map(p => ({ url: `${SITE}${p}`, lastModified: at, changeFrequency: 'weekly' as const, priority: p ? 0.7 : 1 }));
  return [...pages, ...events.map(e => ({ url: `${SITE}/events/${e.id}`, lastModified: at, changeFrequency: 'monthly' as const, priority: e.featured ? 0.8 : 0.5 }))];
}
