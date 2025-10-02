import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'vaios Dashboard',
    short_name: 'vaios Dashboard',
    description: 'Finanzplanung und Liquiditätsmanagement',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0B0B0B',
    theme_color: '#CEFF65',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
    ]
  };
}


