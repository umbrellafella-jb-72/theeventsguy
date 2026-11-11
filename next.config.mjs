// Security headers on every response. The Content-Security-Policy is deliberately limited to
// rules that can't break the site: no framing by other sites (clickjacking), no plugins, and
// forms may only post here or on to Stripe's checkout and billing pages.
const csp = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  'upgrade-insecure-requests',
].join('; ');

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        // Keep search engines out until launch (SITE_PUBLIC=true).
        ...(process.env.SITE_PUBLIC === 'true' ? [] : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
      ],
    }];
  },
};
