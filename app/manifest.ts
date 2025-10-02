import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VAI-Liq',
    short_name: 'VAI-Liq',
    description: 'Finanzplanung und Liquiditätsmanagement',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0B0B0B',
    theme_color: '#CEFF65',
    icons: [
      { src: '/assets/vaios-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
    ]
  };
}


