import type { MetadataRoute } from 'next';

// Lets people add The Events Guy to their phone's home screen as an app, with the triskele icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Events Guy',
    short_name: 'Events Guy',
    description: 'UK & European ecommerce events, month by month.',
    start_url: '/guide',
    scope: '/',
    display: 'standalone',
    background_color: '#edeeea',
    theme_color: '#17262b',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
