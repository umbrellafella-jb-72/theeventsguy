import type { MetadataRoute } from 'next';
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://theeventsguy.co.uk').replace(/\/$/, '');
// Until launch (SITE_PUBLIC=true) the site is password-gated and tells crawlers to stay out.
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_PUBLIC !== 'true') return { rules: [{ userAgent: '*', disallow: '/' }] };
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/account', '/shortlist', '/restore', '/admin', '/portal', '/welcome'] }], sitemap: `${SITE}/sitemap.xml` };
}
